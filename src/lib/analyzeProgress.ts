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
}

/** One SSE event from POST /api/analyze/stream */
export interface AnalyzeProgressEvent {
  stage: string;
  message?: string;
  detail?: string | null;
  files?: string[];
  status?: number;
  result?: unknown;
}

const STAGE_TO_PIPELINE_INDEX: Record<string, number> = {
  upload: 0,
  start: 0,
  read: 1,
  extract: 1,
  parse: 1,
  json: 2,
  structure: 2,
  roles: 2,
  amounts: 3,
  reconcile: 4,
  views: 5,
  vocabulary: 5,
  save: 5,
  done: 5,
  complete: 5,
};

export function pipelineIndexForStage(stage: string): number {
  return STAGE_TO_PIPELINE_INDEX[stage] ?? 0;
}

export function buildInitialAnalyzeProgress(): AnalyzeProgressState {
  return {
    steps: ANALYZE_PIPELINE_STEPS.map((s) => ({ ...s })),
    activeIndex: 0,
    targetIndex: 0,
  };
}

/** Map a server event to the furthest pipeline step it implies. */
export function applyPipelineEvent(
  prev: AnalyzeProgressState,
  event: AnalyzeProgressEvent,
): AnalyzeProgressState {
  let target = Math.max(prev.targetIndex, pipelineIndexForStage(event.stage));
  const detail =
    typeof event.detail === 'string' && event.detail.trim().length > 0
      ? event.detail.trim()
      : null;
  const steps = prev.steps.map((step, index) =>
    index === target && detail ? { ...step, detail } : step,
  );
  const last = prev.steps.length - 1;
  let activeIndex = prev.activeIndex;
  if (event.stage === 'views' || event.stage === 'complete') {
    activeIndex = Math.max(activeIndex, target);
  }
  if (event.stage === 'complete') {
    activeIndex = last + 1;
    target = last;
  }
  return { steps, activeIndex, targetIndex: target };
}

/** Advance visual progress by one completed step (call on a timer). */
export function tickPipelineForward(prev: AnalyzeProgressState): AnalyzeProgressState | null {
  if (prev.activeIndex >= prev.targetIndex) {
    return null;
  }
  return { ...prev, activeIndex: prev.activeIndex + 1 };
}

export const PIPELINE_TICK_MS = 550;

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
