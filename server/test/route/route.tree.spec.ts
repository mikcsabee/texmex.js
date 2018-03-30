import { Controller } from '@texmex.js/core'
import registry from '@texmex.js/core/lib/components/registry'
import { expect } from 'chai'
import { RouteTree } from '../../src/route/route.tree'

abstract class HasNameController {
  public abstract getName(): string
}

class Test1Controller extends HasNameController {
  public getName() { return 'Test1Controller' }

  public async get() {}
}

class Test2Controller extends HasNameController {
  public getName() { return 'Test2Controller' }
}

class Test3Controller extends  HasNameController {
  public getName() { return 'Test3Controller' }
}

const controllerFactory = (tree: RouteTree, url: string): HasNameController|undefined => {
  const controllerClass = tree.getControllerClass(url)
  if (controllerClass.prototype instanceof HasNameController) {
    return new controllerClass({req: undefined, res: undefined})
  }
  return undefined
}

describe('RouteTree', () => {
  const controllerMap: Map<string, any> = registry.getMap(registry.CONTROLLER)

  beforeEach(() => {
    controllerMap.clear()
  })

  it('basic registerPath', () => {
    Controller('/',      'test/test1')(Test1Controller)
    Controller('/test2', 'test/test2')(Test2Controller)
    const tree = new RouteTree(controllerMap)

    expect(controllerFactory(tree, '/').getName()).equal('Test1Controller')
    expect(controllerFactory(tree, '/test2').getName()).equal('Test2Controller')
    expect(controllerFactory(tree, '/test2?param=x').getName()).equal('Test2Controller')
    expect(controllerFactory(tree, '/test/test1').getName()).equal('Test1Controller')
    expect(controllerFactory(tree, '/test/test2').getName()).equal('Test2Controller')

    expect(tree.getControllerClass('/invalid')).to.be.undefined
  })

  it('resolve parameters 1', () => {
    Controller('/action/:actionId')(Test1Controller)
    Controller('/xxx/:xxxId/yyy/:yyyId')(Test2Controller)
    const tree = new RouteTree(controllerMap)

    expect(controllerFactory(tree, '/action/action1').getName()).equal('Test1Controller')
    expect(controllerFactory(tree, '/xxx/1/yyy/2').getName()).equal('Test2Controller')
  })

  it('resolve parameters 2', () => {
    Controller('/action/:actionId/xx')(Test1Controller)
    Controller('/action/:actionId/:yy')(Test2Controller)
    Controller('/action/:actionId')(Test3Controller)
    const tree = new RouteTree(controllerMap)

    expect(controllerFactory(tree, '/action/action1/xx').getName()).equal('Test1Controller')
    expect(controllerFactory(tree, '/action/action2/aa').getName()).equal('Test2Controller')
    expect(controllerFactory(tree, '/action/action3/').getName()).equal('Test3Controller')
  })

  it('find controller without parameter', () => {
    Controller('/action/:actionId')(Test1Controller)
    Controller('/aa/bb/cc/dd/ee/ff/gg/hh/:ii')(Test2Controller)
    Controller('/xx/yy/zz')(Test3Controller)
    const tree = new RouteTree(controllerMap)

    expect(controllerFactory(tree, '/action').getName()).equal('Test1Controller')
    expect(controllerFactory(tree, '/aa/bb/cc/dd/ee/ff/gg/hh/').getName()).equal('Test2Controller')
    expect(tree.getControllerClass('/xx/yy')).to.be.undefined
  })

  it('getParameters', () => {
    Controller('/aa/:bb/:cc')(Test1Controller)
    Controller('/xx/yy/zz')(Test1Controller)
    const tree = new RouteTree(controllerMap)

    let params = tree.getParameters('/aa/param1/param2')
    expect(params.length).equal(2)
    expect(params[0]).equal('param1')
    expect(params[1]).equal('param2')

    params = tree.getParameters('/xx/zz')
    expect(params.length).equal(0)
  })
})
