import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { persistState } from '../store/persistence';

export function useBeforeUnload() {
  useEffect(() => {
    const appWindow = getCurrentWindow();
    // IMPORTANT: Handler must be synchronous (return void, not Promise).
    // Tauri v2's onCloseRequested wrapper awaits the handler, then calls
    // window.destroy(). If the handler is async and hangs, destroy() is
    // never called and the window stays open forever.
    // Fire-and-forget the save; auto-save (15s) covers most data anyway.
    const unlisten = appWindow.onCloseRequested((_event) => {
      persistState().catch((err) =>
        console.error('Failed to save state on close:', err)
      );
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);
}
