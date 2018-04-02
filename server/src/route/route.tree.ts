import { RouteNode } from './route.node'

/**
 * Handles the RouteNode Binary Tree
 */
export class RouteTree {
  /**
   * @private the root-RouteNode (`/`)
   */
  private rootRouteNode: RouteNode

  /**
   * @param map `path->Controller.prototype` map
   * or `path->Websocket.prototype` map
   */
  constructor(map: Map<string, any> ) {
    this.rootRouteNode = new RouteNode('')

    map.forEach((controllerClass, path) => {
      const segments = path.split('/').filter(String)
      this.putSegmentsIntoRootNode(segments, controllerClass)
    })
  }

  /**
   * Retunrs a Controller class for a URL.
   * @param url the URL input
   * @returns a CotnrollerClass if the URL is registerd
   */
  public getControllerClass(url: string): any|undefined {
    const segments = url.split('?')[0].split('/').filter(String)
    if (segments.length === 0) {
      return this.rootRouteNode.getControllerClass()
    }

    let currentNode = this.rootRouteNode
    for (const segment of segments) {
      currentNode = currentNode.getSubNode(segment)
      if (currentNode === undefined) {
        return undefined
      }
    }

    if (!currentNode.getControllerClass()) {
      for (const node of currentNode.getSubNodes()) {
        if (node.getUrlSegment().length > 0 && node.getUrlSegment().charAt(0) === ':') {
          return node.getControllerClass()
        }
      }
    }

    return currentNode.getControllerClass()
  }

  /**
   * Retunrs the resolved parameters for a URL.
   * Example registered url: `/api/:userId/thing/:thingId`
   * Example input url: `/api/1/thing/x`
   * Example output: `["1", "x"]`
   * @param url the Input URL
   * @returns the array of resolved parameters
   */
  public getParameters(url: string): string[] {
    const result: string[] = []
    const segments: string[] = url.split('?')[0].split('/').filter(String)
    let currentNode = this.rootRouteNode

    for (const segment of segments) {
      currentNode = currentNode.getSubNode(segment)
      if (currentNode === undefined) {
        break
      }
      if (currentNode.getUrlSegment() !== segment) {
        result.push(segment)
      }
    }
    return result
  }

  /**
   * Adds segmets to the root-RouteNode
   * @param segments The regisered segments
   * @param controllerClass The ControllerClass for the segments
   */
  private putSegmentsIntoRootNode(segments: string[], controllerClass: any): void {
    if (segments.length === 0) {
      this.rootRouteNode.setControllerClass(controllerClass)
      return
    }

    let currentNode: RouteNode = this.rootRouteNode
    for (const segment of segments) {
      currentNode = currentNode.getOrCreateSubNode(segment)
    }
    currentNode.setControllerClass(controllerClass)
  }
}
