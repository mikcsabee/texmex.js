/**
 * The interface definition describes the main logging methods.
 * The default implementation is the `ConsoleLogger`.
 * Injectable with to any `@Controller` or `@Injectable`:
 * <pre>
 * &commat;Inject
 * logger: LoggerInterface
 * </pre>
 */
export interface LoggerInterface {
  info(message: any): void
  warn(message: any): void
  error(message: any): void
  exception(exception: any): void
}
