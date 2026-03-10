import type { BuildResult, GelPlan, PlatePlan } from './types';

const escapeCsv = (value: string): string => {
  if (/[,"\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const downloadText = (filename: string, content: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
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

const exportElementToPng = async (element: HTMLElement, fileName: string): Promise<void> => {
  const cloned = element.cloneNode(true) as HTMLElement;
  cloned.style.margin = '0';

  const width = Math.ceil(element.scrollWidth || element.clientWidth);
  const height = Math.ceil(element.scrollHeight || element.clientHeight);

  const wrapper = document.createElement('div');
  wrapper.style.background = '#ffffff';
  wrapper.style.padding = '8px';
  wrapper.style.width = `${width}px`;
  wrapper.appendChild(cloned);

  const data = new XMLSerializer().serializeToString(wrapper);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width + 16}" height="${height + 16}"><foreignObject width="100%" height="100%">${data}</foreignObject></svg>`;

  const image = new Image();
  image.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('PNG変換に失敗しました'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

  const canvas = document.createElement('canvas');
  canvas.width = width + 16;
  canvas.height = height + 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas描画に失敗しました');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);

  const pngUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = pngUrl;
  a.download = fileName;
  a.click();
};

export const exportPlateCsv = (result: BuildResult): void => {
  downloadText('plate_layout.csv', createPlateLayoutCsv(result.plates), 'text/csv;charset=utf-8;');
};

export const exportGelCsv = (result: BuildResult): void => {
  downloadText('gel_layout.csv', createGelLayoutCsv(result.gels), 'text/csv;charset=utf-8;');
};

export const exportPlatePng = async (
  result: BuildResult,
  plateElements: Map<number, HTMLElement>,
): Promise<void> => {
  for (const plate of result.plates) {
    const element = plateElements.get(plate.plateNumber);
    if (element) {
      await exportElementToPng(element, `plate${plate.plateNumber}.png`);
    }
  }
};

export const exportGelPng = async (result: BuildResult, gelElements: Map<number, HTMLElement>): Promise<void> => {
  for (const gel of result.gels) {
    const element = gelElements.get(gel.gelNumber);
    if (element) {
      await exportElementToPng(element, `gel${gel.gelNumber}.png`);
    }
  }
};
