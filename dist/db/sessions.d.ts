import { type Session, type NewSession } from './schema.js';
export declare function createSession(input: Omit<NewSession, 'id'>): Session;
export declare function closeSession(id: string, data: Partial<NewSession>): void;
export declare function listSessions(opts?: {
    threadId?: string;
    githubUrl?: string;
    folderName?: string;
    limit?: number;
}): Session[];
export declare function getOpenSessions(): Session[];
export declare function getOpenSessionForPath(projectPath: string): Session | undefined;
export declare function setSessionIntent(id: string, intent: string): void;
export declare function getLatestSessionInfoByThreadIds(threadIds: string[]): Map<string, {
    folderName: string | null;
    githubUrl: string | null;
}>;
export declare function backfillNullThreadSessions(projectPath: string, threadId: string): void;
//# sourceMappingURL=sessions.d.ts.map