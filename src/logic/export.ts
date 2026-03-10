import { STEP_COLOR_MAP } from './stepColors';
import type { BuildResult, GelPlan, PlatePlan, WellEntry } from './types';

const downloadText = (filename: string, content: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const downloadPng = (fileName: string, canvas: HTMLCanvasElement): void => {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = fileName;
  a.click();
};

const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const cols = Array.from({ length: 12 }, (_, i) => i + 1);

const toSampleNameOnly = (entry: WellEntry | null): string => (entry ? entry.sampleName : '');

const escapeCsvCell = (value: string): string => {
  if (/[,"\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const drawWrappedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void => {
  if (!text) {
    return;
  }

  const words = text.split(' ');
  let line = '';
  let lineY = y;

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  });

  if (line) {
    ctx.fillText(line, x, lineY);
  }
};

const createPlateCanvas = (plate: PlatePlan): HTMLCanvasElement => {
  const cellW = 160;
  const cellH = 44;
  const rowHeaderW = 44;
  const titleH = 34;
  const canvas = document.createElement('canvas');
  canvas.width = rowHeaderW + cols.length * cellW;
  canvas.height = titleH + (rows.length + 1) * cellH;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context取得失敗');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 18px Arial';
  ctx.fillText(`Plate ${plate.plateNumber}`, 8, 23);

  const tableY = titleH;

  ctx.font = '12px Arial';
  cols.forEach((col, i) => {
    const x = rowHeaderW + i * cellW;
    ctx.strokeStyle = '#d0d5dd';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, tableY, cellW, cellH);
    ctx.fillStyle = '#111827';
    ctx.fillText(String(col), x + 6, tableY + 16);
  });

  rows.forEach((row, rowIndex) => {
    const y = tableY + (rowIndex + 1) * cellH;
    ctx.strokeStyle = '#d0d5dd';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, y, rowHeaderW, cellH);
    ctx.fillStyle = '#111827';
    ctx.fillText(row, 12, y + 16);

    cols.forEach((col, colIndex) => {
      const x = rowHeaderW + colIndex * cellW;
      const entry = plate.wells[`${row}${col}`] ?? null;
      const sampleName = toSampleNameOnly(entry);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, cellW, cellH);
      ctx.strokeStyle = '#d0d5dd';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellW, cellH);

      if (entry) {
        ctx.strokeStyle = STEP_COLOR_MAP[entry.step].border;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, cellW - 2, cellH - 2);
      }

      ctx.fillStyle = '#111827';
      ctx.font = '12px Arial';
      drawWrappedText(ctx, sampleName, x + 4, y + 16, cellW - 8, 13);
    });
  });

  return canvas;
};

const laneStep = (lane: GelPlan['lanes'][number]): WellEntry['step'] | null => {
  if (lane.type !== 'sample') {
    return null;
  }
  const local = lane.localNumber;
  if (local <= 16) {
    return local % 2 === 1 ? 'Step1' : 'Step2';
  }
  return local % 2 === 1 ? 'Step3' : 'Step4';
};

const createGelCanvas = (gel: GelPlan): HTMLCanvasElement => {
  const laneW = 130;
  const laneH = 48;
  const titleH = 32;
  const canvas = document.createElement('canvas');
  canvas.width = 24 * laneW;
  canvas.height = titleH + laneH * 2;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context取得失敗');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 18px Arial';
  ctx.fillText(`Gel ${gel.gelNumber}`, 8, 22);

  const labelY = titleH;
  const contentY = titleH + laneH;

  for (let lane = 1; lane <= 24; lane++) {
    const x = (lane - 1) * laneW;
    const laneEntry = gel.lanes[lane - 1];
    const step = laneStep(laneEntry);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, labelY, laneW, laneH);
    ctx.strokeStyle = '#d0d5dd';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, labelY, laneW, laneH);

    ctx.fillStyle = step ? STEP_COLOR_MAP[step].background : '#ffffff';
    ctx.fillRect(x, contentY, laneW, laneH);
    ctx.strokeStyle = '#d0d5dd';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, contentY, laneW, laneH);

    if (step) {
      ctx.strokeStyle = STEP_COLOR_MAP[step].border;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, contentY + 1, laneW - 2, laneH - 2);
    }

    ctx.fillStyle = '#111827';
    ctx.font = '12px Arial';
    ctx.fillText(`Lane ${lane}`, x + 6, labelY + 18);

    const sampleName = laneEntry.type === 'sample' ? laneEntry.sampleName : '';
    ctx.font = '12px Arial';
    drawWrappedText(ctx, sampleName, x + 4, contentY + 16, laneW - 8, 13);
  }

  return canvas;
};

export const exportPlateCsv = (result: BuildResult): void => {
  result.plates.forEach((plate) => {
    const lines: string[] = [];
    lines.push(`Plate ${plate.plateNumber}`);
    lines.push(['', ...cols.map((col) => String(col))].join(','));

    rows.forEach((row) => {
      const cells = cols.map((col) => escapeCsvCell(toSampleNameOnly(plate.wells[`${row}${col}`] ?? null)));
      lines.push([row, ...cells].join(','));
    });

    downloadText(`plate${plate.plateNumber}.csv`, lines.join('\n'), 'text/csv;charset=utf-8;');
  });
};

export const exportGelCsv = (result: BuildResult): void => {
  result.gels.forEach((gel) => {
    const lines: string[] = [];
    lines.push(`Gel ${gel.gelNumber}`);
    lines.push(Array.from({ length: 24 }, (_, i) => `${i + 1}`).join(','));

    const contents = gel.lanes.map((lane) => escapeCsvCell(lane.type === 'sample' ? lane.sampleName : ''));
    lines.push(contents.join(','));
    downloadText(`gel${gel.gelNumber}.csv`, lines.join('\n'), 'text/csv;charset=utf-8;');
  });
};

export const exportPlatePng = async (result: BuildResult): Promise<void> => {
  for (const plate of result.plates) {
    const canvas = createPlateCanvas(plate);
    downloadPng(`plate${plate.plateNumber}.png`, canvas);
  }
};

export const exportGelPng = async (result: BuildResult): Promise<void> => {
  for (const gel of result.gels) {
    const canvas = createGelCanvas(gel);
    downloadPng(`gel${gel.gelNumber}.png`, canvas);
  }
};
