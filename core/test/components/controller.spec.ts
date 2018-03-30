import { expect } from 'chai'
import { Controller } from '../../src/components/controller'
import registry from '../../src/components/registry'

describe('Controller', () => {
  const map: Map<string, any> = registry.getMap(registry.CONTROLLER)

  beforeEach(() => map.clear())

  it('registerPath registers single item', () => {
    Controller('/url')('target')
    const target = map.get('/url')
    expect(target).equal('target')
  })

  it('registerPath registers array of items', () => {
    Controller('/url1', '/url2')('target')
    const target1 = map.get('/url1')
    const target2 = map.get('/url2')
    expect(target1).equal('target')
    expect(target2).equal('target')
  })
})
