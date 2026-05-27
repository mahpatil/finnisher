import { type LaunchCriterion } from './schema.js';
export declare function getLaunchCriteria(threadId: string): LaunchCriterion[];
export declare function addLaunchCriterion(threadId: string, text: string): LaunchCriterion;
export declare function toggleLaunchCriterion(id: string, checked: boolean): void;
export declare function deleteLaunchCriterion(id: string): void;
export declare function isLaunchReady(threadId: string): boolean;
//# sourceMappingURL=launchCriteria.d.ts.map