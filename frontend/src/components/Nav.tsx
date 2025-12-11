interface NavProps {
  currentStep: number;
  hasTarget: boolean;
  hasTiles: boolean;
  hasMosaic: boolean;
}

export function Nav({ currentStep, hasTarget, hasTiles, hasMosaic }: NavProps) {
  const steps = [
    { num: 1, label: 'Upload Target', completed: hasTarget },
    { num: 2, label: 'Tile Library', completed: hasTiles },
    { num: 3, label: 'Settings', completed: hasTarget && hasTiles },
    { num: 4, label: 'Generate', completed: hasMosaic }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 glass-panel border-b border-[rgba(148,163,184,0.15)] flex items-center justify-between px-8 z-[1000]">
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8">
          <rect x="2" y="2" width="12" height="12" rx="2" fill="url(#grad1)"/>
          <rect x="18" y="2" width="12" height="12" rx="2" fill="url(#grad1)" opacity="0.7"/>
          <rect x="2" y="18" width="12" height="12" rx="2" fill="url(#grad1)" opacity="0.5"/>
          <rect x="18" y="18" width="12" height="12" rx="2" fill="url(#grad1)" opacity="0.3"/>
          <defs>
            <linearGradient id="grad1" x1="0" y1="0" x2="32" y2="32">
              <stop offset="0%" stopColor="#38bdf8"/>
              <stop offset="100%" stopColor="#a855f7"/>
            </linearGradient>
          </defs>
        </svg>
        <span className="font-bold text-lg gradient-text" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Photo Mosaic Generator
        </span>
      </div>

      <div className="hidden md:flex items-center gap-2">
        {steps.map((step, idx) => (
          <div key={step.num} className="flex items-center">
            <div
              className={
                currentStep === step.num
                  ? 'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-slate-800/60 text-sky-400 border border-sky-400/20'
                  : step.completed
                  ? 'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-green-400'
                  : 'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-gray-400'
              }
            >
              <span className={
                currentStep === step.num
                  ? 'w-1.5 h-1.5 rounded-full bg-sky-400'
                  : step.completed
                  ? 'w-1.5 h-1.5 rounded-full bg-green-400'
                  : 'w-1.5 h-1.5 rounded-full bg-gray-400'
              } />
              {step.label}
            </div>
            {idx < steps.length - 1 && (
              <div className="w-6 h-px bg-slate-700 mx-1" />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          className="w-10 h-10 rounded-xl bg-slate-800/60 border border-slate-700 text-gray-400 flex items-center justify-center hover:text-white hover:border-sky-400/30 transition-all"
          title="Help"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9 9a3 3 0 0 1 6 0c0 2-3 3-3 3"/>
            <circle cx="12" cy="17" r="0.5" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </nav>
  );
}
