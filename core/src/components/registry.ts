/**
 * Main decorator registry
 */
export class Registry {
  public readonly CONTROLLER: string = 'Controller'
  public readonly WEBSOCKET: string = 'WebSocket'

  public readonly INJECT: string = 'Inject'
  public readonly INJECTABLE: string = 'Injectable'

  /**
   * @private stores a map for each decorator
   */
  private map: Map<string, any> = new Map()

  /**
   * Assign value to a decorator map
   * @param name Decorator name
   * @param key Key
   * @param value Value
   */
  public set(name: string, key: string, value: any): void {
    this.getMap(name).set(key, value)
  }

  /**
   * Get a map for a decorator, creates the map if not found.
   * @param name Decorator name
   */
  public getMap(name: string): Map<any, any> {
    if (this.map.has(name) === false) {
      this.map.set(name, new Map())
    }
    return this.map.get(name)
  }
}

export default new Registry()
