// tslint:disable:no-console
import { LoggerInterface } from './logger.interface'

/**
 * Default implementation of the LoggerInterface.
 * Logs everything to the console.
 */
export class ConsoleLogger implements LoggerInterface {
  public info(message: any) { console.log(message) }
  public warn(message: any) { console.warn(message) }
  public error(message: any) { console.error(message) }
  public exception(exception: any) { console.error(exception) }
}
