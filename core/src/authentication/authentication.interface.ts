import * as http from 'http'

/**
 * The interface definition of the Authentication which is invoked at before
 * `@Controller` creation.<br/>
 * Example implementation:
 * <pre>
 * &commat;Injectable('authentication')
 * export class MyAuthenticationService implements AuthenticationInterface {
 *   public hasAccess(req: http.IncomingMessage, controller: any) {
 *     return true
 *   }
 * }
 * </pre>
 * If no there is `authentication Injectable` added, the default authentication
 * will be the `NoAuthentication`, which will accepts every request.
 */
export interface AuthenticationInterface {
  /**
   * The role of this method is to decide that a that the request has access to
   * the controller or not.
   * @param req: http.IncomingMessage The http request
   * @param controller Controller prototype
   * @returns The result will be the third argument for the Controller
   * contructor if not falsy.
   */
  hasAccess(req: http.IncomingMessage, controller: any): any|Promise<any>
}
