import type { ThreadState } from '../../db/schema.js';
import type { FocusWarning } from '../../db/threads.js';
export declare function stateBadge(state: ThreadState): string;
export declare function stalledBadge(): string;
export declare function durationStr(ms: number): string;
export declare function costStr(usd: number | null): string;
export declare function printFocusWarning(w: FocusWarning): void;
//# sourceMappingURL=format.d.ts.map