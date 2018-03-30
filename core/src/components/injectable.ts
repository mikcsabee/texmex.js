import registry from './registry'

/**
 * Injectable decorator
 * <pre>
 * &commat;Injectable('name')
 * export class MyInjectable {}
 * </pre>
 * @param names The possible names for the Injectable
 */
export function Injectable(...names: string[]) {
  return (target) => {
    const map: Map<string, any> = registry.getMap(registry.INJECTABLE)
    for (const name of names) {
      if (map.has(name)) {
        throw new Error('Component is already in use: ' + name)
      }
      map.set(name, new target())
    }
  }
}
