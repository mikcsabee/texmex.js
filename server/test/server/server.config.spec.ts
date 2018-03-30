import { NoAuthentication } from '@texmex.js/core/lib/authentication/no.authentication'
import registry from '@texmex.js/core/lib/components/registry'
import { expect } from 'chai'
import { ServerConfig } from '../../src/server/server.config'
import { FakeLogger } from '../test.utils/fake.logger'

class TestController {
  public get name() { return 'TestController' }
}

class AuthenticationTest extends NoAuthentication {
  public get name() { return 'AuthenticationTest' }
}

describe('ServerConfig', () => {
  beforeEach(() => {
    registry.getMap(registry.INJECTABLE).clear()
  })

  it('initConfig creates config with default values', () => {
    const config = ServerConfig.initConfig()

    expect(config.port).equal(3000)
    expect(config.staticPaths.length).equal(0)
    expect(config.default401).equal('')
    expect(config.default404).equal('')
    expect(config.default500).equal('')
  })

  it('initConfig not overrides config with default values', () => {
    const config = ServerConfig.initConfig({
      default401: '401',
      default404: '404',
      default500: '500',
      port: 8080,
      staticPaths: [
        {url: '/', path: '/'}
      ]
    })

    expect(config.port).equal(8080)
    expect(config.staticPaths.length).equal(1)
    expect(config.default401).equal('401')
    expect(config.default404).equal('404')
    expect(config.default500).equal('500')
  })
})
