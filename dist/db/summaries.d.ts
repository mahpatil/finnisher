import type { Thread } from './schema.js';
export interface WeekSummary {
    from: Date;
    to: Date;
    threadsClosed: number;
    sessionCount: number;
    totalHours: number;
    totalCostUsd: number;
    todosDone: number;
    todosTotal: number;
    closestToDone: Thread[];
    stalled: Thread[];
    motivationalLine: string;
}
export declare function weekSummary(from: Date, to: Date): WeekSummary;
export declare function daySummary(): WeekSummary;
//# sourceMappingURL=summaries.d.ts.map