import { type Session, type NewSession } from './schema.js';
export declare function createSession(input: Omit<NewSession, 'id'>): Session;
export declare function closeSession(id: string, data: Partial<NewSession>): void;
export declare function listSessions(opts?: {
    threadId?: string;
    githubUrl?: string;
    limit?: number;
}): Session[];
export declare function getOpenSessions(): Session[];
//# sourceMappingURL=sessions.d.ts.map