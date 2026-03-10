export type MarkerPlacement = 'both' | 'left' | 'right' | 'none';

export type LaneEntry =
  | { type: 'marker'; label: 'Marker' }
  | { type: 'sample'; sampleName: string; localNumber: number }
  | { type: 'empty' };

export interface GelPlan {
  gelNumber: number;
  samples: string[];
  lanes: LaneEntry[];
  applySteps: {
    step1: number[];
    step2: number[];
    step3: number[];
    step4: number[];
  };
}

export interface WellEntry {
  sampleName: string;
  gelNumber: number;
  localNumber: number;
  step: 'Step1' | 'Step2' | 'Step3' | 'Step4';
}

export interface PlatePlan {
  plateNumber: number;
  wells: Record<string, WellEntry | null>;
}

export interface BuildResult {
  gels: GelPlan[];
  plates: PlatePlan[];
  sampleCount: number;
}
