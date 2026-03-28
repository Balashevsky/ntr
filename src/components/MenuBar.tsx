import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '../utils/tauriCommands';
import { SettingsPanel } from './dialogs/SettingsPanel';

export function MenuBar() {
  const openFileTab = useAppStore((s) => s.openFileTab);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleOpen = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: 'Text Files', extensions: ['txt', 'json', 'md'] },
      ],
    });
    if (selected) {
      const filePath = selected as string;
      const content = await readFile(filePath);
      const fileName = filePath.split(/[\\/]/).pop() ?? 'Untitled';
      openFileTab(filePath, fileName, content);
    }
  };

  const handleSave = () => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true })
    );
  };

  const handleSaveAs = () => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, shiftKey: true })
    );
  };

  return (
    <>
      <div className="menu-bar">
        <div className="menu-item">
          <span className="menu-label">File</span>
          <div className="menu-dropdown">
            <button className="menu-option" onClick={handleOpen}>
              Open<span className="shortcut">Ctrl+O</span>
            </button>
            <div className="menu-separator" />
            <button className="menu-option" onClick={handleSave}>
              Save<span className="shortcut">Ctrl+S</span>
            </button>
            <button className="menu-option" onClick={handleSaveAs}>
              Save As<span className="shortcut">Ctrl+Shift+S</span>
            </button>
          </div>
        </div>
        <div className="menu-item">
          <span className="menu-label" onClick={() => setSettingsOpen(!settingsOpen)}>
            Settings
          </span>
        </div>
      </div>
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
