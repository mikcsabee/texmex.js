import { Injectable, Injector, LoggerInterface } from '@texmex.js/core'
import { NoAuthentication } from '@texmex.js/core/lib/authentication/no.authentication'
import registry from '@texmex.js/core/lib/components/registry'
import { ConsoleLogger } from '@texmex.js/core/lib/logger/console.logger'
import * as express from 'express'
import * as http from 'http'
import { requestHandler } from './request.handler'
import { ServerConfig } from './server.config'

/**
 * Entry point, an ExpressJS wrapper
 */
export class ExpressHandler {
  /**
   * @private The ExpressJS App
   */
  private app: express.Application

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
  }

  /**
   * Start the app
   */
  public async start() {
    await this.injector.initDone()

    this.app.listen(this.config.port, () =>
      this.injector.getComponent(Injector.LOGGER).info('Server started on port: ' + this.config.port)
    )
  }
}
