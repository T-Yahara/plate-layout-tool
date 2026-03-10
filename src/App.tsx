import { ChangeEvent, Dispatch, SetStateAction, useMemo, useRef, useState } from 'react';
import './App.css';
import { GelLayoutCard } from './components/GelLayoutCard';
import { PlateLayoutCard } from './components/PlateLayoutCard';
import { exportGelCsv, exportGelPng, exportPlateCsv, exportPlatePng } from './logic/export';
import { buildPlan, detectDuplicates, parseSampleText } from './logic/planner';
import type { BuildResult, MarkerPlacement, WellEntry } from './logic/types';

const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const cols = Array.from({ length: 12 }, (_, i) => i + 1);

const toPlateWellId = (plateNumber: number, well: string): string => `P${plateNumber}_${well}`;

function App() {
  const [markerPlacement, setMarkerPlacement] = useState<MarkerPlacement>('both');
  const [samples, setSamples] = useState<string[]>([]);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [error, setError] = useState<string>('');
  const [disabledPlateIds, setDisabledPlateIds] = useState<Set<string>>(new Set());
  const [disabledGelIds, setDisabledGelIds] = useState<Set<string>>(new Set());
  const [selectedFileName, setSelectedFileName] = useState<string>('未選択');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const duplicates = useMemo(() => detectDuplicates(samples), [samples]);

  const toggleIds = (setter: Dispatch<SetStateAction<Set<string>>>, ids: string[]) => {
    setter((prev) => {
      const next = new Set(prev);
      const allDisabled = ids.every((id) => next.has(id));
      ids.forEach((id) => {
        if (allDisabled) {
          next.delete(id);
        } else {
          next.add(id);
        }
      });
      return next;
    });
  };

  const togglePlateWell = (id: string) => toggleIds(setDisabledPlateIds, [id]);
  const toggleGelLane = (id: string) => toggleIds(setDisabledGelIds, [id]);

  const toggleRow = (plateNumber: number, row: string) => {
    toggleIds(
      setDisabledPlateIds,
      cols.map((col) => toPlateWellId(plateNumber, `${row}${col}`)),
    );
  };

  const toggleColumn = (plateNumber: number, col: number) => {
    toggleIds(
      setDisabledPlateIds,
      rows.map((row) => toPlateWellId(plateNumber, `${row}${col}`)),
    );
  };

  const toggleGroupStepInPlate = (plateNumber: number, group: 1 | 2 | 3 | 4, step: 1 | 2 | 3 | 4) => {
    if (!result) {
      return;
    }
    const plate = result.plates.find((p) => p.plateNumber === plateNumber);
    if (!plate) {
      return;
    }

    const stepLabel: WellEntry['step'] = `Step${step}` as WellEntry['step'];
    const groupStart = (group - 1) * 3 + 1;
    const groupEnd = groupStart + 2;

    const ids = Object.entries(plate.wells)
      .filter(([wellId, entry]) => {
        if (!entry || entry.step !== stepLabel) {
          return false;
        }
        const col = Number(wellId.slice(1));
        return col >= groupStart && col <= groupEnd;
      })
      .map(([wellId]) => toPlateWellId(plateNumber, wellId));

    if (ids.length > 0) {
      toggleIds(setDisabledPlateIds, ids);
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

    toggleIds(setDisabledGelIds, ids);
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
      setDisabledPlateIds(new Set());
      setDisabledGelIds(new Set());
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
    setDisabledPlateIds(new Set());
    setDisabledGelIds(new Set());
    setSelectedFileName('未選択');
    setIsExportMenuOpen(false);
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
    setDisabledPlateIds(new Set());
    setDisabledGelIds(new Set());
  };


  const onExport = async (type: 'plateCsv' | 'gelCsv' | 'platePng' | 'gelPng') => {
    if (!result) {
      return;
    }
    try {
      if (type === 'plateCsv') exportPlateCsv(result);
      if (type === 'gelCsv') exportGelCsv(result);
      if (type === 'platePng') await exportPlatePng(result);
      if (type === 'gelPng') await exportGelPng(result);
    } catch {
      setError('エクスポートに失敗しました。');
    } finally {
      setIsExportMenuOpen(false);
    }
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
          <div className="export-menu-wrap">
            <button disabled={!result} onClick={() => setIsExportMenuOpen((prev) => !prev)}>
              Export
            </button>
            {isExportMenuOpen && result && (
              <div className="export-menu">
                <button onClick={() => onExport('plateCsv')}>96well CSV</button>
                <button onClick={() => onExport('gelCsv')}>24well CSV</button>
                <button onClick={() => onExport('platePng')}>96well PNG</button>
                <button onClick={() => onExport('gelPng')}>24well PNG</button>
              </div>
            )}
          </div>
          <button
            disabled={disabledPlateIds.size === 0 && disabledGelIds.size === 0}
            onClick={() => {
              setDisabledPlateIds(new Set());
              setDisabledGelIds(new Set());
            }}
          >
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
            <div>96well無効化: {disabledPlateIds.size}</div>
            <div>24well無効化: {disabledGelIds.size}</div>
          </section>

          <section>
            <h2>96wellプレート配置</h2>
            <div className="stack">
              {result.plates.map((plate) => (
                <PlateLayoutCard
                  key={plate.plateNumber}
                  plate={plate}
                  disabledIds={disabledPlateIds}
                  onToggleWell={togglePlateWell}
                  onToggleRow={toggleRow}
                  onToggleColumn={toggleColumn}
                  onToggleGroupStep={toggleGroupStepInPlate}
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
                  disabledIds={disabledGelIds}
                  onToggleLane={toggleGelLane}
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
