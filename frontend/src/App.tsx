import { useSession } from './hooks/useSession';
import { TargetUpload } from './components/TargetUpload';
import { TileUpload } from './components/TileUpload';
import { DeepZoomViewer } from './components/DeepZoomViewer';
import { ErrorAlert } from './components/ErrorAlert';
import { Play } from 'lucide-react';
import type { Resolution } from './types';

const STEPS = [
  { label: 'Upload Target', step: 1 },
  { label: 'Tile Library', step: 2 },
  { label: 'Settings', step: 3 },
  { label: 'Generate', step: 4 }
];

// Logo SVG component
function LogoIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#38bdf8"/>
          <stop offset="100%" stopColor="#a855f7"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="12" height="12" rx="2" fill="url(#logoGrad)"/>
      <rect x="18" y="2" width="12" height="12" rx="2" fill="url(#logoGrad)" opacity="0.7"/>
      <rect x="2" y="18" width="12" height="12" rx="2" fill="url(#logoGrad)" opacity="0.5"/>
      <rect x="18" y="18" width="12" height="12" rx="2" fill="url(#logoGrad)" opacity="0.3"/>
    </svg>
  );
}

// Viewer placeholder SVG
function ViewerPlaceholderIcon() {
  return (
    <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-20 h-20 mb-4 opacity-30">
      <rect x="8" y="8" width="28" height="28" rx="4"/>
      <rect x="44" y="8" width="28" height="28" rx="4"/>
      <rect x="8" y="44" width="28" height="28" rx="4"/>
      <rect x="44" y="44" width="28" height="28" rx="4"/>
    </svg>
  );
}

function App() {
  const {
    state,
    effectiveTileCount,
    uploadTarget,
    uploadTiles,
    clearTiles,
    updateSettings,
    setResolution,
    setNineXDetail,
    setTintPercentage,
    setTileSize,
    setMaxRepeatsPerTile,
    setColorMode,
    generateMosaic,
    getDziUrl,
    getDownloadUrl,
    reset,
    changeTarget,
    clearError
  } = useSession();

  // Get recommended tile count based on mode
  const getRecommendedCount = () => {
    if (state.imageAnalysis) {
      return state.imageAnalysis.recommendedTiles[state.selectedResolution];
    }
    return 0;
  };

  const recommendedCount = getRecommendedCount();

  // Handle regenerating with new settings from the viewer
  const handleRegenerateWithSettings = async (settings: { allowDuplicates: boolean; allowTinting: boolean; nineXDetail: boolean }) => {
    await updateSettings(settings);
    setNineXDetail(settings.nineXDetail);
    generateMosaic();
  };

  // Determine current active step for nav
  const getCurrentNavStep = () => {
    if (state.hasMosaic) return 4;
    if (state.tileCount > 0) return 3;
    if (state.targetImagePreview) return 2;
    return 1;
  };

  const currentNavStep = getCurrentNavStep();

  return (
    <div className="min-h-screen text-white">
      {state.error && <ErrorAlert message={state.error} onDismiss={clearError} />}

      {/* Navigation */}
      <nav className="nav">
        <div className="nav-logo">
          <LogoIcon />
          <span>Photo Mosaic Generator</span>
        </div>

        <div className="nav-steps">
          {STEPS.map((s, i) => (
            <div key={s.step}>
              <div className={`nav-step ${currentNavStep === s.step ? 'active' : ''} ${currentNavStep > s.step ? 'completed' : ''}`}>
                <span className="nav-step-dot"></span>
                {s.label}
              </div>
              {i < STEPS.length - 1 && <div className="nav-step-divider"></div>}
            </div>
          ))}
        </div>

        <div></div>
      </nav>

      {/* Main Layout */}
      <main className="main-layout">
        {/* Control Panel */}
        <aside className="panel">
          {/* Step 1: Target Image */}
          <section className="panel-section">
            <div className="section-header">
              <span className="section-number">1</span>
              <h2 className="section-title">Target Image</h2>
            </div>

            <TargetUpload
              onUpload={uploadTarget}
              preview={state.targetImagePreview}
              dimensions={state.targetImageDimensions}
              isLoading={state.isUploadingTarget}
            />

            {state.targetImagePreview && (
              <p className="dropzone-hint" style={{ marginTop: '12px', fontSize: '0.75rem' }}>
                Best results with high-resolution images
              </p>
            )}
          </section>

          {/* Step 2: Tile Library */}
          <section className="panel-section">
            <div className="section-header">
              <span className="section-number">2</span>
              <h2 className="section-title">Tile Library</h2>
            </div>

            <TileUpload
              onUpload={uploadTiles}
              onClear={clearTiles}
              tileCount={state.tileCount}
              effectiveTileCount={effectiveTileCount}
              previews={state.tilePreviews}
              requiredCount={recommendedCount}
            />

            {/* Allow tile reuse toggle */}
            <div className="toggle-row" style={{ marginTop: '16px' }}>
              <span className="toggle-text">Allow tile reuse</span>
              <div
                className={`toggle ${state.allowDuplicates ? 'active' : ''}`}
                onClick={() => updateSettings({ allowDuplicates: !state.allowDuplicates })}
              ></div>
            </div>

            {/* Limit repeats per tile */}
            {state.allowDuplicates && (
              <div className="control-group" style={{ marginTop: '12px' }}>
                <div className="control-label">Max repeats per tile</div>
                <div className="slider-container">
                  <span className="slider-value">{state.maxRepeatsPerTile}x</span>
                  <input
                    type="range"
                    className="slider"
                    min="1"
                    max="20"
                    value={state.maxRepeatsPerTile}
                    onChange={(e) => setMaxRepeatsPerTile(Number(e.target.value))}
                  />
                </div>
                {state.tileCount > 0 && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    background: 'var(--bg-glass-light)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    color: 'var(--accent-cyan)'
                  }}>
                    {state.tileCount} photos × {state.maxRepeatsPerTile} = <strong>{effectiveTileCount}</strong> effective tiles
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Step 3: Settings */}
          <section className="panel-section">
            <div className="section-header">
              <span className="section-number">3</span>
              <h2 className="section-title">Mosaic Settings</h2>
            </div>

            {/* Quality / Resolution */}
            <div className="control-group">
              <div className="control-label">Quality / Resolution</div>
              <div className="segmented">
                {(['low', 'medium', 'high'] as Resolution[]).map((res) => (
                  <button
                    key={res}
                    className={`segmented-btn ${state.selectedResolution === res ? 'active' : ''}`}
                    onClick={() => setResolution(res)}
                  >
                    {res === 'low' ? 'Low' : res === 'medium' ? 'Standard' : 'High'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tile Size */}
            <div className="control-group">
              <div className="control-label">Tile Size</div>
              <div className="slider-container">
                <span className="slider-value">{state.tileSize}px</span>
                <input
                  type="range"
                  className="slider"
                  min="8"
                  max="32"
                  value={state.tileSize}
                  onChange={(e) => setTileSize(Number(e.target.value))}
                />
              </div>
            </div>

            {/* 9x Detail Mode */}
            <div className="toggle-row">
              <div>
                <span className="toggle-text">Enable 9x detail (3x3 sub-tiles)</span>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Slower but higher detail
                </p>
              </div>
              <div
                className={`toggle ${state.nineXDetail ? 'active' : ''}`}
                onClick={() => setNineXDetail(!state.nineXDetail)}
              ></div>
            </div>

            {/* Color & Blending */}
            <div className="control-group" style={{ marginTop: '20px' }}>
              <div className="control-label">Color & Blending</div>

              <div className="checkbox-row">
                <div
                  className={`checkbox ${state.allowTinting ? 'checked' : ''}`}
                  onClick={() => updateSettings({ allowTinting: !state.allowTinting })}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <span className="checkbox-text">Apply color tinting / stained-glass effect</span>
              </div>

              {state.allowTinting && (
                <div className="slider-container" style={{ marginTop: '12px' }}>
                  <span className="slider-value">{state.tintPercentage}%</span>
                  <input
                    type="range"
                    className="slider"
                    min="0"
                    max="100"
                    value={state.tintPercentage}
                    onChange={(e) => setTintPercentage(Number(e.target.value))}
                  />
                </div>
              )}
            </div>

            {/* Color Mode */}
            <div className="control-group" style={{ marginTop: '16px' }}>
              <select
                value={state.colorMode}
                onChange={(e) => setColorMode(e.target.value as 'blend' | 'vibrant' | 'muted')}
              >
                <option value="blend">Blend with Target</option>
                <option value="vibrant">Vibrant</option>
                <option value="muted">Muted</option>
              </select>
            </div>
          </section>

          {/* Step 4: Generate */}
          <section className="panel-section">
            <div className="section-header">
              <span className="section-number">4</span>
              <h2 className="section-title">Generate & Export</h2>
            </div>

            <button
              className="btn btn-primary btn-block"
              onClick={generateMosaic}
              disabled={!state.sessionId || state.tileCount === 0 || !state.targetImagePreview || state.isGenerating}
            >
              <Play className="w-4 h-4" />
              {state.isGenerating ? 'Generating...' : 'Generate Mosaic'}
            </button>

            {/* Progress */}
            {state.isGenerating && (
              <div style={{ marginTop: '24px' }}>
                <div className="progress-bar-bg">
                  <div className="progress-bar" style={{ width: '60%' }}></div>
                </div>
                <div className="progress-status">
                  <div className="progress-spinner"></div>
                  <span className="progress-text">Generating mosaic...</span>
                </div>
              </div>
            )}

            {/* Summary after generation */}
            {state.hasMosaic && state.dziMetadata && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                background: 'var(--bg-glass-light)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--accent-green)',
                color: 'var(--accent-green)',
                fontSize: '0.85rem'
              }}>
                <p><strong>Complete!</strong> Generated {state.dziMetadata.width} x {state.dziMetadata.height}px mosaic</p>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: '8px' }}
                  onClick={changeTarget}
                >
                  Start over with new target
                </button>
              </div>
            )}
          </section>
        </aside>

        {/* Viewer */}
        <section className="viewer">
          {state.hasMosaic && state.dziMetadata ? (
            <DeepZoomViewer
              dziUrl={getDziUrl()}
              downloadUrl={getDownloadUrl()}
              onReset={reset}
              onChangeTarget={changeTarget}
              tileCount={state.tileCount}
              allowDuplicates={state.allowDuplicates}
              allowTinting={state.allowTinting}
              nineXDetail={state.nineXDetail}
              onRegenerateWithSettings={handleRegenerateWithSettings}
              isRegenerating={state.isGenerating}
            />
          ) : (
            <div className="viewer-canvas">
              <div className="viewer-placeholder">
                <ViewerPlaceholderIcon />
                <p className="viewer-placeholder-text">Your mosaic will appear here</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
