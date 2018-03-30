import { Inject, Injectable, Injector } from '@texmex.js/core'
import registry from '@texmex.js/core/lib/components/registry'
import { expect } from 'chai'
import * as http from 'http'
import * as sinon from 'sinon'
import { Server } from '../../src/server/server'
import { FakeLogger } from '../test.utils/fake.logger'
import { FakeSocket } from '../test.utils/fake.socket'

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

describe('Server', () => {
  let fakeServer: FakeNodeHTTPServer
  let server: Server

  beforeEach(() => {
    registry.getMap(registry.INJECTABLE).clear()
    fakeServer = new FakeNodeHTTPServer()
    Injectable(Injector.LOGGER)(FakeLogger)
    sinon.stub(http, 'createServer').returns(fakeServer)
    server = new Server()
  })

  afterEach(() => {
    // tslint:disable-next-line:no-eval
    eval('http.createServer.restore()')
  })

  it('start', async () => {
    await server.start()
    expect(fakeServer.onArgs[0][0]).equal('request')
    expect(fakeServer.onArgs[0][1]).to.be.a('Function')
    expect(fakeServer.onArgs[1][0]).equal('upgrade')
    expect(fakeServer.onArgs[1][1]).to.be.a('Function')
    expect(fakeServer.listenArgs[0]).equal(3000)
  })

  it('on.request', async () => {
    await server.start()

    const req: http.IncomingMessage = new http.IncomingMessage(undefined)
    const res: http.ServerResponse = new http.ServerResponse(req)
    expect(res.statusCode).equal(200)

    fakeServer.onArgs[0][1](req, res)
    expect(res.statusCode).equal(404)
  })

  it('on.upgrade', async () => {
    await server.start()
    const req: http.IncomingMessage = new http.IncomingMessage(undefined)
    const socket: FakeSocket = new FakeSocket()
    fakeServer.onArgs[1][1](req, socket)
    expect(socket.removeAllListenersInvoked).to.be.true
    expect(socket.destroyInvoked).to.be.true
  })
})
