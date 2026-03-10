import type { CSSProperties } from 'react';
import type { PlatePlan, WellEntry } from '../logic/types';

const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const cols = Array.from({ length: 12 }, (_, i) => i + 1);

interface Props {
  plate: PlatePlan;
}

const stepIndexMap: Record<WellEntry['step'], number> = {
  Step1: 0,
  Step2: 1,
  Step3: 2,
  Step4: 3,
};

const borderColorFor = (entry: WellEntry): string => {
  const hue = (entry.gelNumber * 53 + stepIndexMap[entry.step] * 19) % 360;
  return `hsl(${hue} 85% 45%)`;
};

export function PlateLayoutCard({ plate }: Props) {
  return (
    <section className="card">
      <h3>Plate {plate.plateNumber}</h3>
      <div className="plate-table-wrap">
        <table className="plate-table">
          <thead>
            <tr>
              <th></th>
              {cols.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row}>
                <th>{row}</th>
                {cols.map((col) => {
                  const wellId = `${row}${col}`;
                  const entry = plate.wells[wellId];
                  const cellStyle: CSSProperties | undefined = entry
                    ? { borderColor: borderColorFor(entry) }
                    : undefined;

                  return (
                    <td
                      key={wellId}
                      className={entry ? 'step-border' : ''}
                      style={cellStyle}
                      title={entry ? `${entry.sampleName} (${entry.step})` : ''}
                    >
                      {entry ? (
                        <div className="well-cell">
                          <small>G{entry.gelNumber}#{entry.localNumber} {entry.step}</small>
                          <span>{entry.sampleName}</span>
                        </div>
                      ) : (
                        <span className="empty-text">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
