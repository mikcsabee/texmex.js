import { expect } from 'chai'
import { Inject } from '../../src/components/inject'
import { Injectable } from '../../src/components/injectable'
import { Injector } from '../../src/components/injector'
import registry from '../../src/components/registry'
import { FakeLogger } from '../test.utils/fake.logger'

class TestClass {}

describe('Injector', () => {
  let injector: Injector
  const mapInject: Map<any, string[]> = registry.getMap(registry.INJECT)
  const mapInjectable: Map<string, any> = registry.getMap(registry.INJECTABLE)

  beforeEach(() => {
    mapInject.clear()
    mapInjectable.clear()
  })

  it('Constructor registers all components from Injectables', async () => {
    Injectable('testClass')(TestClass)
    injector = new Injector()
    await injector.initDone()
    expect(injector.hasComponent('testClass')).to.be.true
  })

  it('Constructor wires components together', async () => {
    class X { public y; public text = 'X' }
    class Y { public x; public y; public text = 'Y' }
    Injectable('x')(X)
    Injectable('y')(Y)
    Inject(X.prototype, 'y')
    Inject(Y.prototype, 'x')
    Inject(Y.prototype, 'y')
    Injectable('testClass')(TestClass)

    injector = new Injector()
    await injector.initDone()

    const x = injector.getComponent('x')
    const y = injector.getComponent('y')
    expect(x.y.text).equal('Y')
    expect(y.x.text).equal('X')
    expect(y.y.text).equal('Y')
  })

  it('Constructor invokes component init methods', async () => {
    let init = false
    let asyncInit = false
    class X { public init() { init = true } }
    class Y { public async init() { asyncInit = true; return true } }

    Injectable('x')(X)
    Injectable('y')(Y)
    Injectable('testClass')(TestClass)

    injector = new Injector()
    await injector.initDone()

    expect(init).to.be.true
    expect(asyncInit).to.be.true
  })

  it('Throws error when AUTHENTICATION is not implemented correctly', () => {
    Injectable(Injector.AUTHENTICATION)(TestClass)
    expect(() => new Injector()).to.throw()
  })

  it('Throws error when LOGGER is not implemented correctly', () => {
    class MyLogger {
      public info(message: any) {}
      public warn(message: any) {}
      public error(message: any) {}
    }
    Injectable(Injector.LOGGER)(MyLogger)
    expect(() => new Injector()).to.throw()
  })

  it('Throws error when try to register with the same name twice', () => {
    Injectable('test')(class X {})
    expect(() => Injectable('test')(class Y {})).to.throw()
  })

  it('Cannot inject before init', () => {
    class X {
      public init() {
        return new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
    class Y { public x }

    Injectable('x')(X)
    Inject(Y.prototype, 'x')

    const y = new Y()

    injector = new Injector()
    injector.inject(y)

    expect(y.x).to.be.undefined
  })

  it('Can inject after init', async () => {
    class X {
      public readonly value: boolean = true
    }
    class Y { public x: X }

    Injectable('x')(X)
    Inject(Y.prototype, 'x')

    injector = new Injector()
    await injector.initDone()

    const y = new Y()
    injector.inject(y)
    expect(y.x.value).to.be.true
  })
})
