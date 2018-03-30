import { Injector, LoggerInterface } from '@texmex.js/core'
import * as fs from 'fs'
import * as http from 'http'
import * as mime from 'mime/lite'
import * as net from 'net'
import * as path from 'path'
import { RouteTree } from '../route/route.tree'
import { StaticPath } from '../route/static.path'
import { safeInvoke } from '../utils/safe.invoke'
import { ServerConfig } from './server.config'

/**
 * Handle a request
 * @param routeTree The registered routed
 * @param config The serverConfiguration
 * @param injector The `@Injectabel` Components
 * @param req The Node HTTP request
 * @param res The Node HTTP response
 */
export function requestHandler(routeTree: RouteTree, config: ServerConfig, injector: Injector, req: http.IncomingMessage, res: http.ServerResponse): Promise<void>|void {
  const controllerClass = routeTree.getControllerClass(req.url)
  if (controllerClass) {
    return handleController(routeTree, config, injector, req, res, controllerClass)
            .catch(() => handleException(config.default500, res))
  } else {
    if (req.method === 'GET') {
      return tryStatic(req, res, config)
    } else {
      handleResult(undefined, config.default404, res)
    }
  }
}

/**
 * Handle a resolved Controller class
 * @param routeTree The registered routed
 * @param config The serverConfiguration
 * @param injector The `@Injectabel` Components
 * @param req The Node HTTP request
 * @param res The Node HTTP response
 * @param controllerClass the resolved Controller class
 */
async function handleController(routeTree: RouteTree, config: ServerConfig, injector: Injector,  req: http.IncomingMessage, res: http.ServerResponse, controllerClass: any): Promise<void> {
  const logger = injector.getComponent(Injector.LOGGER)
  const authentication = injector.getComponent(Injector.AUTHENTICATION)
  const accessResult = await safeInvoke(() => authentication.hasAccess(req, controllerClass), logger)
  if (accessResult) {
    const controller = await safeInvoke(() => new controllerClass(req, res, accessResult), logger)
    const fn = getFunction(req.method, controller)
    if (fn) {
      injector.inject(controller)
      const params: string[] = routeTree.getParameters(req.url)
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

/**
 * Try to locate a static file
 * @param req The Node HTTP request
 * @param res The Node HTTP response
 * @param config The ServerConfig
 * @returns void Promise, the response handled inside the method
 */
function tryStatic(req: http.IncomingMessage, res: http.ServerResponse, config: ServerConfig): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const promises: Array<Promise<ReadContent>> = []

    config.staticPaths.forEach((sp) => promises.push(readFile(req.url, sp)))

    const results: ReadContent[] = await Promise.all(promises)
    const result: ReadContent|undefined = results.find((r) => r.success === true)

    if (result && result.content && result.file) {
      res.statusCode = 200
      res.setHeader('Content-Type', mime.getType(result.file))
      res.write(result.content)
      res.end()
    } else {
      handleResult(undefined, config.default404, res)
    }
    resolve()
  })
}

/**
 * Read a file
 * @param url requst URL
 * @param staticPath static path
 * @returns Promise of ReadContent
 */
function readFile(url: string, staticPath: StaticPath): Promise<ReadContent> {
  return new Promise((resolve, reject) => {
    const file = resolvePath(url, staticPath)
    fs.readFile(file, (err, data) => {
      if (err) {
        resolve({success: false})
      } else {
        resolve({
          content: data,
          file,
          success: true
        })
      }
    })
  })
}

/**
 * Represents a file read result
 */
interface ReadContent {
  success: boolean,
  content?: Buffer,
  file?: string
}

/**
 * Map a request URL to the local fileSystem
 * @param url
 * @param staticPath
 */
function resolvePath(url: string, staticPath: StaticPath): string {
  let sp = staticPath.path
  if (staticPath.url.slice(-1) === '/' && staticPath.path.slice(-1) !== '/' && staticPath.path.slice(-1) !== '\\') {
    sp += '/'
  }
  let result: string = url.replace(staticPath.url, sp).replace(new RegExp('/', 'g'), path.sep)
  if (result.slice(-1) === path.sep) {
    result += 'index.html'
  }
  return result
}
