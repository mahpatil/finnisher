import { type Thread, type NewThread, type ThreadState } from './schema.js';
export type WarningLevel = 'caution' | 'urgent';
export interface FocusWarning {
    level: WarningLevel;
    count: number;
    message: string;
    suggestions: Thread[];
}
export declare function listThreads(): Thread[];
export declare function getThread(id: string): Thread | undefined;
export declare function createThread(input: Omit<NewThread, 'id' | 'createdAt' | 'updatedAt'>): Thread;
export declare function updateNextAction(id: string, nextAction: string): void;
export declare function updateState(id: string, state: ThreadState): void;
export declare function updateMomentum(id: string, momentum: number): void;
export declare function setStalled(id: string, stalled: boolean): void;
export declare function findThreadIdByFolderName(folderName: string): string | null;
export declare function touchThread(id: string): void;
export declare function deleteThread(id: string): void;
export declare function isStalled(thread: Thread): boolean;
export declare function activeThreadCount(): number;
export declare function overloadWarning(allThreads: Thread[]): FocusWarning | null;
//# sourceMappingURL=threads.d.ts.map