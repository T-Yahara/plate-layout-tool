import { STEP_COLOR_MAP } from '../logic/stepColors';
import type { PlatePlan } from '../logic/types';

const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const cols = Array.from({ length: 12 }, (_, i) => i + 1);

interface Props {
  plate: PlatePlan;
  disabledIds: Set<string>;
  onToggleWell: (wellId: string) => void;
  onToggleRow: (plateNumber: number, row: string) => void;
  onToggleColumn: (plateNumber: number, col: number) => void;
  onToggleGroupStep: (plateNumber: number, group: 1 | 2 | 3 | 4, step: 1 | 2 | 3 | 4) => void;
}

const toPlateWellId = (plateNumber: number, well: string): string => `P${plateNumber}_${well}`;

export function PlateLayoutCard({
  plate,
  disabledIds,
  onToggleWell,
  onToggleRow,
  onToggleColumn,
  onToggleGroupStep
}: Props) {
  return (
    <section className="card">
      <h3>Plate {plate.plateNumber}</h3>

      <div className="group-step-row" title="G{group}-{step}: Gelグループ単位のStepトグル">
        {([1, 2, 3, 4] as const).map((group) =>
          ([1, 2, 3, 4] as const).map((step) => (
            <button
              key={`G${group}-${step}`}
              type="button"
              className="group-step-btn"
              onClick={() => onToggleGroupStep(plate.plateNumber, group, step)}
            >
              G{group}-{step}
            </button>
          )),
        )}
      </div>

      <div className="plate-table-wrap">
        <table className="plate-table">
          <thead>
            <tr>
              <th></th>
              {cols.map((col) => (
                <th key={col}>
                  <button type="button" className="axis-toggle" onClick={() => onToggleColumn(plate.plateNumber, col)}>
                    {col}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row}>
                <th>
                  <button type="button" className="axis-toggle" onClick={() => onToggleRow(plate.plateNumber, row)}>
                    {row}
                  </button>
                </th>
                {cols.map((col) => {
                  const rawWellId = `${row}${col}`;
                  const wellId = toPlateWellId(plate.plateNumber, rawWellId);
                  const entry = plate.wells[rawWellId];
                  const isDisabled = disabledIds.has(wellId);

                  return (
                    <td
                      key={wellId}
                      className={isDisabled ? 'is-disabled' : ''}
                      onClick={() => onToggleWell(wellId)}
                      style={entry ? { borderColor: STEP_COLOR_MAP[entry.step].border } : undefined}
                      title={entry ? `${entry.sampleName} (${entry.step})` : ''}
                    >
                      {entry ? (
                        <div className="well-cell">
                          <small>{entry.step}</small>
                          <small>G{entry.gelNumber}#{entry.localNumber}</small>
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
