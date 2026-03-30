import { useAppStore } from '../../store/appStore';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '../../utils/tauriCommands';

interface CloseTabDialogProps {
  tabId: string;
  onClose: () => void;
}

export function CloseTabDialog({ tabId, onClose }: CloseTabDialogProps) {
  const tabs = useAppStore((s) => s.tabs);
  const closeTab = useAppStore((s) => s.closeTab);
  const tab = tabs[tabId];

  if (!tab) {
    onClose();
    return null;
  }

  const handleSaveInWorkspace = () => {
    closeTab(tabId);
    onClose();
  };

  const handleSaveAsFile = async () => {
    const path = await save({
      filters: [
        { name: 'Text Files', extensions: ['txt', 'json', 'md'] },
      ],
    });
    if (path) {
      await writeFile(path, tab.content);
      closeTab(tabId);
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={handleCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <p>Close this tab?</p>
        <div className="dialog-actions">
          <button className="dialog-btn" onClick={handleCancel}>
            Cancel
          </button>
          <button className="dialog-btn" onClick={handleSaveInWorkspace}>
            Close
          </button>
          <button className="dialog-btn" onClick={handleSaveAsFile}>
            Save as File
          </button>
        </div>
      </div>
    </div>
  );
}
