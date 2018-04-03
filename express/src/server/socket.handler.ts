import { Injector, LoggerInterface } from '@texmex.js/core'
import * as http from 'http'
import * as net from 'net'
import { RouteTree } from '../route/route.tree'
import { safeInvoke } from '../utils/safe.invoke'

/**
 * Handle an upgrade
 * @param routeTree The registered routed
 * @param injector The `@Injectabel` Components
 * @param req The Node HTTP request
 * @param socket The `ws.WebSocket`
 */
export function socketHandler(routeTree: RouteTree, injector: Injector, req: http.IncomingMessage, socket): void|Promise<void> {
  const websocketClass = routeTree.getControllerClass(req.url)
  if (websocketClass) {
    return handleSocket(routeTree, injector, req, socket, websocketClass)
            .catch(() => closeSocket(socket))
  } else {
    closeSocket(socket)
  }
}

/**
 * Handle a resolved `@Websocket` class
 * @param routeTree The registered routed
 * @param injector The `@Injectabel` Components
 * @param req The Node HTTP request
 * @param socket The `ws.WebSocket`
 * @param websocketClass The Resolved Websocket class
 */
async function handleSocket(routeTree: RouteTree, injector: Injector,  req: http.IncomingMessage, socket, websocketClass: any): Promise<void> {
  const authentication = injector.getComponent(Injector.AUTHENTICATION)
  const logger = injector.getComponent(Injector.LOGGER)
  const accessResult = await safeInvoke(() => authentication.hasAccess(req, websocketClass), logger)
  if (accessResult) {
    const controller = await safeInvoke(() => new websocketClass(req, (msg) => socket.send(msg), accessResult), logger)
    handleEvents(logger, req, socket, controller)
    return
  }
  throw new Error()
}

/**
 * Handle websocket events
 * @param logger The server logger
 * @param req The Node HTTP request
 * @param socket The `ws.WebSocket`
 * @param websocket The `@Websocket` instance
 */
function handleEvents(logger: LoggerInterface, req: http.IncomingMessage, socket: net.Socket, websocket: any): void {
  if (typeof websocket.onOpen === 'function') {
    socket.on('open', () => safeInvoke(() => websocket.onOpen(), logger)
                                .catch(() => closeSocket(socket)))
  }
  if (typeof websocket.onMessage === 'function') {
    socket.on('message', (msg) => safeInvoke(() => websocket.onMessage(msg), logger)
                                      .catch(() => closeSocket(socket)))
  }
  if (typeof websocket.onError === 'function') {
    socket.on('error', (e) => {
      safeInvoke(() => websocket.onError(e), logger)
        .then(() => closeSocket(socket))
        .catch(() => closeSocket(socket))
    })
  }
  if (typeof websocket.onClose === 'function') {
    socket.on('close', () => {
      safeInvoke(() => websocket.onClose(), logger)
        .then(() => closeSocket(socket))
        .catch(() => closeSocket(socket))
    })
  }
}

/**
 * Close a socket
 * @param socket The `ws.WebSocket`
 */
function closeSocket(socket): void {
  try {
    socket.terminate()
  } catch (e) {} // Do nothing (socket is already closed)
}
