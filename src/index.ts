import { createHook, executionAsyncId } from 'async_hooks';
import { randomBytes } from 'crypto';

export class AsyncContext<T extends {} = AsyncContextPayload> {
  private static readonly _contexts: Record<number, AsyncContext> = {};
  private static _inited: boolean = false;

  readonly payload: Partial<T>;
  readonly asyncId: number;
  readonly traceId: string;

  constructor(args: AsyncContextArgs<T>) {
    this.payload = args.payload ?? {};
    this.asyncId = args.asyncId || executionAsyncId();
    this.traceId = args.traceId || AsyncContext.generateTraceId();
  }

  static generateTraceId = (): string => randomBytes(4).toString('hex');

  static has(asyncId: number = executionAsyncId()): boolean {
    return asyncId in this._contexts;
  }

  static get<T extends {} = AsyncContextPayload>(
    asyncId: number = executionAsyncId(),
  ): AsyncContext<T> | undefined {
    const context = this._contexts[asyncId];

    return context;
  }

  static set<T extends {} = AsyncContextPayload>(
    context: AsyncContext<T>,
  ): AsyncContext<T> {
    const asyncId = executionAsyncId();

    this._contexts[asyncId] = context;

    return context;
  }

  static create<T extends {} = AsyncContextPayload>(
    args: AsyncContextArgs<T>,
  ): AsyncContext<T> {
    return this.set(new AsyncContext<T>(args));
  }

  private static _init(rootAsyncId: number = executionAsyncId()): void {
    if (this._inited) {
      return;
    }

    this._inited = true;

    createHook({
      init: (asyncId: number, _: any, parentAsyncId: number) => {
        if (
          !(parentAsyncId in this._contexts) ||
          rootAsyncId === parentAsyncId
        ) {
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
AsyncContext._init();

export interface AsyncContextArgs<T> {
  payload?: Partial<T>;
  asyncId?: number;
  traceId?: string;
}

declare global {
  interface AsyncContextPayload {}
}
