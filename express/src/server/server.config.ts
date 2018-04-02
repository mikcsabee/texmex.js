import { AuthenticationInterface, Injectable, Injector, LoggerInterface } from '@texmex.js/core'
import { NoAuthentication } from '@texmex.js/core/lib/authentication/no.authentication'
import registry from '@texmex.js/core/lib/components/registry'
import { ConsoleLogger } from '@texmex.js/core/lib/logger/console.logger'

/**
 * ServerConfiguration class
 */
export class ServerConfig {
  /**
   * Fill the configuration with default values.
   * @param config Initial configuration
   */
  public static initConfig(config?: ServerConfig): ServerConfig {
    config = config ? config : {}

    config.port = config.port ? config.port : 3000
    config.default401 = config.default401 ? config.default401 : ''
    config.default404 = config.default404 ? config.default404 : ''
    config.default500 = config.default500 ? config.default500 : ''

    const map: Map<string, any> = registry.getMap(registry.INJECTABLE)
    if (map.has(Injector.LOGGER) === false) {
      Injectable(Injector.LOGGER)(ConsoleLogger)
    }
    if (map.has(Injector.AUTHENTICATION) === false) {
      Injectable(Injector.AUTHENTICATION)(NoAuthentication)
    }

    return config
  }

  /**
   * port to listen
   */
  public port?: number

  /**
   * default reponse for `UnAuthorized`
   */
  public default401?: any

  /**
   * default reponse for `Not Found`
   */
  public default404?: any

  /**
   * default reponse for `Internal Server Error`
   */
  public default500?: any
}
