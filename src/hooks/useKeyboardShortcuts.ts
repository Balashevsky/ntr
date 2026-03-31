import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '../utils/tauriCommands';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      const isS = e.key.toLowerCase() === 's';

      // Ctrl+Shift+S: Save As (always shows dialog)
      if (e.ctrlKey && e.shiftKey && isS) {
        e.preventDefault();
        const { tabs, activeTabId } = useAppStore.getState();
        if (!activeTabId) return;
        const tab = tabs[activeTabId];
        if (!tab) return;

        const path = await save({
          filters: [
            { name: 'Text Files', extensions: ['txt', 'json', 'md'] },
          ],
        });
        if (path) {
          await writeFile(path, tab.content);
          useAppStore.getState().saveTabAsFile(activeTabId, path);
          useAppStore.getState().markTabClean(activeTabId);
        }
        return;
      }

      // Ctrl+S: Save (file tabs save to disk, note tabs save in-app silently)
      if (e.ctrlKey && !e.shiftKey && isS) {
        e.preventDefault();
        const { tabs, activeTabId } = useAppStore.getState();
        if (!activeTabId) return;
        const tab = tabs[activeTabId];
        if (!tab) return;

        if (tab.type === 'file' && tab.filePath) {
          await writeFile(tab.filePath, tab.content);
          useAppStore.getState().markTabClean(activeTabId);
        } else {
          // Note tab: just mark clean (content is already saved in app state)
          useAppStore.getState().markTabClean(activeTabId);
        }
        return;
      }

      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        useAppStore.getState().createNoteTab();
      }

      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        // Close tab is handled by the component dialog
        // We just dispatch a custom event that the TabBar listens to
        const { activeTabId } = useAppStore.getState();
        if (activeTabId) {
          window.dispatchEvent(
            new CustomEvent('ntr-close-tab', { detail: { tabId: activeTabId } })
          );
        }
      }

      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        const { tabs, activeTabId, activeWorkspaceId, workspaces } = useAppStore.getState();
        const ws = workspaces[activeWorkspaceId];
        if (!ws || ws.tabOrder.length === 0) return;
        const visibleTabs = ws.tabOrder.filter((id) => tabs[id]?.isVisible);
        if (visibleTabs.length === 0) return;
        const currentIndex = activeTabId ? visibleTabs.indexOf(activeTabId) : -1;
        const nextIndex = e.shiftKey
          ? (currentIndex - 1 + visibleTabs.length) % visibleTabs.length
          : (currentIndex + 1) % visibleTabs.length;
        useAppStore.getState().setActiveTab(visibleTabs[nextIndex]);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
