import * as chai from 'chai'
import { NoAuthentication } from '../../src/authentication/no.authentication'

describe('AuthenticationNone', () => {
  it('hasAccess', () => {
    const auth = new NoAuthentication()
    const result = auth.hasAccess(null, null)
    chai.expect(result).to.equal(true)
  })
})
