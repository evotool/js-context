import { createHook, executionAsyncId } from 'async_hooks';
import { randomBytes } from 'crypto';

export class Context<T extends {} = {}> {
  private static readonly _contexts: Record<number, Context> = {};
  private static _inited: boolean = false;

  constructor(
    readonly asyncId: number = executionAsyncId(),
    readonly traceId: string = Context.generateTraceId(),
    readonly payload: Partial<T> = {},
  ) {}

  static generateTraceId = (): string => randomBytes(4).toString('hex');

  static has(asyncId: number = executionAsyncId()): boolean {
    return asyncId in this._contexts;
  }

  static get<T extends {} = {}>(): Context<T> {
    const asyncId = executionAsyncId();
    const context = this._contexts[asyncId];

    if (!context) {
      throw new Error('Context not found');
    }

    return context;
  }

  static set<T extends {}>(context: Context<T>): Context<T> {
    const asyncId = executionAsyncId();

    this._contexts[asyncId] = context;

    return context;
  }

  private static init(rootAsyncId: number = executionAsyncId()): void {
    if (this._inited) {
      return;
    }

    this._inited = true;

    createHook({
      init: (asyncId: number, _: any, parentAsyncId: number) => {
        if (!(parentAsyncId in this._contexts) || rootAsyncId === parentAsyncId) {
          return;
        }

        this._contexts[asyncId] = this._contexts[parentAsyncId];
      },
      destroy: (asyncId: number) => {
        delete this._contexts[asyncId];
      },
    }).enable();
  }
}

// @ts-ignore
Context.init();
