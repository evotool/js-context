import { createHook, executionAsyncId } from 'async_hooks';
import { randomBytes } from 'crypto';

export class Context {
	constructor(
		readonly asyncId: number = executionAsyncId(),
		readonly traceId: string = Context.generateTraceId(),
	) {}

	static generateTraceId: () => string = () => randomBytes(4).toString('hex');
}

export class ContextStorage {
	private static instance: ContextStorage;
	private static readonly contexts = new Map<number, Context>();
	private static hookCreated: boolean = false;

	hasContext(): boolean {
		return ContextStorage.hasContext();
	}

	createContext(context: Context = new Context()): Context {
		return ContextStorage.createContext(context);
	}

	getContext(): Context {
		return ContextStorage.getContext();
	}

	static hasContext(asyncId: number = executionAsyncId()): boolean {
		return this.contexts.has(asyncId);
	}

	static createContext(context: Context = new Context()): Context {
		const asyncId = executionAsyncId();

		this.contexts.set(asyncId, context);

		return context;
	}

	static getContext(): Context {
		const asyncId = executionAsyncId();
		const context = this.contexts.get(asyncId);

		if (!context) {
			throw new Error('Context not found');
		}

		return context;
	}

	static init(rootAsyncId: number = executionAsyncId()): void {
		if (this.hookCreated) {
			return;
		}

		this.hookCreated = true;

		createHook({
			init: (asyncId: number, _: any, parentAsyncId: number) => {
				if (!this.contexts.has(parentAsyncId) || rootAsyncId === parentAsyncId) {
					return;
				}

				const context = this.contexts.get(parentAsyncId)!;
				this.contexts.set(asyncId, context);
			},
			destroy: (asyncId: number) => {
				this.contexts.delete(asyncId);
			},
		}).enable();
	}

	static getInstance(): ContextStorage {
		if (!this.instance) {
			this.instance = new ContextStorage();
		}

		return this.instance;
	}
}

ContextStorage.init();
