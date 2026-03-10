import type { WellEntry } from './types';

export type StepName = WellEntry['step'];

export const STEP_COLOR_MAP: Record<StepName, { border: string; background: string }> = {
  Step1: { border: '#ef4444', background: '#fee2e2' },
  Step2: { border: '#3b82f6', background: '#dbeafe' },
  Step3: { border: '#10b981', background: '#d1fae5' },
  Step4: { border: '#a855f7', background: '#f3e8ff' },
};
