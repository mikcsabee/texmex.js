import { expect } from 'chai'
import registry from '../../src/components/registry'
import { WebSocket } from '../../src/components/websocket'

describe('WebSocket', () => {
  const map: Map<string, any> = registry.getMap(registry.WEBSOCKET)

  beforeEach(() => {
    map.clear()
  })

  it('registerPath registers single item', () => {
    WebSocket('/url')('target')
    const target = map.get('/url')
    expect(target).equal('target')
  })

  it('registerPath registers array of items', () => {
    WebSocket('/url1', '/url2')('target')
    const target1 = map.get('/url1')
    const target2 = map.get('/url2')
    expect(target1).equal('target')
    expect(target2).equal('target')
  })
})
