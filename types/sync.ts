export type SyncEntityType =
  | "workoutSession"
  | "setLog"
  | "routine"
  | "exercise"
  | "bodyWeight";

export type SyncAction = "UPSERT" | "DELETE";

export type SyncStatus = "PENDING" | "SYNCING" | "FAILED";

export interface OutboxSyncItem {
  id: string; // client uuid
  entityType: SyncEntityType;
  entityId: string;
  action: SyncAction;
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  status: SyncStatus;
  lastError?: string;
}

export interface SyncResult {
  success: boolean;
  processedCount: number;
  errors?: unknown;
}

export interface PullSyncResult {
  success: boolean;
  pulledSessions: number;
  pulledSets: number;
  pulledRoutines: number;
  pulledExercises: number;
  pulledBodyWeights: number;
  error?: string;
}

export interface FullSyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  error?: string;
}
