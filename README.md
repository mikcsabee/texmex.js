# TexMex.js
Lightweight Object-oriented Node.js framework
## Features:
 - Lightweight
 - Minimalistic
 - WebSocket support
 - Dependency Injection

## Installation
```bash
npm install --save @texmex.js/core @texmex.js/server
```

## Hello World:
```javascript
import { Controller, Inject } from '@texmex.js/core'
import { Server } from '@texmex.js/server'

@Controller('/')
export class DemoController {
  get() {
    return 'Hello World'
  }
}

const server = new Server()
server.start()
```

Webpack is probably the best tool to compile the code. You need to enable [decorators](https://www.typescriptlang.org/docs/handbook/decorators.html) support.
 `(@todo: add detailed documentation)`

The compiled code will open the port 3000, and you should be the `Hello World` message in your browser.

## Server configuration
The default server configuration looks like the following:
```javascript
const server = new Server({
  port: 3000,
  staticPaths: [],
  default401: '',
  default404: '',
  default500: ''
})
```
Where `staticPaths` is a list of static folder mapping for example:
```javascript
const server = new Server({
  staticPaths: [{
    url: '/', path: '/path/to/static/files'
  }]
})
```

## Controller
- The Controller decorator can handle multiple paths. (`@Controller('/', '/api/')`).
- Controllers can handle five different HTTP methods: `get, post, put, delete, options`.
- Methods can be `async` or `non-async`.
- Texmex creates a **controller instance per request**.
- Controller constructor invoked with three arguments:
    - `request: http.IncomingMessage`
    - `response: http.ServerResponse`
    - `accessResult: any|userDefined` (more details about `accessResult` at `Authentication`)
- Dependencies can be injected into a controller instance:
```javascript
@Controller('/action/:firstParam/xxx/:secondParam')
export class DemoController {
  @Inject
  private service: Service

  private req: http.IncomingMessage
  private res: http.ServerResponse
  private accessResult: MyCustomType

  public constructor(req: http.IncomingMessage, res: http.ServerResponse, accessResult: MyCustomType) {
    this.req = req
    this.res = res
    this.accessResult = accessResult
  }

  public async post(firstParam: string, secondParam: string): MyResult {
    return this.service.handlePost(firstParam, secondParam)
  }
}
```
- Meaning of return value:
  - `null`: no action
  - `undefined`: statusCode = 404, body = serverConfig.default404
  - `object`: statusCode = 200, body = JSON parsed object, Content-Type = `application/json`
  - `string`: statusCode = 200, body = string
  - `empty-string`: statusCode = 204, body = empty
  - `when-exception`: statusCode = 500, body = serverConfig.default500

## Websocket
 - Similar to `@Controller`
 - Default Websocket events: `onOpen, onClose, onMessage(message: string), onError(e: Error)`
 - Websocket constructor invoked with three arguments:
    - `request: http.IncomingMessage`
    - `sendMessage: (any) => void`
    - `accessResult: any|userDefined` (more details about `accessResult` at `Authentication`)
 - `@todo add example.`

## Dependency Injection
A component can be injectable by using the `@Injectable(name)` decorator, where `name` is the component name. Components can be inject into `@Injectable`, `@Controller` or `@WebSocket`, by using the `@Inject` decorator, where the varaible name has to match with the component name. For example:
```javascript
@Injectable('userService')
export class UserService {}

@Injectable('demoService')
export class DemoService {
  @Inject
  private userService: UserService

  public init(): void {}
}
```
Don't use constructor, **use `init()` method** insead, Texmex will automatically invokes the `init` method, when all components dependencies are injected. The `init` method can be `async` or `non-async`.

Components created once at server start-up.

## Default components
There is two component available by default, but it's highly recommended to use your own
### Authentication
 - Component name: `authentication`
 - Interface: `AuthenticationInterface`
 - **Default behavior: accepts all requests**
 - Returns the **`accessResult`** (3rd argument for `@Controller` and `@Websocket` constructors).
```javascript
@Injectable('authentication')
export class MyAuthentication implements AuthenticationInterface {
  public hasAccess(req: http.IncomingMessage, controller: any) {
    /*
    Get user from req
    Verify user has access to req.url / controller / your-busines-logic
    Return the user if it has access to req.url / controller / your-busines-logic
    */
    return user // return the accessResult
    /*
    Or return falsy
    */
  }
}

```
 - When the resut is [falsy](https://developer.mozilla.org/en-US/docs/Glossary/Falsy): statusCode = 401, body = serverConfig.default401, no controller instance created.

### Logger
 - Component name: `logger`
 - Interface: `LoggerInterface`
 - **Default behavior: log to console**

## Roadmap
 - Verbose information
 - CircleCI integration
 - Example projects `TypeScript / JavaScript`
 - Integration test

