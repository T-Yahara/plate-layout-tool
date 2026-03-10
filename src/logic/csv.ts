import type { BuildResult, GelPlan, PlatePlan } from './types';

const escapeCsv = (value: string): string => {
  if (/[,"\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const download = (filename: string, csv: string): void => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const createGelLayoutCsv = (gels: GelPlan[]): string => {
  const lines: string[] = ['Gel,Lane,Type,LocalNumber,SampleName'];
  gels.forEach((gel) => {
    gel.lanes.forEach((lane, laneIndex) => {
      if (lane.type === 'marker') {
        lines.push([`Gel${gel.gelNumber}`, String(laneIndex + 1), 'Marker', '', 'Marker'].join(','));
      } else if (lane.type === 'sample') {
        lines.push(
          [
            `Gel${gel.gelNumber}`,
            String(laneIndex + 1),
            'Sample',
            String(lane.localNumber),
            escapeCsv(lane.sampleName),
          ].join(','),
        );
      } else {
        lines.push([`Gel${gel.gelNumber}`, String(laneIndex + 1), 'Empty', '', ''].join(','));
      }
    });
  });
  return lines.join('\n');
};

const createApplyStepsCsv = (gels: GelPlan[]): string => {
  const lines: string[] = ['Gel,Step,Order,LocalNumber,SampleName'];
  gels.forEach((gel) => {
    const sampleByLocal = new Map<number, string>();
    gel.lanes.forEach((lane) => {
      if (lane.type === 'sample') {
        sampleByLocal.set(lane.localNumber, lane.sampleName);
      }
    });

    const steps: [string, number[]][] = [
      ['Step1', gel.applySteps.step1],
      ['Step2', gel.applySteps.step2],
      ['Step3', gel.applySteps.step3],
      ['Step4', gel.applySteps.step4],
    ];

    steps.forEach(([stepName, nums]) => {
      nums.forEach((localNumber, idx) => {
        lines.push(
          [
            `Gel${gel.gelNumber}`,
            stepName,
            String(idx + 1),
            String(localNumber),
            escapeCsv(sampleByLocal.get(localNumber) ?? ''),
          ].join(','),
        );
      });
    });
  });

  return lines.join('\n');
};

const createPlateLayoutCsv = (plates: PlatePlan[]): string => {
  const lines: string[] = ['Plate,Well,Gel,Step,LocalNumber,SampleName'];
  plates.forEach((plate) => {
    Object.entries(plate.wells).forEach(([well, entry]) => {
      if (!entry) {
        return;
      }
      lines.push(
        [
          `Plate${plate.plateNumber}`,
          well,
          `Gel${entry.gelNumber}`,
          entry.step,
          String(entry.localNumber),
          escapeCsv(entry.sampleName),
        ].join(','),
      );
    });
  });

  return lines.join('\n');
};

export const downloadCsvFiles = (result: BuildResult): void => {
  download('gel_layout.csv', createGelLayoutCsv(result.gels));
  download('plate_layout.csv', createPlateLayoutCsv(result.plates));
  download('apply_steps.csv', createApplyStepsCsv(result.gels));
};
