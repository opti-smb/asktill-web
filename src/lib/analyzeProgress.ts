export interface AnalyzeProgressStep {
  id: string;
  message: string;
  detail: string | null;
}

/** Fixed pipeline — shown upfront; ticks advance one step at a time. */
export const ANALYZE_PIPELINE_STEPS: readonly AnalyzeProgressStep[] = [
  { id: 'upload', message: 'Uploading your statements', detail: null },
  { id: 'extract', message: 'Extracting data from files', detail: null },
  { id: 'json', message: 'Converting to structured JSON', detail: null },
  { id: 'amounts', message: 'Calculating sales, fees, and bank totals', detail: null },
  { id: 'reconcile', message: 'Matching payouts to bank deposits', detail: null },
  { id: 'finish', message: 'Preparing your dashboard', detail: null },
] as const;

export interface AnalyzeProgressState {
  steps: AnalyzeProgressStep[];
  /** Step currently in progress (0-based). Steps before this show ✓. */
  activeIndex: number;
  /** Furthest stage the server has reached (animation catches up one step at a time). */
  targetIndex: number;
  /** Server finished — UI ticks through remaining steps before dismiss. */
  complete: boolean;
}

/** One SSE event from POST /api/analyze/stream */
export interface AnalyzeProgressEvent {
  stage: string;
  message?: string;
  detail?: string | null;
  files?: string[];
  status?: number;
  /** Present on complete when the server saved the statement (preferred over inline result). */
  statement_id?: string | null;
  result?: unknown;
}

const STAGE_TO_PIPELINE_INDEX: Record<string, number> = {
  start: 0,
  upload: 0,
  read: 1,
  extract: 1,
  validate: 1,
  parse: 1,
  json: 2,
  structure: 2,
  roles: 2,
  amounts: 3,
  breakdown: 3,
  reconcile: 4,
  views: 5,
  vocabulary: 5,
  tabs: 5,
  kpis: 5,
  insights: 5,
  finalize: 5,
  save: 5,
  done: 5,
  complete: 5,
};

/** Production Render cold starts + cross-region upload can exceed local dev times. */
export const ANALYZE_CONNECT_TIMEOUT_MS = import.meta.env.PROD ? 120_000 : 45_000;
export const ANALYZE_TIMEOUT_MS = ANALYZE_CONNECT_TIMEOUT_MS;

export function pipelineIndexForStage(stage: string): number {
  return STAGE_TO_PIPELINE_INDEX[stage] ?? 0;
}

export function buildInitialAnalyzeProgress(): AnalyzeProgressState {
  return {
    steps: ANALYZE_PIPELINE_STEPS.map((s) => ({ ...s })),
    activeIndex: 0,
    targetIndex: 0,
    complete: false,
  };
}

/** Map a server event to the furthest pipeline step it implies. */
export function applyPipelineEvent(
  prev: AnalyzeProgressState,
  event: AnalyzeProgressEvent,
): AnalyzeProgressState {
  if (event.stage === 'heartbeat') {
    return prev;
  }
  const last = prev.steps.length - 1;
  let target = Math.max(prev.targetIndex, pipelineIndexForStage(event.stage));
  const detail =
    typeof event.detail === 'string' && event.detail.trim().length > 0
      ? event.detail.trim()
      : null;
  const steps = prev.steps.map((step, index) =>
    index === target && detail ? { ...step, detail } : step,
  );
  const complete = prev.complete || event.stage === 'complete';
  if (event.stage === 'complete') {
    target = last;
  }
  let activeIndex = Math.max(prev.activeIndex, target);
  if (complete) {
    activeIndex = prev.steps.length;
  }
  return {
    steps,
    activeIndex,
    targetIndex: target,
    complete,
  };
}

/** Advance visual progress by one completed step (call on a timer). */
export function tickPipelineForward(prev: AnalyzeProgressState): AnalyzeProgressState | null {
  if (prev.activeIndex < prev.targetIndex) {
    return { ...prev, activeIndex: prev.activeIndex + 1 };
  }
  if (prev.complete && prev.activeIndex < prev.steps.length) {
    return { ...prev, activeIndex: prev.activeIndex + 1 };
  }
  return null;
}

export function shouldRunPipelineTick(prev: AnalyzeProgressState): boolean {
  if (prev.activeIndex < prev.targetIndex) return true;
  if (prev.complete && prev.activeIndex < prev.steps.length) return true;
  return false;
}

export function isPipelineDisplayComplete(prev: AnalyzeProgressState): boolean {
  return prev.complete && prev.activeIndex >= prev.steps.length;
}

export const PIPELINE_TICK_MS = 180;
export const PIPELINE_DONE_HOLD_MS = 280;
/** Gentle step advance when the server is quiet (SSE buffering / cold start). */
export const PIPELINE_ESTIMATE_MS = 2_800;
export const PIPELINE_ESTIMATE_MAX_INDEX = 3;

/** Advance one visual step while waiting for the next server event. */
export function estimatePipelineWhileWaiting(prev: AnalyzeProgressState): AnalyzeProgressState | null {
  if (prev.complete) return null;
  if (prev.activeIndex >= PIPELINE_ESTIMATE_MAX_INDEX) return null;
  if (prev.activeIndex < prev.targetIndex) return null;
  return { ...prev, activeIndex: prev.activeIndex + 1 };
}

/** Fallback timeline when /api/analyze/stream is unavailable. */
export function buildFallbackPipelineEvents(): AnalyzeProgressEvent[] {
  return [
    { stage: 'upload' },
    { stage: 'extract' },
    { stage: 'json' },
    { stage: 'amounts' },
    { stage: 'reconcile' },
    { stage: 'views' },
  ];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
