import { AuthenticationInterface, Injectable, Injector } from '@texmex.js/core'
import registry from '@texmex.js/core/lib/components/registry'
import { expect } from 'chai'
import * as http from 'http'
import { requestHandler } from '../../src/server/request.handler'
import { ServerConfig } from '../../src/server/server.config'
import { FakeLogger } from '../test.utils/fake.logger'

describe('requestHandler', () => {
  let req: http.IncomingMessage
  let res: http.ServerResponse
  let injector: Injector
  let config: ServerConfig
  let logger: FakeLogger

  beforeEach(async () => {
    registry.getMap(registry.INJECTABLE).clear()
    req = new http.IncomingMessage(undefined)
    res = new http.ServerResponse(req)

    Injectable(Injector.LOGGER)(FakeLogger)

    config = ServerConfig.initConfig()

    injector = new Injector()
    await injector.initDone()

    logger = injector.getComponent(Injector.LOGGER)
  })

  it('404 when controller method is not exists', async () => {
    class C {}
    await requestHandler(req, res, C, '/', injector, config)
    expect(res.statusCode).equals(404)
  })

  it('401 when UnAuthorized', async () => {
    class C {}
    class Authentication implements AuthenticationInterface {
      public hasAccess() {
        return false
      }
    }

    registry.getMap(registry.INJECTABLE).clear()
    Injectable(Injector.LOGGER)(FakeLogger)
    Injectable(Injector.AUTHENTICATION)(Authentication)

    injector = new Injector()
    await injector.initDone()

    await requestHandler(req, res, C, '/', injector, config)

    expect(res.statusCode).equals(401)
  })

  it('getParameters test', async () => {
    let param
    class C {
      public get(p) {
        param = p
      }
    }
    req.url = '/user/11'
    req.method = 'GET'
    await requestHandler(req, res, C, '/user/:id', injector, config)
    expect(param).equals('11')
  })

  it('log exceptions', async () => {
    class C {
      public get() {
        throw new Error('testError')
      }
    }
    req.method = 'GET'
    await requestHandler(req, res, C, '/', injector, config)
    expect(res.statusCode).equals(500)
    expect(logger.exceptionLogs.length).equals(1)
  })
})
