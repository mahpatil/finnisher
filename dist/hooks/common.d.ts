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
export declare function getThreadId(cwd?: string): string | null;
export declare function findThreadIdByGithubUrl(githubUrl: string): string | null;
//# sourceMappingURL=common.d.ts.map