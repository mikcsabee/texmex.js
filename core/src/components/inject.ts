import registry from './registry'

/**
 * Inject decorator<br/>
 * Injects an `@Injectable` to an `@Injectable` or to a `@Controller` or to a `@Websocket`.
 * <pre>
 * &commat;Inectable('myService')
 * export class MyService {
 *   &commat;Inject
 *   logger: LoggerInterface
 * }
 * </pre>
 */
export function Inject(prototype?: any, propertyName?: string) {
  const map: Map<any, string[]> = registry.getMap(registry.INJECT)
  if (map.has(prototype) === false) {
    map.set(prototype, [])
  }
  map.get(prototype).push(propertyName)
}
