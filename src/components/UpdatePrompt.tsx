import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="bg-ink text-white rounded-md shadow-xl px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-paper text-ink rounded-md flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Update available</p>
          <p className="text-xs text-white/60">Tap to get the latest version</p>
        </div>
        <button
          onClick={() => updateServiceWorker(true)}
          className="px-3 py-1.5 bg-paper hover:bg-white text-ink text-xs font-mono uppercase tracking-wider rounded-md transition-colors flex-shrink-0"
        >
          Update
        </button>
      </div>
    </div>
  );
}
