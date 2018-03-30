import registry from './registry'

/**
 * Controller decorator
 * <pre>
 * &commat;Controller('/path')
 * export class MyController {
 *   public get() {
 *     return 'Hello World'
 *   }
 * }
 * </pre>
 * @param paths The request paths where the Controller assigned.
 */
export function Controller(...paths: string[]) {
  return (target) => {
    for (const path of paths) {
      registry.set(registry.CONTROLLER, path, target)
    }
  }
}
