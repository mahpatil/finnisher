export interface GitState {
    gitBranch: string | null;
    lastCommitSha: string | null;
    lastCommitMsg: string | null;
    unpushedCount: number | null;
}
export declare function captureGitState(cwd: string): GitState;
export declare function appendHookLog(message: string): void;
export declare function normaliseGithubUrl(raw: string): string | null;
export declare function getGithubUrl(cwd: string): string | null;
export declare function getFolderName(projectPath: string | null | undefined): string | null;
export interface UsageMetrics {
    tokensIn: number | null;
    tokensOut: number | null;
    costUsd: number | null;
}
export declare function extractUsageMetrics(text: string): UsageMetrics;
export type EffortType = 'debugging' | 'feature' | 'refactor' | 'documentation' | 'validation';
export declare function detectEffortType(text: string): EffortType;
export declare function getThreadId(cwd?: string): string | null;
export declare function findThreadIdByGithubUrl(githubUrl: string): string | null;
export declare function ensureThreadId(cwd?: string): string | null;
//# sourceMappingURL=common.d.ts.map