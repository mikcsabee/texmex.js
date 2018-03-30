import { AuthenticationInterface, Controller, Inject, Injectable, Injector } from '@texmex.js/core'
import { NoAuthentication } from '@texmex.js/core/lib/authentication/no.authentication'
import registry from '@texmex.js/core/lib/components/registry'
import { expect } from 'chai'
import * as fs from 'fs'
import * as http from 'http'
import * as sinon from 'sinon'
import { RouteTree } from '../../src/route/route.tree'
import { requestHandler } from '../../src/server/request.handler'
import { ServerConfig } from '../../src/server/server.config'
import { FakeLogger } from '../test.utils/fake.logger'

describe('requestHandler', () => {
  let req: http.IncomingMessage
  let res: http.ServerResponse
  let config: ServerConfig
  let responseOutput: string
  let injector: Injector
  const controllerMap: Map<string, any> = registry.getMap(registry.CONTROLLER)

  beforeEach( async () => {
    registry.getMap(registry.CONTROLLER).clear()
    registry.getMap(registry.INJECT).clear()
    registry.getMap(registry.INJECTABLE).clear()

    responseOutput = null
    Injectable(Injector.AUTHENTICATION)(NoAuthentication)
    Injectable(Injector.LOGGER)(FakeLogger)
    injector = new Injector()
    await injector.initDone()
    config = ServerConfig.initConfig({})
    req = new http.IncomingMessage(undefined)
    res = new http.ServerResponse(req)
    res.write = (output): boolean => {
      if (typeof output === 'object') {
        responseOutput = JSON.stringify(output)
      } else {
        responseOutput = output
      }
      return true
    }
    expect(res.statusCode).equal(200)
  })

  it('controller not found => 404', () => {
    requestHandler(new RouteTree(controllerMap), config, injector, req, res)
    expect(res.statusCode).equal(404)
  })

  it('unAuthorized => 401', async () => {
    class C {}
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

    Controller('/')(C)
    req.url = '/'

    await requestHandler(new RouteTree(controllerMap), config, injector, req, res)
    expect(res.statusCode).equal(401)
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
    config = ServerConfig.initConfig({default500: 'Exception'})

    Controller('/')(C)
    req.url = '/'

    await requestHandler(new RouteTree(controllerMap), config, injector, req, res)

    expect(res.statusCode).equal(500)
    expect(responseOutput).equal('Exception')
  })

  it('Controller constructor throws exception', async () => {
    class C {
      constructor() {
        throw new Error()
      }
    }
    Controller('/')(C)
    req.url = '/'

    await requestHandler(new RouteTree(controllerMap), config, injector, req, res)
    expect(res.statusCode).equal(500)
  })

  it('method returns object => Content-Type === application/json', async () => {
    class C {
      public async get() { return {obj: true} }
    }
    Controller('/')(C)
    req.method = 'GET'
    await requestHandler(new RouteTree(controllerMap), config, injector, req, res)

    expect(res.statusCode).equal(200)
    expect(res.getHeader('content-type')).equal('application/json')
    expect(responseOutput).equal('{"obj":true}')
  })

  it('method returns string => HTTP 200', async () => {
    class C {
      public async post() { return 'StringResponse' }
    }
    Controller('/')(C)
    req.method = 'POST'
    await requestHandler(new RouteTree(controllerMap), config, injector, req, res)

    expect(res.statusCode).equal(200)
    expect(responseOutput).equal('StringResponse')
  })

  it('method returns null => responseOutput === null', async () => {
    class C {
      public async put() { return null }
    }
    Controller('/')(C)
    req.method = 'PUT'
    await requestHandler(new RouteTree(controllerMap), config, injector, req, res)

    expect(res.statusCode).equal(200)
    expect(responseOutput).equal(null)
  })

  it('method throws exception => statusCode === 500', async () => {
    class C {
      public async delete() { throw new Error('Error') }
    }
    Controller('/')(C)
    req.method = 'DELETE'
    await requestHandler(new RouteTree(controllerMap), config, injector, req, res)

    expect(res.statusCode).equal(500)
    expect(responseOutput).equal('')
    const logger = injector.getComponent(Injector.LOGGER)
    expect(logger.exceptionLogs[0].toString()).equal('Error: Error')
  })

  it('method returns emptyString => statusCode === 204', async () => {
    class C {}
    Controller('/')(C)
    req.method = 'OPTIONS'
    await requestHandler(new RouteTree(controllerMap), config, injector, req, res)

    expect(res.statusCode).equal(204)
    expect(responseOutput).equal(null)
  })

  it('invalid method => statusCode === 404', async () => {
    class C {}
    Controller('/')(C)
    req.method = 'INVALID'
    expect(res.statusCode).equal(200)
    await requestHandler(new RouteTree(controllerMap), config, injector, req, res)
    expect(res.statusCode).equal(404)
  })

  it('requestHandler resolves parameters', async () => {
    let receivedFirstParam
    let receivedSecondParam

    class C {
      public actionId: string
      public async options(firstParam: string, secondParam: string) {
        receivedFirstParam = firstParam
        receivedSecondParam = secondParam
      }
    }
    Controller('/action/:firstParam/xxx/:secondParam')(C)
    req.method = 'OPTIONS'
    req.url = '/action/param1/xxx/param2'

    await requestHandler(new RouteTree(controllerMap), config, injector, req, res)

    expect(receivedFirstParam).equal('param1')
    expect(receivedSecondParam).equal('param2')
  })

  it('requestHandler injects dependencies into the controller', async () => {
    class S {
      public getTest(): string { return 'ServiceTestResult' }
    }
    class C {
      public service: S
      public get() {
        return this.service.getTest()
      }
    }
    Controller('/')(C)
    Injectable('service')(S)
    Inject(C.prototype, 'service')
    req.url = '/'
    req.method = 'GET'

    injector = new Injector()
    await injector.initDone()
    await requestHandler(new RouteTree(controllerMap), config, injector, req, res)

    expect(responseOutput).equal('ServiceTestResult')
  })

  it('Static file not found => 404', async () => {
    config.staticPaths = [
      {url: '/', path: '/public'}
    ]
    req.url = '/'
    req.method = 'GET'
    await requestHandler(new RouteTree(controllerMap), config, injector, req, res)

    expect(res.statusCode).equal(404)
  })

  it('Read Static file', (done) => {
    const stub = sinon.stub(fs, 'readFile')
    config.staticPaths = [
      {url: '/', path: '/public/'}
    ]
    req.url = '/file.txt'
    req.method = 'GET'
    const promise = requestHandler(new RouteTree(controllerMap), config, injector, req, res) as Promise<void>

    promise.then(() => {
      expect(res.getHeader('content-type')).equal('text/plain')
      expect(res.statusCode).equal(200)
      expect(responseOutput).equal('FileContent')
      done()
    })

    stub.args[0][1](undefined, 'FileContent')
    // tslint:disable-next-line:no-eval
    eval('fs.readFile.restore()')
  })
})
