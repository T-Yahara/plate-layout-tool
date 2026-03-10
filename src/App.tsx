import { ChangeEvent, useMemo, useRef, useState } from 'react';
import './App.css';
import { GelLayoutCard } from './components/GelLayoutCard';
import { PlateLayoutCard } from './components/PlateLayoutCard';
import { exportGelCsv, exportGelPdf, exportPlateCsv, exportPlatePdf } from './logic/export';
import { buildPlan, detectDuplicates, parseSampleText } from './logic/planner';
import type { BuildResult, MarkerPlacement, WellEntry } from './logic/types';

const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const cols = Array.from({ length: 12 }, (_, i) => i + 1);
const stepNames: WellEntry['step'][] = ['Step1', 'Step2', 'Step3', 'Step4'];

const toPlateWellId = (plateNumber: number, well: string): string => `P${plateNumber}_${well}`;

function App() {
  const [markerPlacement, setMarkerPlacement] = useState<MarkerPlacement>('both');
  const [samples, setSamples] = useState<string[]>([]);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [error, setError] = useState<string>('');
  const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());
  const [selectedFileName, setSelectedFileName] = useState<string>('未選択');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const duplicates = useMemo(() => detectDuplicates(samples), [samples]);

  const linkage = useMemo(() => {
    const plateToGel = new Map<string, string>();
    const gelToPlate = new Map<string, string>();

    if (!result) {
      return { plateToGel, gelToPlate };
    }

    const localToLaneByGel = new Map<number, Map<number, number>>();
    result.gels.forEach((gel) => {
      const localToLane = new Map<number, number>();
      gel.lanes.forEach((lane, idx) => {
        if (lane.type === 'sample') {
          localToLane.set(lane.localNumber, idx + 1);
        }
      });
      localToLaneByGel.set(gel.gelNumber, localToLane);
    });

    result.plates.forEach((plate) => {
      Object.entries(plate.wells).forEach(([well, entry]) => {
        if (!entry) {
          return;
        }
        const lane = localToLaneByGel.get(entry.gelNumber)?.get(entry.localNumber);
        if (!lane) {
          return;
        }
        const plateId = toPlateWellId(plate.plateNumber, well);
        const gelId = `G${entry.gelNumber}_L${lane}`;
        plateToGel.set(plateId, gelId);
        gelToPlate.set(gelId, plateId);
      });
    });

    return { plateToGel, gelToPlate };
  }, [result]);

  const withLinkedIds = (ids: string[]): string[] => {
    const next = new Set<string>();
    ids.forEach((id) => {
      next.add(id);
      const linked = linkage.plateToGel.get(id) ?? linkage.gelToPlate.get(id);
      if (linked) {
        next.add(linked);
      }
    });
    return [...next];
  };

  const toggleIds = (ids: string[]) => {
    const targetIds = withLinkedIds(ids);
    setDisabledIds((prev) => {
      const next = new Set(prev);
      const allDisabled = targetIds.every((id) => next.has(id));
      targetIds.forEach((id) => {
        if (allDisabled) {
          next.delete(id);
        } else {
          next.add(id);
        }
      });
      return next;
    });
  };

  const toggleWell = (id: string) => {
    toggleIds([id]);
  };

  const toggleRow = (plateNumber: number, row: string) => {
    toggleIds(cols.map((col) => toPlateWellId(plateNumber, `${row}${col}`)));
  };

  const toggleColumn = (plateNumber: number, col: number) => {
    toggleIds(rows.map((row) => toPlateWellId(plateNumber, `${row}${col}`)));
  };

  const getStepWellIdsFromPlate = (plateNumber: number, step: WellEntry['step']): string[] => {
    if (!result) {
      return [];
    }

    const plate = result.plates.find((p) => p.plateNumber === plateNumber);
    if (!plate) {
      return [];
    }

    return Object.entries(plate.wells)
      .filter(([, entry]) => entry?.step === step)
      .map(([well]) => toPlateWellId(plateNumber, well));
  };

  const toggleStepInPlate = (plateNumber: number, step: WellEntry['step']) => {
    const ids = getStepWellIdsFromPlate(plateNumber, step);
    if (ids.length > 0) {
      toggleIds(ids);
    }
  };

  const toggleStepInGel = (gelNumber: number, step: WellEntry['step']) => {
    if (!result) {
      return;
    }

    const gel = result.gels.find((g) => g.gelNumber === gelNumber);
    if (!gel) {
      return;
    }

    const localNumbers =
      step === 'Step1'
        ? gel.applySteps.step1
        : step === 'Step2'
          ? gel.applySteps.step2
          : step === 'Step3'
            ? gel.applySteps.step3
            : gel.applySteps.step4;

    const ids = gel.lanes
      .map((lane, idx) =>
        lane.type === 'sample' && localNumbers.includes(lane.localNumber) ? `G${gelNumber}_L${idx + 1}` : null,
      )
      .filter((id): id is string => id !== null);

    toggleIds(ids);
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = event.target.files?.[0];
    if (!file) {
      setError('ファイルが選択されていません。');
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseSampleText(text);
      if (parsed.length === 0) {
        setError('空ファイルです。サンプル名を1行ずつ入力してください。');
        setSamples([]);
        setResult(null);
        setSelectedFileName('未選択');
        return;
      }
      setSamples(parsed);
      setSelectedFileName(file.name);
      setResult(buildPlan(parsed, markerPlacement));
      setDisabledIds(new Set());
    } catch {
      setError('ファイルの読み込みに失敗しました。');
      setSamples([]);
      setResult(null);
      setSelectedFileName('未選択');
    }
  };

  const onResetFile = () => {
    setSamples([]);
    setResult(null);
    setError('');
    setDisabledIds(new Set());
    setSelectedFileName('未選択');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onGenerateClick = () => {
    if (samples.length === 0) {
      setError('先にサンプルファイルをアップロードしてください。');
      return;
    }
    setError('');
    setResult(buildPlan(samples, markerPlacement));
    setDisabledIds(new Set());
  };

  return (
    <main className="container">
      <h1>96well PCR → 24well Gel mapping</h1>

      <section className="card">
        <h2>設定</h2>
        <div className="form-row">
          <label htmlFor="sampleFile">サンプルファイル (txt/csv)</label>
          <input
            ref={fileInputRef}
            id="sampleFile"
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            onChange={onFileChange}
          />
          <span className="file-name">選択中: {selectedFileName}</span>
        </div>

        <div className="form-row">
          <label htmlFor="markerPlacement">markerPlacement</label>
          <select
            id="markerPlacement"
            value={markerPlacement}
            onChange={(e) => setMarkerPlacement(e.target.value as MarkerPlacement)}
          >
            <option value="both">both</option>
            <option value="left">left</option>
            <option value="right">right</option>
            <option value="none">none</option>
          </select>
        </div>

        <div className="button-row">
          <button onClick={onGenerateClick}>Generate</button>
          <button onClick={onResetFile}>ファイルをリセット</button>
          <button disabled={!result} onClick={() => result && exportPlateCsv(result)}>
            96well CSV 出力
          </button>
          <button disabled={!result} onClick={() => result && exportGelCsv(result)}>
            24well CSV 出力
          </button>
          <button disabled={!result} onClick={() => result && exportPlatePdf(result)}>
            96well PDF 出力
          </button>
          <button disabled={!result} onClick={() => result && exportGelPdf(result)}>
            24well PDF 出力
          </button>
          <button disabled={disabledIds.size === 0} onClick={() => setDisabledIds(new Set())}>
            Reset Disabled Wells
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        {duplicates.length > 0 && (
          <p className="warning">重複サンプル名があります: {duplicates.slice(0, 10).join(', ')}</p>
        )}
      </section>

      {result && (
        <>
          <section className="card stats">
            <div>サンプル数: {result.sampleCount}</div>
            <div>ゲル数: {result.gels.length}</div>
            <div>プレート数: {result.plates.length}</div>
            <div>無効化: {disabledIds.size} 箇所</div>
          </section>

          <section>
            <h2>96wellプレート配置</h2>
            <div className="stack">
              {result.plates.map((plate) => (
                <PlateLayoutCard
                  key={plate.plateNumber}
                  plate={plate}
                  disabledIds={disabledIds}
                  onToggleWell={toggleWell}
                  onToggleRow={toggleRow}
                  onToggleColumn={toggleColumn}
                  onToggleStep={toggleStepInPlate}
                  stepNames={stepNames}
                />
              ))}
            </div>
          </section>

          <section>
            <h2>24wellゲル配置とアプライ順</h2>
            <div className="stack">
              {result.gels.map((gel) => (
                <GelLayoutCard
                  key={gel.gelNumber}
                  gel={gel}
                  disabledIds={disabledIds}
                  onToggleLane={toggleWell}
                  onToggleStep={toggleStepInGel}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export default App;
