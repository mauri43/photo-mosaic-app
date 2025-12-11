import { useSession } from './hooks/useSession';
import { StepIndicator } from './components/StepIndicator';
import { TargetUpload } from './components/TargetUpload';
import { DimensionsInput } from './components/DimensionsInput';
import { TileUpload } from './components/TileUpload';
import { SettingsPanel } from './components/SettingsPanel';
import { GenerateButton } from './components/GenerateButton';
import { DeepZoomViewer } from './components/DeepZoomViewer';
import { ErrorAlert } from './components/ErrorAlert';
import { Grid3X3, Info, Settings, Wand2, ChevronDown, ChevronUp } from 'lucide-react';

const STEPS = ['Target Image', 'Upload Tiles', 'Settings', 'View Mosaic'];

function App() {
  const {
    state,
    uploadTarget,
    setManualMode,
    setDimensions,
    uploadTiles,
    clearTiles,
    updateSettings,
    setResolution,
    setUseAllTiles,
    setFourXDetail,
    generateMosaic,
    getDziUrl,
    getDownloadUrl,
    reset,
    changeTarget,
    clearError
  } = useSession();

  // Get recommended tile count based on mode
  const getRecommendedCount = () => {
    if (state.manualMode && state.requirements) {
      switch (state.selectedResolution) {
        case 'low': return state.requirements.low;
        case 'medium': return state.requirements.medium;
        case 'high': return state.requirements.high;
      }
    } else if (state.imageAnalysis) {
      return state.imageAnalysis.recommendedTiles[state.selectedResolution];
    }
    return 0;
  };

  const recommendedCount = getRecommendedCount();

  // Handle regenerating with new settings from the viewer
  const handleRegenerateWithSettings = async (settings: { allowDuplicates: boolean; allowTinting: boolean; fourXDetail: boolean }) => {
    // Update settings first, then regenerate
    await updateSettings(settings);
    // Also update fourXDetail state
    setFourXDetail(settings.fourXDetail);
    generateMosaic();
  };

  // Show viewer if mosaic is generated
  if (state.hasMosaic && state.dziMetadata) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {state.error && <ErrorAlert message={state.error} onDismiss={clearError} />}

        <header className="bg-gray-800/50 border-b border-gray-700 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Grid3X3 className="w-8 h-8 text-blue-400" />
              <h1 className="text-xl font-bold">Photo Mosaic Generator</h1>
            </div>
            <div className="text-sm text-gray-400">
              {state.dziMetadata.width} x {state.dziMetadata.height} px
            </div>
          </div>
        </header>

        <main className="h-[calc(100vh-73px)]">
          <DeepZoomViewer
            dziUrl={getDziUrl()}
            downloadUrl={getDownloadUrl()}
            onReset={reset}
            onChangeTarget={changeTarget}
            tileCount={state.tileCount}
            allowDuplicates={state.allowDuplicates}
            allowTinting={state.allowTinting}
            fourXDetail={state.fourXDetail}
            onRegenerateWithSettings={handleRegenerateWithSettings}
            isRegenerating={state.isGenerating}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {state.error && <ErrorAlert message={state.error} onDismiss={clearError} />}

      <header className="bg-gray-800/50 border-b border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Grid3X3 className="w-8 h-8 text-blue-400" />
          <h1 className="text-xl font-bold">Photo Mosaic Generator</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <StepIndicator currentStep={state.step} steps={STEPS} />

        <div className="space-y-8">
          {/* Step 1: Target Image */}
          <section className="bg-gray-800/30 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500 text-sm flex items-center justify-center">1</span>
              Upload Target Image
            </h2>
            <TargetUpload
              onUpload={uploadTarget}
              preview={state.targetImagePreview}
              dimensions={state.targetImageDimensions}
              isLoading={state.isUploadingTarget}
            />

            {/* Image Analysis Results */}
            {state.imageAnalysis && (
              <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Wand2 className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-300">Image Analysis</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Complexity:</span>
                    <span className="ml-2 text-white">{state.imageAnalysis.complexity}/100</span>
                    <div className="mt-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                        style={{ width: `${state.imageAnalysis.complexity}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400">Recommended tiles:</span>
                    <div className="text-xs mt-1 space-x-3">
                      <span className="text-yellow-400">Low: {state.imageAnalysis.recommendedTiles.low}</span>
                      <span className="text-blue-400">Med: {state.imageAnalysis.recommendedTiles.medium}</span>
                      <span className="text-green-400">High: {state.imageAnalysis.recommendedTiles.high}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Step 2: Upload Tiles */}
          {state.step >= 2 && (
            <section className="bg-gray-800/30 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-500 text-sm flex items-center justify-center">2</span>
                Upload Tile Images
              </h2>
              <TileUpload
                onUpload={uploadTiles}
                onClear={clearTiles}
                tileCount={state.tileCount}
                previews={state.tilePreviews}
                requiredCount={recommendedCount}
              />
            </section>
          )}

          {/* Step 3: Settings & Generate */}
          {state.step >= 2 && state.tileCount > 0 && (
            <section className="bg-gray-800/30 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-500 text-sm flex items-center justify-center">3</span>
                Settings & Generate
              </h2>

              <div className="space-y-6">
                {/* Mode Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-300">
                        Advanced Settings
                      </div>
                      <div className="text-xs text-gray-500">
                        Customize output dimensions and tile calculations
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setManualMode(!state.manualMode)}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    {state.manualMode ? (
                      <>Hide <ChevronUp className="w-4 h-4" /></>
                    ) : (
                      <>Show <ChevronDown className="w-4 h-4" /></>
                    )}
                  </button>
                </div>

                {/* Manual Mode: Dimensions */}
                {state.manualMode && (
                  <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                    <h3 className="text-sm font-medium text-gray-300 mb-3">Output Dimensions</h3>
                    <DimensionsInput
                      initialWidth={state.desiredWidth}
                      initialHeight={state.desiredHeight}
                      originalDimensions={state.targetImageDimensions}
                      requirements={state.requirements}
                      onSubmit={setDimensions}
                    />
                  </div>
                )}

                {/* Settings Panel */}
                <SettingsPanel
                  allowDuplicates={state.allowDuplicates}
                  allowTinting={state.allowTinting}
                  fourXDetail={state.fourXDetail}
                  selectedResolution={state.selectedResolution}
                  requirements={state.manualMode ? state.requirements : null}
                  imageAnalysis={!state.manualMode ? state.imageAnalysis : null}
                  tileCount={state.tileCount}
                  useAllTiles={state.useAllTiles}
                  manualMode={state.manualMode}
                  onDuplicatesChange={(value) => updateSettings({ allowDuplicates: value })}
                  onTintingChange={(value) => updateSettings({ allowTinting: value })}
                  onFourXDetailChange={setFourXDetail}
                  onResolutionChange={setResolution}
                  onUseAllTilesChange={setUseAllTiles}
                />

                {/* Generate Button */}
                <GenerateButton
                  onClick={generateMosaic}
                  isGenerating={state.isGenerating}
                  disabled={!state.sessionId}
                  tileCount={state.tileCount}
                  selectedResolution={state.selectedResolution}
                  recommendedCount={recommendedCount}
                  allowDuplicates={state.allowDuplicates}
                  useAllTiles={state.useAllTiles}
                  manualMode={state.manualMode}
                />
              </div>
            </section>
          )}

          {/* Info Box */}
          <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-300 space-y-2">
              <p>
                <strong>Smart Analysis:</strong> The system analyzes your target image complexity and recommends
                the optimal number of tiles for each quality level.
              </p>
              <p>
                <strong>High Quality Bonus:</strong> When you select High quality and upload more tiles than needed,
                all tiles will be used for maximum detail.
              </p>
              <p>
                <strong>Memory-only storage:</strong> All data is stored only in memory.
                Closing or refreshing the page will delete everything.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-800 px-6 py-4 mt-8">
        <div className="max-w-4xl mx-auto text-center text-sm text-gray-500">
          Photo Mosaic Generator • All data stored in memory only
        </div>
      </footer>
    </div>
  );
}

export default App;
