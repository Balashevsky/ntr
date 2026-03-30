import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore, getTabDisplayName } from '../store/appStore';
import { CloseTabDialog } from './dialogs/CloseTabDialog';

export function TabBar() {
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const workspaces = useAppStore((s) => s.workspaces);
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const isWorkspacePanelOpen = useAppStore((s) => s.isWorkspacePanelOpen);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const createNoteTab = useAppStore((s) => s.createNoteTab);
  const toggleWorkspacePanel = useAppStore((s) => s.toggleWorkspacePanel);
  const renameTab = useAppStore((s) => s.renameTab);
  const closeTab = useAppStore((s) => s.closeTab);
  const reorderTab = useAppStore((s) => s.reorderTab);
  const moveTabToWorkspace = useAppStore((s) => s.moveTabToWorkspace);

  const [closingTabId, setClosingTabId] = useState<string | null>(null);
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [dragSide, setDragSide] = useState<'left' | 'right' | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const workspace = workspaces[activeWorkspaceId];

  const visibleTabIds = workspace
    ? workspace.tabOrder.filter((id) => tabs[id]?.isVisible)
    : [];

  // Horizontal scroll on mouse wheel
  const handleTabsWheel = useCallback((e: React.WheelEvent) => {
    if (tabsContainerRef.current && !e.ctrlKey) {
      tabsContainerRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  const handleDoubleClick = (tabId: string) => {
    const tab = tabs[tabId];
    if (!tab || tab.type !== 'note') return;
    setRenamingTabId(tabId);
    setRenameValue(getTabDisplayName(tab));
  };

  const handleRenameSubmit = () => {
    if (renamingTabId && renameValue.trim()) {
      renameTab(renamingTabId, renameValue.trim());
    }
    setRenamingTabId(null);
  };

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTabId(tabId);
    e.dataTransfer.setData('application/ntr-tab', tabId);
    e.dataTransfer.setData('text/plain', tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTabDragOver = (e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    setDragOverTabId(tabId);
    setDragSide(e.clientX < midX ? 'left' : 'right');
  };

  const handleTabDragLeave = () => {
    setDragOverTabId(null);
    setDragSide(null);
  };

  const handleTabDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    const dragTabId = e.dataTransfer.getData('application/ntr-tab') || e.dataTransfer.getData('text/plain');
    setDragOverTabId(null);
    setDragSide(null);
    setDraggedTabId(null);

    if (!dragTabId || dragTabId === targetTabId) return;

    const draggedTab = tabs[dragTabId];
    if (!draggedTab) return;

    // If the tab is from a different workspace, move it first
    if (draggedTab.workspaceId !== activeWorkspaceId) {
      moveTabToWorkspace(dragTabId, activeWorkspaceId);
    }

    // Calculate target index in the full tabOrder (not just visible)
    const targetIndex = workspace.tabOrder.indexOf(targetTabId);
    const insertIndex = dragSide === 'right' ? targetIndex + 1 : targetIndex;

    // Use setTimeout for cross-workspace to let the move settle first
    if (draggedTab.workspaceId !== activeWorkspaceId) {
      setTimeout(() => reorderTab(dragTabId, insertIndex, activeWorkspaceId), 0);
    } else {
      reorderTab(dragTabId, insertIndex, activeWorkspaceId);
    }
  };

  // Drop on empty area of tab bar = append to end
  const handleBarDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleBarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dragTabId = e.dataTransfer.getData('application/ntr-tab') || e.dataTransfer.getData('text/plain');
    setDragOverTabId(null);
    setDragSide(null);
    setDraggedTabId(null);

    if (!dragTabId) return;

    const draggedTab = tabs[dragTabId];
    if (!draggedTab) return;

    if (draggedTab.workspaceId !== activeWorkspaceId) {
      moveTabToWorkspace(dragTabId, activeWorkspaceId);
    }
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const tab = tabs[tabId];
    if (tab && tab.content.trim() === '' && !tab.name) {
      closeTab(tabId);
      return;
    }
    setClosingTabId(tabId);
  };

  // Listen for programmatic close requests (Ctrl+W)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tabId) {
        const tab = useAppStore.getState().tabs[detail.tabId];
        if (tab && tab.content.trim() === '' && !tab.name) {
          closeTab(detail.tabId);
        } else {
          setClosingTabId(detail.tabId);
        }
      }
    };
    window.addEventListener('ntr-close-tab', handler);
    return () => window.removeEventListener('ntr-close-tab', handler);
  }, [closeTab]);

  if (!workspace) return null;

  return (
    <>
      <div className="tab-bar">
        <div
          className="tab-bar-tabs"
          ref={tabsContainerRef}
          onWheel={handleTabsWheel}
          onDragOver={handleBarDragOver}
          onDrop={handleBarDrop}
          onDoubleClick={(e) => { if (e.target === e.currentTarget) createNoteTab(); }}
        >
          {visibleTabIds.map((tabId) => {
            const tab = tabs[tabId];
            if (!tab) return null;
            const isActive = tabId === activeTabId;
            const displayName = getTabDisplayName(tab);

            const dropClass =
              dragOverTabId === tabId && dragSide === 'left' ? 'tab-drop-left' :
              dragOverTabId === tabId && dragSide === 'right' ? 'tab-drop-right' : '';

            return (
              <div
                key={tabId}
                className={`tab ${isActive ? 'tab-active' : ''} ${dropClass}`}
                onClick={() => setActiveTab(tabId)}
                onDoubleClick={() => handleDoubleClick(tabId)}
                draggable
                onDragStart={(e) => handleDragStart(e, tabId)}
                onDragEnd={() => { setDraggedTabId(null); setDragOverTabId(null); setDragSide(null); }}
                onDragOver={(e) => handleTabDragOver(e, tabId)}
                onDragLeave={handleTabDragLeave}
                onDrop={(e) => handleTabDrop(e, tabId)}
                data-tab-id={tabId}
                data-dragging={draggedTabId === tabId ? 'true' : undefined}
              >
                {renamingTabId === tabId ? (
                  <input
                    className="tab-rename-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSubmit();
                      if (e.key === 'Escape') setRenamingTabId(null);
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="tab-name">{displayName}</span>
                )}
                {tab.type === 'file' && (
                  <span className="tab-file-indicator" title="File on disk">
                  </span>
                )}
                <button
                  className="tab-close"
                  onClick={(e) => handleCloseTab(e, tabId)}
                  title="Close tab"
                >
                  x
                </button>
              </div>
            );
          })}
        </div>
        <div className="tab-bar-actions">
          <button className="tab-bar-btn" onClick={createNoteTab} title="New tab">
            +
          </button>
          <button
            className="tab-bar-btn"
            onClick={toggleWorkspacePanel}
            title="Workspaces"
          >
            <span className={`workspace-toggle-icon ${isWorkspacePanelOpen ? 'panel-open' : ''}`}>
              &#9660;
            </span>
          </button>
        </div>
      </div>

      {closingTabId && (
        <CloseTabDialog
          tabId={closingTabId}
          onClose={() => setClosingTabId(null)}
        />
      )}
    </>
  );
}
