import { Injector, LoggerInterface } from '@texmex.js/core'
import * as crypto from 'crypto'
import * as http from 'http'
import * as net from 'net'
import * as ws from 'ws'
import { RouteTree } from '../route/route.tree'
import { safeInvoke } from '../utils/safe.invoke'

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const BUFFER = 'nodebuffer'
const MAX_PAYLOAD = 100 * 1024 * 1024
const EMPTY_BUFFER = Buffer.alloc(0)

/**
 * Handle an upgrade
 * @param routeTree The registered routed
 * @param injector The `@Injectabel` Components
 * @param req The Node HTTP request
 * @param socket: The net.Socket
 * @param head: Buffer
 */
export function socketHandler(routeTree: RouteTree, injector: Injector, req: http.IncomingMessage, socket: net.Socket, head: Buffer): void|Promise<void> {
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
 * @param socket The net.Socket
 * @param websocketClass The Resolved Websocket class
 */
async function handleSocket(routeTree: RouteTree, injector: Injector,  req: http.IncomingMessage, socket: net.Socket, websocketClass: any): Promise<void> {
  const authentication = injector.getComponent(Injector.AUTHENTICATION)
  const logger = injector.getComponent(Injector.LOGGER)
  const accessResult = await safeInvoke(() => authentication.hasAccess(req, websocketClass), logger)
  if (accessResult) {
    const sender = new ws.Sender(socket)
    const controller = await safeInvoke(() => new websocketClass(req, (msg) => sendMessage(sender, msg), accessResult), logger)
    handleEvents(injector, req, socket, controller)
    return
  }
  throw new Error()
}

/**
 * Handle websocket events
 * @param injector The `@Injectabel` Components
 * @param req The Node HTTP request
 * @param socket The net.Socket
 * @param websocket The `@Websocket` instance
 */
function handleEvents(injector: Injector, req: http.IncomingMessage, socket: net.Socket, websocket: any): void {
  const logger = injector.getComponent(Injector.LOGGER)
  const receiver = new ws.Receiver(BUFFER, {}, MAX_PAYLOAD)

  injector.inject(websocket)

  const key = crypto
    .createHash('sha1')
    .update(req.headers['sec-websocket-key'] + GUID, 'utf8')
    .digest('base64')

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${key}`
  ]

  socket.write(headers.concat('\r\n').join('\r\n'))

  if (typeof websocket.onClose === 'function') {
    socket.on('close', () => close(websocket, socket, logger))
    socket.on('end',   () => close(websocket, socket, logger))
  }
  if (typeof websocket.onMessage === 'function') {
    receiver.on('message', (msg) => message(msg, websocket, socket, logger))
    socket.on('data', (data) => receiver.write(data))
  }

  socket.on('error', (e) => error(e, websocket, socket, logger))
  receiver.on('error', (e) => error(e, websocket, socket, logger))

  socket.setTimeout(0)
  socket.setNoDelay()
  if (typeof websocket.onOpen === 'function') {
    safeInvoke(() => websocket.onOpen(), logger)
      .catch(() => close(websocket, socket, logger))
  }
}

/**
 * Invoke the onMessage method on the websocket with a message
 * @param msg The message
 * @param websocket The `@Websocket` instance
 * @param socket The net.Socket
 * @param logger The Server logger
 */
function message(msg: any, websocket: any, socket: net.Socket, logger: LoggerInterface) {
  return safeInvoke(() => websocket.onMessage(msg), logger)
              .catch(() => closeSocket(socket))
}

/**
 * Invoke the onClose method on the websocket
 * @param websocket The `@Websocket` instance
 * @param socket The net.Socket
 * @param logger The Server logger
 */
function close(websocket: any, socket: net.Socket, logger: LoggerInterface): Promise<void> {
  return closeAfterPromise(socket, safeInvoke(() => websocket.onClose(), logger))
}

/**
 * Invoke the onError method on the websocket
 * @param websocket The `@Websocket` instance
 * @param socket The net.Socket
 * @param logger The Server logger
 */
function error(e: Error, websocket: any, socket: net.Socket, logger: LoggerInterface): void|Promise<void> {
  if (typeof websocket.onError === 'function') {
    return closeAfterPromise(socket, safeInvoke(() => websocket.onError(e), logger))
  } else {
    logger.exception(e)
    closeSocket(socket)
  }
}

/**
 * Send a message to the socket with the Sender
 * @param sender The `ws.Sender`
 * @param msg The message
 */
function sendMessage(sender, msg: any): void {
  const options = {
    binary: typeof msg !== 'string',
    compress: false,
    fin: true,
    mask: false
  }
  sender.send(msg || EMPTY_BUFFER, options)
}

/**
 * Close the socket after a promise
 * @param socket: The socket tho close
 * @param promise: The promise
 */
function closeAfterPromise(socket: net.Socket, promise: Promise<void>): Promise<void> {
  return promise
    .then(() => closeSocket(socket))
    .catch(() => closeSocket(socket))
}

/**
 * Close a socket
 * @param socket: The socket
 */
function closeSocket(socket: net.Socket): void {
  try {
    socket.removeAllListeners()
    socket.destroy()
  } catch (e) {} // Do nothing (socket is already closed)
}
