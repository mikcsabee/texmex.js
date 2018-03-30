import { Injector, LoggerInterface } from '@texmex.js/core'
import registry from '@texmex.js/core/lib/components/registry'
import * as http from 'http'
import { RouteTree } from '../route/route.tree'
import { requestHandler } from './request.handler'
import { ServerConfig } from './server.config'
import { socketHandler } from './socket.handler'

/**
 * Entry point, a Node http.Server wrapper
 */
export class Server {
  /**
   * @private The Node HTTP.Server
   */
  private server: http.Server

  /**
   * @private The Server Configuration
   */
  private config: ServerConfig

  /**
   * @private registered `@Controller` URLs
   */
  private controllers: RouteTree

  /**
   * @private registered `@Websocket` URLs
   */
  private websockets: RouteTree

  /**
   * @param config Initial configuration
   */
  constructor(config?: ServerConfig) {
    this.config = ServerConfig.initConfig(config)
    this.controllers = new RouteTree(registry.getMap(registry.CONTROLLER))
    this.websockets = new RouteTree(registry.getMap(registry.WEBSOCKET))
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    const injector: Injector = new Injector()
    await injector.initDone()

    this.server = http.createServer()
    this.server.on('request', (req, res) => requestHandler(this.controllers, this.config, injector, req, res))
    this.server.on('upgrade', (req, socket, head) => socketHandler(this.websockets, injector, req, socket, head))
    this.server.listen(this.config.port)

    injector.getComponent(Injector.LOGGER).info('Server started on port: ' + this.config.port)
  }
}
