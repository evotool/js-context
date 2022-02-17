import { createHook, executionAsyncId } from 'async_hooks';
import { randomBytes } from 'crypto';

export class Context {
  private static readonly _contexts = new Map<number, Context>();
  private static _inited: boolean = false;

  [key: string]: any;

  constructor(
    readonly asyncId: number = executionAsyncId(),
    readonly traceId: string = Context.generateTraceId(),
  ) {}

  static generateTraceId = (): string => randomBytes(4).toString('hex');

  static has(asyncId: number = executionAsyncId()): boolean {
    return this._contexts.has(asyncId);
  }

  static get(): Context {
    const asyncId = executionAsyncId();
    const context = this._contexts.get(asyncId);

    if (!context) {
      throw new Error('Context not found');
    }

    return context;
  }

  static set(context: Context): Context {
    const asyncId = executionAsyncId();

    this._contexts.set(asyncId, context);

    return context;
  }

  private static init(rootAsyncId: number = executionAsyncId()): void {
    if (this._inited) {
      return;
    }

    this._inited = true;

    createHook({
      init: (asyncId: number, _: any, parentAsyncId: number) => {
        if (!this._contexts.has(parentAsyncId) || rootAsyncId === parentAsyncId) {
          return;
        }

        const context = this._contexts.get(parentAsyncId)!;
        this._contexts.set(asyncId, context);
      },
      destroy: (asyncId: number) => {
        this._contexts.delete(asyncId);
      },
    }).enable();
  }
}

// @ts-ignore
Context.init();
