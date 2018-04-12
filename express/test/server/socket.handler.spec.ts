import { AuthenticationInterface, Injectable, Injector, WebSocket } from '@texmex.js/core'
import registry from '@texmex.js/core/lib/components/registry'
import { expect } from 'chai'
import { EventEmitter } from 'events'
import * as http from 'http'
import { RouteTree } from '../../src/route/route.tree'
import { socketHandler } from '../../src/server/socket.handler'

class FakeSocket extends EventEmitter {
  public closed = false
  public terminate(): void { this.closed = true }
}

describe('socketHandler', () => {
  let req
  let socket

  beforeEach(async () => {
    req = new http.IncomingMessage(undefined)
    socket = new FakeSocket()
    registry.getMap(registry.INJECTABLE).clear()
    registry.getMap(registry.WEBSOCKET).clear()
  })

  it('Close socket when controller not found', async () => {
    const injector = new Injector()
    await injector.initDone()

    socketHandler(new RouteTree(new Map()), injector, req, socket)
    expect(socket.closed).equals(true)
  })

  it('Close socket when unauthorized', async () => {
    class TestSocket {}
    WebSocket('/')(TestSocket)
    class A implements AuthenticationInterface {
      public hasAccess(): boolean {
        return false
      }
    }
    Injectable(Injector.AUTHENTICATION)(A)

    const injector = new Injector()
    await injector.initDone()
    req.url = '/'

    await socketHandler(new RouteTree(registry.getMap(registry.WEBSOCKET)), injector, req, socket)
    expect(socket.closed).equals(true)
  })

  it('handle open', async () => {

  })
})
