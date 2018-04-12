import { Controller, Inject, Injectable, Injector, LoggerInterface, WebSocket } from '@texmex.js/core'
import registry from '@texmex.js/core/lib/components/registry'
import { expect } from 'chai'
import * as express from 'express'
import * as http from 'http'
import * as sinon from 'sinon'
import {  } from '../../../core/src/logger/logger.interface'
import { ExpressHandler } from '../../src/server/express.handler'
import { LibraryService } from '../../src/server/library.service'
import { FakeLogger } from '../test.utils/fake.logger'

class FakeNodeHTTPServer {
  public onArgs: any[] = []
  public listenArgs: any[]
  public shouldCrash: boolean = false

  public on(...args: any[]): void {
    this.onArgs.push(args)
  }

  public listen(...args: any[]): void {
    if (this.shouldCrash) {
      throw new Error()
    }
    this.listenArgs = args
  }
}

class FakeExpress {
  public static allPaths
  public static allMethods
  public static listens
  public static uses

  public static reset(): void {
    FakeExpress.allPaths = []
    FakeExpress.allMethods = []
    FakeExpress.listens = []
    FakeExpress.uses = []
  }

  public all(path, method): void {
    FakeExpress.allPaths.push(path)
    FakeExpress.allMethods.push(method)
  }
  public use(arg): void { FakeExpress.uses.push(arg) }
  public listen(arg): void { FakeExpress.listens.push(arg) }
}

class FakeWebSocketServer {
  public static onActions
  public static onMethods

  public static reset(): void {
    FakeWebSocketServer.onActions = []
    FakeWebSocketServer.onMethods = []
  }

  public on(action, method): void {
    FakeWebSocketServer.onActions.push(action)
    FakeWebSocketServer.onMethods.push(method)
  }
}

class FakeLibraryService {
  public static staticLogger: FakeLogger

  public readonly logger: FakeLogger
  public readonly webSocketServer = FakeWebSocketServer
  public readonly express = () => new FakeExpress()

  public init() {
    FakeLibraryService.staticLogger = this.logger
  }
}

describe('ExpressHandler', () => {
  let fakeServer: FakeNodeHTTPServer

  beforeEach(() => {
    FakeExpress.reset()
    FakeWebSocketServer.reset()
    fakeServer = new FakeNodeHTTPServer()
    registry.getMap(registry.INJECTABLE).clear()
    registry.getMap(registry.CONTROLLER).clear()
    registry.getMap(registry.WEBSOCKET).clear()
    registry.getMap(registry.INJECT).clear()
    Inject(FakeLibraryService.prototype, 'logger')
    Injectable(LibraryService.NAME)(FakeLibraryService)
    Injectable(Injector.LOGGER)(FakeLogger)
    sinon.stub(http, 'createServer').returns(fakeServer)
  })

  afterEach(() => {
    // tslint:disable-next-line:no-eval
    eval('http.createServer.restore()')
  })

  it('constructor without parameter', async () => {
    const handler = new ExpressHandler(undefined)
    await handler.start()

    expect(FakeExpress.uses[0]).to.be.a('Function')
    expect(FakeExpress.listens.length).equal(0)
    expect(fakeServer.listenArgs[0]).equal(3000)

    fakeServer.listenArgs[1]()
    expect(FakeLibraryService.staticLogger.infoLogs[0]).equal('Server started on port: 3000')
  })

  it('not found method registered', async () => {
    const fakeExpress = new FakeExpress()
    const handler = new ExpressHandler(fakeExpress as any, {default404: 'notFound'})
    await handler.start()

    const req = new http.IncomingMessage(undefined)
    const res = new http.ServerResponse(req)
    let responseOutput
    res.write = (output): boolean => {
      responseOutput = output
      return true
    }
    FakeExpress.uses[0](req, res)

    expect(res.statusCode).equal(404)
    expect(responseOutput).equal('notFound')
  })

  it('register controllers', async () => {
    class C {
      public get(): string { return 'requestResult' }
    }
    Controller('/')(C)

    const handler = new ExpressHandler(undefined)
    await handler.start()

    expect(FakeExpress.allPaths.length).equal(1)
    expect(FakeExpress.allPaths[0]).equal('/')

    expect(FakeExpress.allMethods.length).equal(1)
    expect(FakeExpress.allMethods[0]).to.be.a('Function')

    const req = new http.IncomingMessage(undefined)
    req.url = '/'
    req.method = 'GET'
    const res = new http.ServerResponse(req)
    let responseOutput
    res.write = (output): boolean => {
      responseOutput = output
      return true
    }
    await FakeExpress.allMethods[0](req, res)

    expect(responseOutput).equal('requestResult')
  })

  it('register websocket', async () => {
    class W {}
    WebSocket('/ws')(W)

    const handler = new ExpressHandler(undefined)
    await handler.start()

    expect(FakeWebSocketServer.onActions.length).equal(1)
    expect(FakeWebSocketServer.onActions[0]).equal('connection')

    expect(FakeWebSocketServer.onMethods.length).equal(1)
    expect(FakeWebSocketServer.onMethods[0]).to.be.a('Function')

    let isTerminated = false
    class FakeSocket{
      public terminate() { isTerminated = true }
    }
    FakeWebSocketServer.onMethods[0](new FakeSocket(), new http.IncomingMessage(undefined))

    expect(isTerminated).to.be.true
  })
})
