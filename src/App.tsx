import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { MenuBar } from './components/MenuBar';
import { TabBar } from './components/TabBar';
import { Editor } from './components/Editor';
import { WorkspacePanel } from './components/WorkspacePanel';
import { StatusBar } from './components/StatusBar';
import { useAutoSave } from './hooks/useAutoSave';
import { useBeforeUnload } from './hooks/useBeforeUnload';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { restoreState } from './store/persistence';
import { useAppStore } from './store/appStore';
import { getCliFilePath, readFile } from './utils/tauriCommands';
import './App.css';

async function openFileFromPath(filePath: string) {
  const content = await readFile(filePath);
  const fileName = filePath.split(/[/\\]/).pop() || 'Untitled';
  const { workspaceOrder, setActiveWorkspace, openFileTab } = useAppStore.getState();
  if (workspaceOrder.length > 0) {
    setActiveWorkspace(workspaceOrder[0]);
  }
  openFileTab(filePath, fileName, content);
}

function App() {
  const isWorkspacePanelOpen = useAppStore((s) => s.isWorkspacePanelOpen);
  const theme = useAppStore((s) => s.theme);
  const customAccentColor = useAppStore((s) => s.customAccentColor);
  const customEyeColor = useAppStore((s) => s.customEyeColor);
  const customCaretColor = useAppStore((s) => s.customCaretColor);

  useAutoSave();
  useBeforeUnload();
  useKeyboardShortcuts();

  // Restore state + open file from CLI args
  useEffect(() => {
    async function init() {
      await restoreState();

      try {
        const filePath = await getCliFilePath();
        if (filePath) {
          await openFileFromPath(filePath);
        }
      } catch (e) {
        console.error('Failed to open file from CLI:', e);
      }
    }
    init();
  }, []);

  // Listen for file open events from single-instance
  useEffect(() => {
    let unlistenFile: (() => void) | undefined;

    async function setup() {
      unlistenFile = await listen<string>('open-file', async (event) => {
        try {
          await openFileFromPath(event.payload);
        } catch (e) {
          console.error('Failed to open file from event:', e);
        }
      });
    }
    setup();

    return () => {
      unlistenFile?.();
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    // Apply custom color overrides
    if (customAccentColor) root.style.setProperty('--accent', customAccentColor);
    else root.style.removeProperty('--accent');

    if (customEyeColor) root.style.setProperty('--eye-color', customEyeColor);
    else root.style.removeProperty('--eye-color');

    if (customCaretColor) root.style.setProperty('--caret-color', customCaretColor);
    else root.style.removeProperty('--caret-color');
  }, [theme, customAccentColor, customEyeColor, customCaretColor]);

  return (
    <div className="app">
      <div className="app-body">
        <div className="app-main">
          <MenuBar />
          <TabBar />
          <Editor />
        </div>
        {isWorkspacePanelOpen && <WorkspacePanel />}
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
