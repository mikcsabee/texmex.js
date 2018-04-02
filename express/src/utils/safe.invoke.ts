import { LoggerInterface } from '@texmex.js/core'

/**
 * Invokes a user method and logs if exception occurs
 * @param method user method
 * @param logger The server logger
 */
export function safeInvoke(method: () => any, logger: LoggerInterface): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const result = method()
      if (result && typeof result.then === 'function') {
        result
        .then((r) => resolve(r))
        .catch((e) => { logger.exception(e); reject(e) })
      } else {
        resolve(result)
      }
    } catch (e) {
      logger.exception(e)
      reject(e)
    }
  })
}
