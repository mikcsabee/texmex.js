import { AuthenticationInterface, Inject, Injectable, Injector, WebSocket } from '@texmex.js/core'
import { NoAuthentication } from '@texmex.js/core/lib/authentication/no.authentication'
import registry from '@texmex.js/core/lib/components/registry'
import { expect } from 'chai'
import * as http from 'http'
import { RouteTree } from '../../src/route/route.tree'
import { ServerConfig } from '../../src/server/server.config'
import { socketHandler } from '../../src/server/socket.handler'
import { FakeLogger } from '../test.utils/fake.logger'
import { FakeSocket } from '../test.utils/fake.socket'

class TestSocket {
  public static openInvoked: boolean = false
  public static messageArg: string = undefined
  public static closeInvoked: boolean = false
  public static error: any = undefined
  public static sendMessaage: (message: any) => void

  public static reset() {
    TestSocket.openInvoked = false
    TestSocket.messageArg = undefined
    TestSocket.closeInvoked = false
    TestSocket.error = undefined
  }

  public constructor(req, sendMessage: (message: any) => void) {
    TestSocket.sendMessaage = sendMessage
  }

  public onOpen() { TestSocket.openInvoked = true }
  public onMessage(arg: string) { TestSocket.messageArg = arg }
  public onClose() { TestSocket.closeInvoked = true }
  public onError(e: any) { TestSocket.error = e }
}

describe('socketHandler', () => {
  let req: http.IncomingMessage
  let logger: FakeLogger
  let injector: Injector
  let socket: any
  let head: Buffer
  const websocketMap: Map<string, any> = registry.getMap(registry.WEBSOCKET)

  beforeEach(async () => {
    registry.getMap(registry.INJECTABLE).clear()
    registry.getMap(registry.WEBSOCKET).clear()
    Injectable(Injector.AUTHENTICATION)(NoAuthentication)
    Injectable(Injector.LOGGER)(FakeLogger)

    injector = new Injector()
    await injector.initDone()

    req = new http.IncomingMessage(undefined)
    socket = new FakeSocket()
    head = new Buffer('')
    logger = injector.getComponent(Injector.LOGGER)
    TestSocket.reset()
  })

  it('error logger registered for empty websocket', async () => {
    class C {}
    WebSocket('/')(C)
    req.url = '/'

    await socketHandler(new RouteTree(websocketMap), injector, req, socket, head)

    expect(socket.onArgs.length).equal(1)
    expect(socket.onArgs[0][0]).equal('error')

    await socket.onArgs[0][1]('TestError')

    expect(logger.exceptionLogs[0]).equal('TestError')
    expect(socket.removeAllListenersInvoked).to.be.true
    expect(socket.destroyInvoked).to.be.true
  })

  it('hasAccess throws exception', async () => {
    class C {}
    class A implements AuthenticationInterface {
      public hasAccess(): boolean {
        throw new Error()
      }
    }
    registry.getMap(registry.INJECTABLE).clear()
    Injectable(Injector.AUTHENTICATION)(A)
    Injectable(Injector.LOGGER)(FakeLogger)
    injector = new Injector()
    await injector.initDone()
    logger = injector.getComponent(Injector.LOGGER)

    WebSocket('/')(C)
    req.url = '/'
    expect(logger.exceptionLogs.length).equal(0)

    await socketHandler(new RouteTree(websocketMap), injector, req, socket, head)

    expect(logger.exceptionLogs.length).equal(1)
    expect(socket.removeAllListenersInvoked).to.be.true
    expect(socket.destroyInvoked).to.be.true
  })

  it('Websocket constructor throws exception', async () => {
    class C {
      constructor() { throw Error() }
    }

    WebSocket('/')(C)
    req.url = '/'
    expect(logger.exceptionLogs.length).equal(0)

    await socketHandler(new RouteTree(websocketMap), injector, req, socket, head)

    expect(logger.exceptionLogs.length).equal(1)
    expect(socket.removeAllListenersInvoked).to.be.true
    expect(socket.destroyInvoked).to.be.true
  })

  it('onOpen Invoked', async () => {
    WebSocket('/')(TestSocket)
    req.url = '/'
    await socketHandler(new RouteTree(websocketMap), injector, req, socket, head)
    expect(TestSocket.openInvoked).to.be.true
  })

  it('onOpen throws exception', async () => {
    class C extends TestSocket {
      public onOpen() {
        throw new Error()
      }
    }
    WebSocket('/')(C)
    req.url = '/'
    expect(logger.exceptionLogs.length).equal(0)

    await socketHandler(new RouteTree(websocketMap), injector, req, socket, head)
    expect(logger.exceptionLogs.length).equal(1)
    expect(socket.removeAllListenersInvoked).to.be.true
    expect(socket.destroyInvoked).to.be.true
  })

  it('onMessage Invoked', async () => {
    WebSocket('/')(TestSocket)
    req.url = '/'

    await socketHandler(new RouteTree(websocketMap), injector, req, socket, head)

    const buff = Buffer.from([129, 132, 61, 87, 170, 34, 73, 50, 217, 86])
    await socket.onArgs[2][1](buff)
    expect(TestSocket.messageArg).equal('test')
  })

  it('onMessage invalid data', async () => {
    WebSocket('/')(TestSocket)
    req.url = '/'

    await socketHandler(new RouteTree(websocketMap), injector, req, socket, head)
    await socket.onArgs[2][1]({})

    expect(TestSocket.error).to.not.be.undefined
    expect(socket.removeAllListenersInvoked).to.be.true
    expect(socket.destroyInvoked).to.be.true
  })

  it('onMessage throws exception', async () => {
    class C extends TestSocket {
      public onMessage() {
        throw new Error()
      }
    }
    WebSocket('/')(C)
    req.url = '/'
    expect(logger.exceptionLogs.length).equal(0)

    await socketHandler(new RouteTree(websocketMap), injector, req, socket, head)

    const buff = Buffer.from([129, 132, 61, 87, 170, 34, 73, 50, 217, 86])
    await socket.onArgs[2][1](buff)

    expect(logger.exceptionLogs.length).equal(1)
    expect(socket.removeAllListenersInvoked).to.be.true
    expect(socket.destroyInvoked).to.be.true
  })

  it('sendMessage parse messages', async () => {
    WebSocket('/')(TestSocket)
    req.url = '/'
    await socketHandler(new RouteTree(websocketMap), injector, req, socket, head)
    expect(socket.writeArgs.length).equal(1)

    TestSocket.sendMessaage('Hello World')
    const buff = Buffer.from([129, 11, 72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]).toString()
    expect(socket.writeArgs[1][0].toString()).equal(buff)
  })

  it('sendMessage parse undefined', async () => {
    WebSocket('/')(TestSocket)
    req.url = '/'
    await socketHandler(new RouteTree(websocketMap), injector, req, socket, head)
    expect(socket.writeArgs.length).equal(1)

    TestSocket.sendMessaage(undefined)
    expect(socket.writeArgs[1][0]).to.be.instanceof(Buffer)
  })

  it('onClose invoked for event \'close\'', async () => {
    WebSocket('/')(TestSocket)
    req.url = '/'

    await socketHandler(new RouteTree(websocketMap), injector, req, socket, head)
    await socket.onArgs[0][1]()

    expect(TestSocket.closeInvoked).to.be.true
    expect(socket.removeAllListenersInvoked).to.be.true
    expect(socket.destroyInvoked).to.be.true
  })

  it('onClose invoked for event \'end\'', async () => {
    WebSocket('/')(TestSocket)
    req.url = '/'

    await socketHandler(new RouteTree(websocketMap), injector, req, socket, head)
    await socket.onArgs[1][1]()

    expect(TestSocket.closeInvoked).to.be.true
    expect(socket.removeAllListenersInvoked).to.be.true
    expect(socket.destroyInvoked).to.be.true
  })

  it('onClose invoked for event \'close\'', async () => {
    class C extends TestSocket {
      public onClose() {
        throw new Error()
      }
    }
    WebSocket('/')(C)
    req.url = '/'
    expect(logger.exceptionLogs.length).equal(0)

    await socketHandler(new RouteTree(websocketMap), injector, req, socket, head)
    await socket.onArgs[0][1]()

    expect(logger.exceptionLogs.length).equal(1)
    expect(socket.removeAllListenersInvoked).to.be.true
    expect(socket.destroyInvoked).to.be.true
  })

  it('onError invoked for event \'error\'', async () => {
    WebSocket('/')(TestSocket)
    req.url = '/'
    expect(logger.errorLogs.length).equal(0)

    await socketHandler(new RouteTree(websocketMap), injector, req, socket, head)
    await socket.onArgs[3][1]('TestError')

    expect(TestSocket.error).equal('TestError')
    expect(socket.removeAllListenersInvoked).to.be.true
    expect(socket.destroyInvoked).to.be.true
  })

  it('onError throws exception', async () => {
    class C extends TestSocket {
      public onError() {
        throw new Error()
      }
    }
    WebSocket('/')(C)
    req.url = '/'
    expect(logger.exceptionLogs.length).equal(0)

    await socketHandler(new RouteTree(websocketMap), injector, req, socket, head)
    await socket.onArgs[3][1]('TestError')

    expect(logger.exceptionLogs.length).equal(1)
    expect(socket.removeAllListenersInvoked).to.be.true
    expect(socket.destroyInvoked).to.be.true
  })

  it('socket destroyed when unauthorized', async () => {
    WebSocket('/')(TestSocket)
    class A implements AuthenticationInterface {
      public hasAccess(): boolean {
        return false
      }
    }
    registry.getMap(registry.INJECTABLE).clear()
    Injectable(Injector.AUTHENTICATION)(A)
    Injectable(Injector.LOGGER)(FakeLogger)
    injector = new Injector()
    await injector.initDone()

    req.url = '/'

    await socketHandler(new RouteTree(websocketMap), injector, req, socket, head)

    expect(socket.removeAllListenersInvoked).to.be.true
    expect(socket.destroyInvoked).to.be.true
  })
})
