import type { ThreadTodo } from './schema.js';
export declare function createTodo(threadId: string, text: string): ThreadTodo;
export declare function listTodos(threadId: string): ThreadTodo[];
export declare function updateTodo(id: string, patch: {
    done?: boolean;
    text?: string;
}): ThreadTodo;
export declare function deleteTodo(id: string): void;
export declare function listTodoCounts(threadIds: string[]): Record<string, {
    done: number;
    total: number;
}>;
//# sourceMappingURL=todos.d.ts.map