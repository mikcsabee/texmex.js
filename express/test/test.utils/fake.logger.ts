import { LoggerInterface } from '../../main/logger/logger.interface'

export class FakeLogger implements LoggerInterface {
  public get name() { return 'TestLogger' }
  public infoLogs: any[] = []
  public warnLogs: any[] = []
  public errorLogs: any[] = []
  public exceptionLogs: any[] = []

  public info(message: any) { this.infoLogs.push(message) }
  public warn(message: any) { this.warnLogs.push(message) }
  public error(message: any) { this.errorLogs.push(message) }
  public exception(exception: any) { this.exceptionLogs.push(exception) }
}
