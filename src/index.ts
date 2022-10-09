import { createHook, executionAsyncId } from 'async_hooks';
import { randomBytes } from 'crypto';

export class Context<T extends {} = ContextPayload> {
  private static readonly _contexts: Record<number, Context> = {};
  private static _inited: boolean = false;

  static generateTraceId = (): string => randomBytes(4).toString('hex');

  readonly payload: Partial<T>;
  readonly asyncId: number;
  readonly traceId: string;

  constructor(args: ContextArgs<T>) {
    this.payload = args.payload ?? {};
    this.asyncId = args.asyncId || executionAsyncId();
    this.traceId = args.traceId || Context.generateTraceId();
  }

  static has(asyncId: number = executionAsyncId()): boolean {
    return asyncId in this._contexts;
  }

  static get<T extends {} = ContextPayload>(asyncId = executionAsyncId()): Context<T> | undefined {
    const context = this._contexts[asyncId];

    return context;
  }

  static set<T extends {} = ContextPayload>(context: Context<T>): Context<T> {
    const asyncId = executionAsyncId();

    this._contexts[asyncId] = context;

    return context;
  }

  static create<T extends {} = ContextPayload>(args: ContextArgs<T>): Context<T> {
    return this.set(new Context<T>(args));
  }

  private static _init(rootAsyncId: number = executionAsyncId()): void {
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
Context._init();

export interface ContextArgs<T> {
  payload?: Partial<T>;
  asyncId?: number;
  traceId?: string;
}

declare global {
  interface ContextPayload {}
}
