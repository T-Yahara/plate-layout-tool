import type { PlatePlan } from '../logic/types';

const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const cols = Array.from({ length: 12 }, (_, i) => i + 1);

interface Props {
  plate: PlatePlan;
}

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
                  return (
                    <td key={wellId} title={entry ? `${entry.sampleName} (${entry.step})` : ''}>
                      {entry ? (
                        <div className="well-cell">
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
