export interface AnalyzeProgressStep {
  id: string;
  message: string;
  detail: string | null;
}

/** Main pipeline rows always visible during analyze. */
export const MAIN_PIPELINE_STEP_COUNT = 5;

/** Sub-steps under "Preparing your dashboard" (indices 5–12). */
export const DASHBOARD_SUB_STEP_START = 5;
export const DASHBOARD_SUB_STEP_END = 12;

/** Fixed pipeline — shown upfront; ticks advance one step at a time. */
export const ANALYZE_PIPELINE_STEPS: readonly AnalyzeProgressStep[] = [
  { id: 'upload', message: 'Uploading your statements', detail: null },
  { id: 'extract', message: 'Extracting data from your files', detail: null },
  { id: 'json', message: 'Structuring transactions and totals', detail: null },
  { id: 'amounts', message: 'Calculating sales, fees, and bank totals', detail: null },
  { id: 'reconcile', message: 'Matching payouts to bank deposits', detail: null },
  { id: 'validate', message: 'Reviewing your statement quality', detail: null },
  { id: 'breakdown', message: 'Breaking down sales by channel', detail: null },
  { id: 'insights', message: 'Finding highlights in your month', detail: null },
  { id: 'tabs', message: 'Building your reconciliation view', detail: null },
  { id: 'kpis', message: 'Calculating cash flow and KPIs', detail: null },
  { id: 'finalize', message: 'Polishing report sections', detail: null },
  { id: 'letter', message: 'Drafting your AT Letter', detail: null },
  { id: 'save', message: 'Saving to your account', detail: null },
  { id: 'done', message: 'Opening your dashboard…', detail: null },
] as const;

export interface AnalyzeProgressState {
  steps: AnalyzeProgressStep[];
  /** @deprecated use targetIndex — kept for compatibility */
  activeIndex: number;
  /** Furthest pipeline stage the server has confirmed (0-based). Steps before this show ✓. */
  targetIndex: number;
  /** Server sent complete — overlay dismisses after a short hold. */
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
  /** camelCase alias some serializers emit */
  statementId?: string | null;
  /** True when analysis finished but DB save failed — client should recover via GET /api/reports. */
  persist_failed?: boolean;
  result?: unknown;
}

const STAGE_TO_PIPELINE_INDEX: Record<string, number> = {
  start: 0,
  upload: 0,
  read: 1,
  extract: 1,
  parse: 1,
  json: 2,
  structure: 2,
  roles: 2,
  amounts: 3,
  reconcile: 4,
  validate: 5,
  views: 5,
  vocabulary: 5,
  breakdown: 6,
  insights: 7,
  tabs: 8,
  kpis: 9,
  finalize: 10,
  letter: 11,
  save: 12,
  done: 13,
  complete: 13,
};

/** Upload + wait for first SSE byte (multipart read on server before stream starts). */
export const ANALYZE_CONNECT_TIMEOUT_MS = import.meta.env.PROD ? 180_000 : 60_000;
/** Idle timeout while reading SSE after response headers (resets on each event/chunk). */
export const ANALYZE_STREAM_TIMEOUT_MS = import.meta.env.PROD ? 480_000 : 180_000;
/** @deprecated use ANALYZE_STREAM_TIMEOUT_MS for stream reads */
export const ANALYZE_TIMEOUT_MS = ANALYZE_STREAM_TIMEOUT_MS;

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
  const steps = prev.steps.map((step, index) => {
    const msg =
      typeof event.message === 'string' && event.message.trim().length > 0
        ? event.message.trim()
        : null;
    if (index === target) {
      return {
        ...step,
        ...(detail ? { detail } : {}),
        ...(msg ? { message: msg } : {}),
      };
    }
    return step;
  });
  const complete = prev.complete || event.stage === 'complete';
  if (event.stage === 'complete') {
    target = last;
  }
  return {
    steps,
    activeIndex: target,
    targetIndex: target,
    complete,
  };
}

export function isPipelineDisplayComplete(prev: AnalyzeProgressState): boolean {
  return prev.complete;
}

/** Live sub-status while the dashboard build phase runs (shown under "Preparing your dashboard"). */
export function dashboardLiveDetail(progress: AnalyzeProgressState): string | null {
  const liveIndex = Math.min(progress.targetIndex, DASHBOARD_SUB_STEP_END);
  if (liveIndex < DASHBOARD_SUB_STEP_START) return null;
  const step = progress.steps[liveIndex];
  if (!step) return null;
  return step.detail?.trim() || step.message;
}

export const PIPELINE_DONE_HOLD_MS = 400;

/** Fallback timeline when /api/analyze/stream is unavailable. */
export function buildFallbackPipelineEvents(): AnalyzeProgressEvent[] {
  return [
    { stage: 'upload' },
    { stage: 'extract' },
    { stage: 'json' },
    { stage: 'amounts' },
    { stage: 'reconcile' },
    { stage: 'validate' },
    { stage: 'breakdown' },
    { stage: 'insights' },
    { stage: 'tabs' },
    { stage: 'kpis' },
    { stage: 'finalize' },
    { stage: 'letter' },
    { stage: 'save' },
    { stage: 'done' },
  ];
}

/** Interval for classic POST fallback — advance one step while the server works. */
export const CLASSIC_PIPELINE_STEP_MS = 3_500;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
