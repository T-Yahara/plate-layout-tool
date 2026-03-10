import { ChangeEvent, useMemo, useState } from 'react';
import './App.css';
import { GelLayoutCard } from './components/GelLayoutCard';
import { PlateLayoutCard } from './components/PlateLayoutCard';
import { downloadCsvFiles } from './logic/csv';
import { buildPlan, detectDuplicates, parseSampleText } from './logic/planner';
import type { BuildResult, MarkerPlacement } from './logic/types';

function App() {
  const [markerPlacement, setMarkerPlacement] = useState<MarkerPlacement>('both');
  const [samples, setSamples] = useState<string[]>([]);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [error, setError] = useState<string>('');

  const duplicates = useMemo(() => detectDuplicates(samples), [samples]);

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
        return;
      }
      setSamples(parsed);
      setResult(buildPlan(parsed, markerPlacement));
    } catch {
      setError('ファイルの読み込みに失敗しました。');
      setSamples([]);
      setResult(null);
    }
  };

  const onGenerateClick = () => {
    if (samples.length === 0) {
      setError('先にサンプルファイルをアップロードしてください。');
      return;
    }
    setError('');
    setResult(buildPlan(samples, markerPlacement));
  };

  return (
    <main className="container">
      <h1>96well PCR → 24well Gel アプライ計画ツール</h1>

      <section className="card">
        <h2>設定</h2>
        <div className="form-row">
          <label htmlFor="sampleFile">サンプルファイル (txt/csv)</label>
          <input id="sampleFile" type="file" accept=".txt,.csv,text/plain,text/csv" onChange={onFileChange} />
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
          <button onClick={onGenerateClick}>計画を再生成</button>
          <button disabled={!result} onClick={() => result && downloadCsvFiles(result)}>
            CSV出力 (3ファイル)
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
          </section>

          <section>
            <h2>24wellゲル配置とアプライ順</h2>
            <div className="stack">
              {result.gels.map((gel) => (
                <GelLayoutCard key={gel.gelNumber} gel={gel} />
              ))}
            </div>
          </section>

          <section>
            <h2>96wellプレート配置</h2>
            <div className="stack">
              {result.plates.map((plate) => (
                <PlateLayoutCard key={plate.plateNumber} plate={plate} />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export default App;
