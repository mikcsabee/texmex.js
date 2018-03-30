import * as http from 'http'
import { AuthenticationInterface } from './authentication.interface'

/**
 * Default authentication interface implementation.
 * Accepts every request.
 */
export class NoAuthentication implements AuthenticationInterface {
  public hasAccess(req: http.IncomingMessage, controller: any): boolean {
    return true
  }
}
