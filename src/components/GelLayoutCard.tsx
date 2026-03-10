import { STEP_COLOR_MAP } from '../logic/stepColors';
import type { GelPlan, WellEntry } from '../logic/types';
import { getStepForLocalNumber } from '../logic/planner';

interface Props {
  gel: GelPlan;
  disabledIds: Set<string>;
  onToggleLane: (laneId: string) => void;
  onToggleStep: (gelNumber: number, step: WellEntry['step']) => void;
}

const stepConfigs: { name: WellEntry['step']; key: 'step1' | 'step2' | 'step3' | 'step4' }[] = [
  { name: 'Step1', key: 'step1' },
  { name: 'Step2', key: 'step2' },
  { name: 'Step3', key: 'step3' },
  { name: 'Step4', key: 'step4' },
];

export function GelLayoutCard({ gel, disabledIds, onToggleLane, onToggleStep }: Props) {
  return (
    <section className="card">
      <h3>Gel {gel.gelNumber}</h3>
      <div className="gel-grid-wrap">
        <div className="gel-grid">
          {gel.lanes.map((lane, idx) => {
            const laneId = `G${gel.gelNumber}_L${idx + 1}`;
            const isDisabled = disabledIds.has(laneId);

            if (lane.type === 'sample') {
              const step = getStepForLocalNumber(lane.localNumber);
              const colors = STEP_COLOR_MAP[step];
              return (
                <button
                  key={laneId}
                  type="button"
                  className={`lane lane-button sample ${isDisabled ? 'is-disabled' : ''}`}
                  onClick={() => onToggleLane(laneId)}
                  style={{ background: colors.background, borderColor: colors.border }}
                  title={`${lane.sampleName} (${step})`}
                >
                  <div className="lane-number">Lane {idx + 1}</div>
                  <div className="lane-content" title={lane.sampleName}>
                    <strong>#{lane.localNumber}</strong>
                    <span>{lane.sampleName}</span>
                    <small>{step}</small>
                  </div>
                </button>
              );
            }

            return (
              <button
                key={laneId}
                type="button"
                className={`lane lane-button ${lane.type} ${isDisabled ? 'is-disabled' : ''}`}
                onClick={() => onToggleLane(laneId)}
              >
                <div className="lane-number">Lane {idx + 1}</div>
                {lane.type === 'marker' ? (
                  <div className="lane-content marker-text">Marker</div>
                ) : (
                  <div className="lane-content empty-text">-</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="steps-grid">
        {stepConfigs.map(({ name, key }) => {
          const numbers = gel.applySteps[key];
          return (
            <button
              key={name}
              type="button"
              className="step-toggle"
              onClick={() => onToggleStep(gel.gelNumber, name)}
              style={{ borderColor: STEP_COLOR_MAP[name].border, background: STEP_COLOR_MAP[name].background }}
            >
              <h4>{name}</h4>
              <p>{numbers.length === 0 ? '-' : numbers.join(', ')}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
