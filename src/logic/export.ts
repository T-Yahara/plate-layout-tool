import type { BuildResult, GelPlan, PlatePlan } from './types';

const escapeCsv = (value: string): string => {
  if (/[,"\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const downloadFile = (filename: string, content: string, mimeType: string): void => {
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

const buildPrintWindow = (title: string, bodyHtml: string): void => {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
  if (!popup) {
    return;
  }

  popup.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 12px; }
          h1, h2 { margin: 8px 0; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
          th, td { border: 1px solid #9ca3af; padding: 4px; font-size: 12px; vertical-align: top; }
          .marker { background: #fff7ed; }
          .empty { color: #9ca3af; }
          .small { font-size: 11px; color: #475467; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${bodyHtml}
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
};

const plateToHtml = (result: BuildResult): string => {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const cols = Array.from({ length: 12 }, (_, i) => i + 1);

  return result.plates
    .map((plate) => {
      const tableRows = rows
        .map((row) => {
          const cells = cols
            .map((col) => {
              const entry = plate.wells[`${row}${col}`];
              if (!entry) {
                return '<td class="empty">-</td>';
              }
              return `<td><div class="small">${entry.step} / G${entry.gelNumber}#${entry.localNumber}</div><div>${entry.sampleName}</div></td>`;
            })
            .join('');
          return `<tr><th>${row}</th>${cells}</tr>`;
        })
        .join('');

      const header = cols.map((col) => `<th>${col}</th>`).join('');
      return `<h2>Plate ${plate.plateNumber}</h2><table><thead><tr><th></th>${header}</tr></thead><tbody>${tableRows}</tbody></table>`;
    })
    .join('');
};

const gelToHtml = (result: BuildResult): string => {
  return result.gels
    .map((gel) => {
      const laneHeader = Array.from({ length: 24 }, (_, i) => `<th>${i + 1}</th>`).join('');
      const laneRow = gel.lanes
        .map((lane) => {
          if (lane.type === 'marker') {
            return '<td class="marker">Marker</td>';
          }
          if (lane.type === 'sample') {
            return `<td><div class="small">#${lane.localNumber}</div><div>${lane.sampleName}</div></td>`;
          }
          return '<td class="empty">-</td>';
        })
        .join('');
      return `<h2>Gel ${gel.gelNumber}</h2><table><thead><tr>${laneHeader}</tr></thead><tbody><tr>${laneRow}</tr></tbody></table>`;
    })
    .join('');
};

export const exportPlateCsv = (result: BuildResult): void => {
  downloadFile('plate_layout.csv', createPlateLayoutCsv(result.plates), 'text/csv;charset=utf-8;');
};

export const exportGelCsv = (result: BuildResult): void => {
  downloadFile('gel_layout.csv', createGelLayoutCsv(result.gels), 'text/csv;charset=utf-8;');
};

export const exportPlatePdf = (result: BuildResult): void => {
  buildPrintWindow('96well layout', plateToHtml(result));
};

export const exportGelPdf = (result: BuildResult): void => {
  buildPrintWindow('24well gel layout', gelToHtml(result));
};
