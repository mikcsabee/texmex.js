import registry from './registry'

/**
 * WebSocket decorator
 * <pre>
 * &commat;WebSocket('/path')
 * export class MyWebSocket {
 * }
 * </pre>
 * @param paths The request paths where the WebSocket assigned.
 */
export function WebSocket(...paths: string[]) {
  return (target) => {
    for (const path of paths) {
      registry.set(registry.WEBSOCKET, path, target)
    }
  }
}
