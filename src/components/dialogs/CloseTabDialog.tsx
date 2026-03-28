import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '../../utils/tauriCommands';

interface CloseTabDialogProps {
  tabId: string;
  onClose: () => void;
}

export function CloseTabDialog({ tabId, onClose }: CloseTabDialogProps) {
  const tabs = useAppStore((s) => s.tabs);
  const workspaces = useAppStore((s) => s.workspaces);
  const workspaceOrder = useAppStore((s) => s.workspaceOrder);
  const closeTab = useAppStore((s) => s.closeTab);
  const moveTabToWorkspace = useAppStore((s) => s.moveTabToWorkspace);
  const tab = tabs[tabId];

  const [showTransferMenu, setShowTransferMenu] = useState(false);

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

  const handleTransfer = (targetWsId: string) => {
    moveTabToWorkspace(tabId, targetWsId);
    onClose();
  };

  // Get workspaces available for transfer (exclude current)
  const transferTargets = workspaceOrder
    .map((id) => workspaces[id])
    .filter(Boolean)
    .filter((ws) => ws.id !== tab.workspaceId);

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
          {transferTargets.length > 0 && (
            <div className="dialog-transfer-wrapper">
              <button
                className="dialog-btn"
                onClick={() => setShowTransferMenu(!showTransferMenu)}
              >
                Transfer
              </button>
              {showTransferMenu && (
                <div className="transfer-menu">
                  {transferTargets.map((ws) => (
                    <div
                      key={ws.id}
                      className="transfer-menu-item"
                      onClick={() => handleTransfer(ws.id)}
                    >
                      <div
                        className="transfer-menu-dot"
                        style={{ backgroundColor: ws.color }}
                      />
                      {ws.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
