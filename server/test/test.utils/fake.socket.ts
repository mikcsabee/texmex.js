export class FakeSocket {
  public removeAllListenersInvoked: boolean = false
  public destroyInvoked: boolean = false
  public writeArgs: any[] = []
  public onArgs: any[] = []

  public removeAllListeners() { this.removeAllListenersInvoked = true }
  public destroy() { this.destroyInvoked = true}
  public write(...args) { this.writeArgs.push(args) }
  public on(...args) { this.onArgs.push(args) }
  public setTimeout() {}
  public setNoDelay() {}
}
