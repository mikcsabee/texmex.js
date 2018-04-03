
/**
 * The x represents a Binary Tree which describes the routes, which defined at
 * the `@Controller` and the `@WebSockets`.
 */
export class RouteNode {
  /**
   * @private Describes a part of the URL
   * @example
   * An URL can be described like: `/api/users`
   * then the segments are: `api` and `users`
   */
  private urlSegment: string

  /**
   * @private The nodes underneath from the current level.
   */
  private subNodes: RouteNode[] = []

  /**
   * @private The Controller class for the current level.
   */
  private controllerClass: any

  /**
   * @param urlSegment the urlSegment of the current level
   */
  constructor(urlSegment: string) {
    this.urlSegment = urlSegment
  }

  /**
   * Gets the controllerClass of the current level.
   * @returns controllerClass
   */
  public getControllerClass(): any {
    return this.controllerClass
  }

  /**
   * Sets the Controller class of the current level.
   * @param controllerClass the Controller class
   */
  public setControllerClass(controllerClass: any) {
    this.controllerClass = controllerClass
  }

  /**
   * Gets the urlSegment of the current level.
   * @returns current urlSegment
   */
  public getUrlSegment(): string {
    return this.urlSegment
  }

  /**
   * Gets the subNodes of the current level.
   * @returns subnodes
   */
  public getSubNodes(): RouteNode[] {
    return this.subNodes
  }

  /**
   * Get one node underneath from the current level by urlSegment
   * @param urlSegment the urlSegment of the node
   * @returns RouteNode (if exists)
   */
  public getSubNode(urlSegment: string): RouteNode|undefined {
    let candidate
    for (const node of this.subNodes) {
      if (node.urlSegment === urlSegment) {
        return node
      }
      if (node.urlSegment.length > 0 && node.urlSegment.charAt(0) === ':') {
        candidate = node
      }
    }
    return candidate
  }

  /**
   * Returns a node from the level underneath by name, if not exists creates
   * it then returns it.
   * @param urlSegment the urlSegment of the node
   * @returns RouteNode
   */
  public getOrCreateSubNode(urlSegment: string): RouteNode {
    const node: RouteNode = this.getSubNode(urlSegment)
    if (node) {
      return node
    }
    const newNode: RouteNode = new RouteNode(urlSegment)
    this.subNodes.push(newNode)
    return newNode
  }
}
