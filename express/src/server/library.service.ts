import { Injectable } from '@texmex.js/core'
import * as express from 'express'
import * as ws from 'ws'

@Injectable(LibraryService.NAME)
export class LibraryService {
  public static readonly NAME = 'LibraryService'
  public readonly express: () => express.Express = express
  public readonly webSocketServer: () => ws.Server = ws.Server
}
