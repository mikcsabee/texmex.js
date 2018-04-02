import { Injector } from '@texmex.js/core'
import * as express from 'express'
import * as http from 'http'
import { safeInvoke } from '../utils/safe.invoke'
import { ServerConfig } from './server.config'

/**
 * Handle a request
 * @param req The Node HTTP request
 * @param res The Node HTTP response
 * @param controllerClass the resolved Controller class
 * @param path the path from `@Controller(path)`
 * @param injector The `@Injectabel` Components
 */
export function requestHandler(req: http.IncomingMessage, res: http.ServerResponse, controllerClass: any, path: string, injector: Injector, config: ServerConfig): void {
  handleController(req, res, controllerClass, path, injector, config)
    .catch(() => handleException(config.default500, res))
}

/**
 * Handle a Controller class asynchronous
 * @param req The Node HTTP request
 * @param res The Node HTTP response
 * @param controllerClass the resolved Controller class
 * @param path the path from `@Controller(path)`
 * @param injector The `@Injectabel` Components
 * @param config The serverConfiguration
 */
async function handleController(req: http.IncomingMessage, res: http.ServerResponse, controllerClass: any, path: string, injector: Injector, config: ServerConfig): Promise<void> {
  const logger = injector.getComponent(Injector.LOGGER)
  const authentication = injector.getComponent(Injector.AUTHENTICATION)
  const accessResult = await safeInvoke(() => authentication.hasAccess(req, controllerClass), logger)
  if (accessResult) {
    const controller = new controllerClass(req, res)
    const fn = getFunction(req.method, controller)
    if (fn) {
      injector.inject(controller)
      const params: string[] = getParameters(path, req.url)
      const result = await safeInvoke(() => fn.apply(controller, params), logger)
      handleResult(result, config.default404, res)
    } else {
      handleResult(undefined, config.default404, res)
    }
  } else {
    handleUnAuthorized(config.default401, res)
  }
}

/**
 * Write the response to the node response
 * @param result The result of the request
 * @param default404 the default response if the result is undefined
 * @param res The Node HTTP response
 */
function handleResult(result: any, default404: string, res: http.ServerResponse): void {
  if (result === null) {}
  else if (result === undefined) {
    res.statusCode = 404
    res.write(default404)
  }
  else {
    if (typeof result === 'object') {
      res.setHeader('Content-Type', 'application/json')
      res.write(result)
    } else if (result === '') {
      res.statusCode = 204
    } else {
      res.write(result)
    }
  }
  res.end()
}

/**
 * Write the statusCode 401 to the node response.
 * @param default401 the default response for `UnAuthorized`
 * @param res The Node HTTP response
 */
function handleUnAuthorized(default401: string, res: http.ServerResponse): void {
  res.statusCode = 401
  res.write(default401)
  res.end()
}

/**
 * Write the statusCode 500 to the node response.
 * @param default500 the default reponse for `Internal Server Error`
 * @param res The Node HTTP response
 */
function handleException(default500: string, res: http.ServerResponse): void {
  res.statusCode = 500
  res.write(default500)
  res.end()
}

/**
 * Resolve an http method to controller function.
 * @param default500 the default reponse for `Internal Server Error`
 * @param res The Node HTTP response
 */
function getFunction(method: string, controller: any): () => any|undefined {
  if (method === 'GET' && typeof controller.get === 'function') {
    return controller.get
  }
  if (method === 'POST' && typeof controller.post === 'function') {
    return controller.post
  }
  if (method === 'PUT' && typeof controller.put === 'function') {
    return controller.put
  }
  if (method === 'DELETE' && typeof controller.delete === 'function') {
    return controller.delete
  }
  if (method === 'OPTIONS') {
    if (typeof controller.options === 'function') {
      return controller.options
    }
    return () => ''
  }
  return undefined
}

function getParameters(path: string, url: string): string[] {
  const result: string[] = []
  const pathSegments: string[] = path.split('?')[0].split('/').filter(String)
  const urlSegments: string[] = url.split('?')[0].split('/').filter(String)
  pathSegments.forEach((segment, index) => {
    if (segment.charAt(0) === ':' && index < urlSegments.length) {
      result.push(urlSegments[index])
    }
  })
  return result
}
