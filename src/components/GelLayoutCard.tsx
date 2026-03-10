import { STEP_COLOR_MAP } from '../logic/stepColors';
import { getStepForLocalNumber } from '../logic/planner';
import type { GelPlan, WellEntry } from '../logic/types';

interface Props {
  gel: GelPlan;
  disabledIds: Set<string>;
  onToggleLane: (laneId: string) => void;
  onToggleStep: (gelNumber: number, step: WellEntry['step']) => void;
  registerGelElement: (gelNumber: number, element: HTMLElement | null) => void;
}

const stepConfigs: { name: WellEntry['step'] }[] = [
  { name: 'Step1' },
  { name: 'Step2' },
  { name: 'Step3' },
  { name: 'Step4' },
];

export function GelLayoutCard({ gel, disabledIds, onToggleLane, onToggleStep, registerGelElement }: Props) {
  return (
    <section className="card" ref={(el) => registerGelElement(gel.gelNumber, el)}>
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
                  <div className="lane-number">L{idx + 1}</div>
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
                <div className="lane-number">L{idx + 1}</div>
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

      <div className="compact-step-row">
        {stepConfigs.map(({ name }) => (
          <button
            key={name}
            type="button"
            className="step-toggle compact"
            onClick={() => onToggleStep(gel.gelNumber, name)}
            style={{ borderColor: STEP_COLOR_MAP[name].border, background: STEP_COLOR_MAP[name].background }}
          >
            {name}
          </button>
        ))}
      </div>
    </section>
  );
}
