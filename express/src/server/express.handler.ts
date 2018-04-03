import { Injectable, Injector, LoggerInterface } from '@texmex.js/core'
import { NoAuthentication } from '@texmex.js/core/lib/authentication/no.authentication'
import registry from '@texmex.js/core/lib/components/registry'
import { ConsoleLogger } from '@texmex.js/core/lib/logger/console.logger'
import * as express from 'express'
import * as http from 'http'
import * as url from 'url'
import * as ws from 'ws'
import { RouteTree } from '../route/route.tree'
import { requestHandler } from './request.handler'
import { ServerConfig } from './server.config'
import { socketHandler } from './socket.handler'

/**
 * Entry point, an ExpressJS wrapper
 */
export class ExpressHandler {
  /**
   * @private The ExpressJS App
   */
  private app: express.Application

  /**
   * @private The Node HTTP.Server
   */
  private server: http.Server

  /**
   * @private The Server Configuration
   */
  private config: ServerConfig

  /**
   * @private Component Injector
   */
  private injector: Injector

  /**
   * @param app An ExpressJS app
   * @param config Initial configuration
   */
  constructor(app: express.Application|null|undefined, config?: ServerConfig) {
    if (!app) {
      this.app = express()
    } else {
      this.app = app
    }
    this.config = ServerConfig.initConfig(config)
    this.injector = new Injector()

    registry
      .getMap(registry.CONTROLLER)
      .forEach((controllerClass, path) =>
      this.app.all(path, (req: http.IncomingMessage, res: http.ServerResponse) =>
        requestHandler(req, res, controllerClass, path, this.injector, this.config)
      )
    )
    if (!app) {
      this.app.use((req, res) => {
        res.status(404)
        res.send(this.config.default404)
      })
    }
    this.server = http.createServer(this.app)

    const webSocketMap: Map<string, any> = registry.getMap(registry.WEBSOCKET)
    if (webSocketMap.size > 0) {
      const websockets = new RouteTree(webSocketMap)
      const webSocketServer = new ws.Server({ server: this.server })
      webSocketServer.on('connection', (socket, req) =>
        socketHandler(websockets, this.injector, req, socket)
      )
    }
  }

  /**
   * Start the app
   */
  public async start() {
    await this.injector.initDone()

    this.server.listen(this.config.port, () =>
      this.injector.getComponent(Injector.LOGGER).info('Server started on port: ' + this.config.port)
    )
  }
}
