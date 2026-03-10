import type { BuildResult, GelPlan, LaneEntry, MarkerPlacement, PlatePlan, WellEntry } from './types';

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const COLS = Array.from({ length: 12 }, (_, i) => i + 1);

const markerCapacityMap: Record<MarkerPlacement, number> = {
  both: 22,
  left: 23,
  right: 23,
  none: 24,
};

export const getGelCapacity = (placement: MarkerPlacement): number => markerCapacityMap[placement];

export const parseSampleText = (text: string): string[] => {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(',')[0].trim())
    .filter((line) => line.length > 0);
};

const splitIntoChunks = <T,>(items: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};

const buildApplyStepNumbers = (maxLocalNumber: number): GelPlan['applySteps'] => {
  const step1 = rangeFilter(maxLocalNumber, 1, (n) => n <= 16 && n % 2 === 1);
  const step2 = rangeFilter(maxLocalNumber, 1, (n) => n <= 16 && n % 2 === 0);
  const step3 = rangeFilter(maxLocalNumber, 17, (n) => n % 2 === 1);
  const step4 = rangeFilter(maxLocalNumber, 17, (n) => n % 2 === 0);
  return { step1, step2, step3, step4 };
};

const rangeFilter = (max: number, start: number, predicate: (n: number) => boolean): number[] => {
  const result: number[] = [];
  for (let n = start; n <= max; n++) {
    if (predicate(n)) {
      result.push(n);
    }
  }
  return result;
};

const buildGelLanes = (samples: string[], markerPlacement: MarkerPlacement): LaneEntry[] => {
  const lanes: LaneEntry[] = Array.from({ length: 24 }, () => ({ type: 'empty' }));

  if (markerPlacement === 'both' || markerPlacement === 'left') {
    lanes[0] = { type: 'marker', label: 'Marker' };
  }
  if (markerPlacement === 'both' || markerPlacement === 'right') {
    lanes[23] = { type: 'marker', label: 'Marker' };
  }

  let localNumber = 1;
  for (let i = 0; i < lanes.length; i++) {
    if (lanes[i].type === 'empty' && localNumber <= samples.length) {
      lanes[i] = {
        type: 'sample',
        sampleName: samples[localNumber - 1],
        localNumber,
      };
      localNumber += 1;
    }
  }

  return lanes;
};

const localNumberToStep = (localNumber: number): WellEntry['step'] => {
  if (localNumber <= 16) {
    return localNumber % 2 === 1 ? 'Step1' : 'Step2';
  }
  return localNumber % 2 === 1 ? 'Step3' : 'Step4';
};

export const buildPlan = (sampleNames: string[], markerPlacement: MarkerPlacement): BuildResult => {
  const capacity = getGelCapacity(markerPlacement);
  const gelChunks = splitIntoChunks(sampleNames, capacity);

  const gels = gelChunks.map((samples, index): GelPlan => {
    const gelNumber = index + 1;
    const lanes = buildGelLanes(samples, markerPlacement);
    const applySteps = buildApplyStepNumbers(samples.length);

    return {
      gelNumber,
      samples,
      lanes,
      applySteps,
    };
  });

  const plates = buildPlates(gels);

  return {
    gels,
    plates,
    sampleCount: sampleNames.length,
  };
};

const getWellId = (rowIndex: number, col: number): string => `${ROWS[rowIndex]}${col}`;

const assignSamplesToPlateColumns = (
  wells: Record<string, WellEntry | null>,
  gel: GelPlan,
  columnStart: number,
): void => {
  const numberToSample = new Map<number, string>();
  gel.lanes.forEach((lane) => {
    if (lane.type === 'sample') {
      numberToSample.set(lane.localNumber, lane.sampleName);
    }
  });

  const assignments: { numbers: number[]; col: number; step: WellEntry['step'] }[] = [
    { numbers: gel.applySteps.step1, col: columnStart, step: 'Step1' },
    { numbers: gel.applySteps.step2, col: columnStart + 1, step: 'Step2' },
    { numbers: [...gel.applySteps.step3, ...gel.applySteps.step4], col: columnStart + 2, step: 'Step3' },
  ];

  assignments.forEach(({ numbers, col, step }) => {
    numbers.forEach((localNumber, rowIndex) => {
      if (rowIndex > 7) {
        return;
      }
      const sampleName = numberToSample.get(localNumber);
      if (!sampleName) {
        return;
      }
      wells[getWellId(rowIndex, col)] = {
        sampleName,
        gelNumber: gel.gelNumber,
        localNumber,
        step: localNumber >= 17 && step === 'Step3' ? localNumberToStep(localNumber) : step,
      };
    });
  });
};

const buildPlates = (gels: GelPlan[]): PlatePlan[] => {
  const plateChunks = splitIntoChunks(gels, 4);

  return plateChunks.map((gelGroup, plateIndex): PlatePlan => {
    const wells: Record<string, WellEntry | null> = {};
    for (const row of ROWS) {
      for (const col of COLS) {
        wells[`${row}${col}`] = null;
      }
    }

    gelGroup.forEach((gel, gelIndexInPlate) => {
      const colStart = gelIndexInPlate * 3 + 1;
      assignSamplesToPlateColumns(wells, gel, colStart);
    });

    return {
      plateNumber: plateIndex + 1,
      wells,
    };
  });
};

export const detectDuplicates = (samples: string[]): string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  samples.forEach((sample) => {
    if (seen.has(sample)) {
      duplicates.add(sample);
    }
    seen.add(sample);
  });
  return [...duplicates];
};
