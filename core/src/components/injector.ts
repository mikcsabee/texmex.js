import * as http from 'http'
import registry from './registry'

/**
 * Main Dependency Injection handler class
 */
export class Injector {
  public static readonly AUTHENTICATION: string = 'authentication'
  public static readonly LOGGER: string = 'logger'

  /**
   * @private Stores the `@Injectable` component instances
   */
  private registry: Map<string, any> = new Map()

  /**
   * @private Stores the regisered `@Inject` fields
   */
  private injectRegistry: InjectRegistry = undefined

  /**
   * @private true when the initialization completed
   */
  private done: boolean = false

  /**
   * @private The `@Injectable`.init() method completion promise
   */
  private initPromise: Promise<boolean>

  /**
   * Initiales the internal variables including the `initPromise`
   */
  public constructor() {
    registry.getMap(registry.INJECTABLE)
      .forEach((value, key) => this.registerComponent(key, value))
    this.injectRegistry = new InjectRegistry()

    this.registry.forEach((value, key) => {
      this
        .injectRegistry
        .getInstanceProperties(value)
        .forEach((name) => value[name] = this.getComponent(name))
    })
    const promises: Array<Promise<void>> = []
    this.registry.forEach((value, key) => {
      if (typeof value.init === 'function') {
        const p = value.init()
        if (p && typeof p.then === 'function') {
          promises.push(p)
        }
      }
    })
    this.initPromise = Promise.all(promises).then(() => this.done = true)
  }

  /**
   * @return the `initPromise` internal variable
   */
  public initDone(): Promise<boolean> {
    return this.initPromise
  }

  /**
   * Gets an `@Injectable` component by name
   * @param name Component name
   * @returns The component (if exists)
   */
  public getComponent(name: string): any|undefined {
    return this.registry.get(name)
  }

  /**
   * Checks that an `@Injectable` is registered by name
   * @param name Component name
   * @returns true if the component is registered
   */
  public hasComponent(name: string): boolean {
    return this.registry.has(name)
  }

  /**
   * Injets the `@Injectable` Components to a `@Controller` or to a
   * `@Websocket`
   * @param instance The `@Controller` or `@Websocket` instance
   */
  public inject(instance: any): void {
    if (this.done) {
      this
        .injectRegistry
        .getInstanceProperties(instance)
        .forEach((name) => instance[name] = this.getComponent(name))
    }
  }

  /**
   * Adds a component instance to the registry
   * @param name Component name
   * @param component Component instance
   */
  private registerComponent(name: string, component: any): void {
    if (name === Injector.AUTHENTICATION &&
        typeof component.hasAccess !== 'function') {
          throw new Error('Dependency Injector exception: \'' + name + '\' must implement AuthenticationInterface!')
    }
    if (name === Injector.LOGGER &&
      (typeof component.info     !== 'function' ||
      typeof component.warn      !== 'function' ||
      typeof component.error     !== 'function' ||
      typeof component.exception !== 'function')) {
        throw new Error('Dependency Injector exception: \'' + name + '\' must implement LoggerInterface!')
    }
    this.registry.set(name, component)
  }
}

/**
 * Wraps the `Class.prototype->field` map and provides a method to be method
 * to search in the map.
 * @todo removee this class
 */
class InjectRegistry {
  private registry: Map<any, string[]>

  /**
   * Constructor requires the registy map
   * @param r the registry map
   */
  constructor() {
    this.registry = new Map(registry.getMap(registry.INJECT))
  }

  /**
   * Returns the registered @Inject fields for a `@Injectable` or a
   * `@Controller` or a `@Websocket` instance.
   * @param instance the instance
   * @returns an array of registered property names
   * @todo move this method to the Injector class
   */
  public getInstanceProperties(instance: any): string[] {
    let result = []
    this.registry.forEach((array, prototype) => {
      if (prototype.isPrototypeOf(instance)) {
        result = array
      }
    })
    return result
  }
}
