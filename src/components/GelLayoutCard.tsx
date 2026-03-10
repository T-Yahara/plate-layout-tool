import type { GelPlan } from '../logic/types';

interface Props {
  gel: GelPlan;
}

export function GelLayoutCard({ gel }: Props) {
  return (
    <section className="card">
      <h3>Gel {gel.gelNumber}</h3>
      <div className="gel-grid-wrap">
        <div className="gel-grid">
        {gel.lanes.map((lane, idx) => (
          <div key={idx} className={`lane ${lane.type}`}>
            <div className="lane-number">Lane {idx + 1}</div>
            {lane.type === 'marker' ? (
              <div className="lane-content marker-text">Marker</div>
            ) : lane.type === 'sample' ? (
              <div className="lane-content" title={lane.sampleName}>
                <strong>#{lane.localNumber}</strong>
                <span>{lane.sampleName}</span>
              </div>
            ) : (
              <div className="lane-content empty-text">-</div>
            )}
          </div>
        ))}
        </div>
      </div>

      <div className="steps-grid">
        {[
          ['Step1', gel.applySteps.step1],
          ['Step2', gel.applySteps.step2],
          ['Step3', gel.applySteps.step3],
          ['Step4', gel.applySteps.step4],
        ].map(([name, nums]) => (
          <div key={name}>
            <h4>{name}</h4>
            <p>{(nums as number[]).length === 0 ? '-' : (nums as number[]).join(', ')}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
