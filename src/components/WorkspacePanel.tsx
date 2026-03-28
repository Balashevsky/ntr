import { useState, useRef } from 'react';
import { useAppStore, getTabDisplayName } from '../store/appStore';
import { CloseTabDialog } from './dialogs/CloseTabDialog';
import type { PastelColor } from '../types';
import { PASTEL_COLORS, DEFAULT_WORKSPACE_ID } from '../utils/constants';

export function WorkspacePanel() {
  const isOpen = useAppStore((s) => s.isWorkspacePanelOpen);
  const workspaces = useAppStore((s) => s.workspaces);
  const tabs = useAppStore((s) => s.tabs);
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const workspaceOrder = useAppStore((s) => s.workspaceOrder);
  const showHiddenWorkspaces = useAppStore((s) => s.showHiddenWorkspaces);
  const setActiveWorkspace = useAppStore((s) => s.setActiveWorkspace);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const createWorkspace = useAppStore((s) => s.createWorkspace);
  const deleteWorkspace = useAppStore((s) => s.deleteWorkspace);
  const renameWorkspace = useAppStore((s) => s.renameWorkspace);
  const updateWorkspaceComment = useAppStore((s) => s.updateWorkspaceComment);
  const updateWorkspaceColor = useAppStore((s) => s.updateWorkspaceColor);
  const moveTabToWorkspace = useAppStore((s) => s.moveTabToWorkspace);
  const reorderTab = useAppStore((s) => s.reorderTab);
  const toggleTabVisibility = useAppStore((s) => s.toggleTabVisibility);
  const toggleWorkspaceVisibility = useAppStore((s) => s.toggleWorkspaceVisibility);
  const toggleShowHiddenWorkspaces = useAppStore((s) => s.toggleShowHiddenWorkspaces);
  const reorderWorkspace = useAppStore((s) => s.reorderWorkspace);
  const closeTab = useAppStore((s) => s.closeTab);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editComment, setEditComment] = useState('');
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [collapsedWorkspaces, setCollapsedWorkspaces] = useState<Set<string>>(new Set());
  const [closingTabId, setClosingTabId] = useState<string | null>(null);

  // D&D state
  const [dragOverWsId, setDragOverWsId] = useState<string | null>(null);
  const [dragOverWsSide, setDragOverWsSide] = useState<'top' | 'bottom' | null>(null);
  const [dragOverTabItemId, setDragOverTabItemId] = useState<string | null>(null);
  const [dragOverTabSide, setDragOverTabSide] = useState<'top' | 'bottom' | null>(null);
  const [dragType, setDragType] = useState<'tab' | 'workspace' | null>(null);

  // Refs to avoid redundant state updates during rapid dragOver events
  const dragOverTabRef = useRef<{ id: string | null; side: 'top' | 'bottom' | null }>({ id: null, side: null });
  const dragOverWsRef = useRef<{ id: string | null; side: 'top' | 'bottom' | null }>({ id: null, side: null });

  if (!isOpen) return null;

  // Build workspace list from workspaceOrder
  const allOrdered = workspaceOrder
    .map((id) => workspaces[id])
    .filter(Boolean);

  let workspaceList;
  if (showHiddenWorkspaces) {
    // Show all, but hidden ones go to the bottom
    const visible = allOrdered.filter((ws) => ws.isVisible);
    const hidden = allOrdered.filter((ws) => !ws.isVisible);
    workspaceList = [...visible, ...hidden];
  } else {
    workspaceList = allOrdered.filter((ws) => ws.isVisible);
  }

  const toggleCollapsed = (wsId: string) => {
    setCollapsedWorkspaces((prev) => {
      const next = new Set(prev);
      if (next.has(wsId)) next.delete(wsId);
      else next.add(wsId);
      return next;
    });
  };

  // --- Tab close from workspace panel ---
  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const tab = tabs[tabId];
    if (tab && tab.content.trim() === '' && !tab.name) {
      closeTab(tabId);
      return;
    }
    setClosingTabId(tabId);
  };

  // --- Tab D&D within workspace ---
  const handleTabItemDragOver = (e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const side: 'top' | 'bottom' = e.clientY < midY ? 'top' : 'bottom';

    // Only update state if target or side actually changed
    if (dragOverTabRef.current.id !== tabId || dragOverTabRef.current.side !== side) {
      dragOverTabRef.current = { id: tabId, side };
      setDragOverTabItemId(tabId);
      setDragOverTabSide(side);
      setDragType('tab');
    }
  };

  const handleTabItemDragLeave = () => {
    dragOverTabRef.current = { id: null, side: null };
    setDragOverTabItemId(null);
    setDragOverTabSide(null);
  };

  const handleTabItemDrop = (e: React.DragEvent, targetTabId: string, wsId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedTabId = e.dataTransfer.getData('application/ntr-tab') || e.dataTransfer.getData('text/plain');
    if (!draggedTabId) return;

    setDragOverTabItemId(null);
    setDragOverTabSide(null);
    setDragOverWsId(null);

    const ws = workspaces[wsId];
    if (!ws) return;

    const draggedTab = tabs[draggedTabId];
    if (!draggedTab) return;

    const targetIndex = ws.tabOrder.indexOf(targetTabId);
    const insertIndex = dragOverTabSide === 'bottom' ? targetIndex + 1 : targetIndex;

    if (draggedTab.workspaceId === wsId) {
      reorderTab(draggedTabId, insertIndex, wsId);
    } else {
      moveTabToWorkspace(draggedTabId, wsId);
      // After move, reorder to target position
      setTimeout(() => reorderTab(draggedTabId, insertIndex, wsId), 0);
    }
  };

  // --- Workspace card D&D (for tab drops AND workspace reorder) ---
  const handleCardDragOver = (e: React.DragEvent, wsId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const types = e.dataTransfer.types;
    if (types.includes('application/ntr-workspace')) {
      // Workspace reorder
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const side: 'top' | 'bottom' = e.clientY < midY ? 'top' : 'bottom';

      if (dragOverWsRef.current.id !== wsId || dragOverWsRef.current.side !== side) {
        dragOverWsRef.current = { id: wsId, side };
        setDragOverWsId(wsId);
        setDragOverWsSide(side);
        setDragType('workspace');
      }
    } else {
      // Tab transfer to workspace
      if (dragOverWsRef.current.id !== wsId || dragOverWsRef.current.side !== null) {
        dragOverWsRef.current = { id: wsId, side: null };
        setDragOverWsId(wsId);
        setDragOverWsSide(null);
        setDragType('tab');
      }
    }
  };

  const handleCardDragLeave = (e: React.DragEvent, wsId: string) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      if (dragOverWsRef.current.id === wsId) {
        dragOverWsRef.current = { id: null, side: null };
        setDragOverWsId(null);
        setDragOverWsSide(null);
      }
    }
  };

  const handleCardDrop = (e: React.DragEvent, targetWsId: string) => {
    e.preventDefault();

    const wsData = e.dataTransfer.getData('application/ntr-workspace');
    if (wsData) {
      // Workspace reorder
      const targetIdx = workspaceOrder.indexOf(targetWsId);
      const adjustedIdx = dragOverWsSide === 'bottom' ? targetIdx + 1 : targetIdx;
      reorderWorkspace(wsData, adjustedIdx);
    } else {
      // Tab transfer
      const tabId = e.dataTransfer.getData('application/ntr-tab') || e.dataTransfer.getData('text/plain');
      if (tabId) {
        moveTabToWorkspace(tabId, targetWsId);
      }
    }

    setDragOverWsId(null);
    setDragOverWsSide(null);
    setDragOverTabItemId(null);
    setDragOverTabSide(null);
    setDragType(null);
    dragOverTabRef.current = { id: null, side: null };
    dragOverWsRef.current = { id: null, side: null };
  };

  // --- Workspace card drag start (for reordering workspaces) ---
  const handleWsDragStart = (e: React.DragEvent, wsId: string) => {
    e.dataTransfer.setData('application/ntr-workspace', wsId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // --- Name/comment/color helpers ---
  const handleStartRename = (wsId: string, currentName: string) => {
    setEditingNameId(wsId);
    setEditName(currentName);
  };

  const handleSubmitRename = () => {
    if (editingNameId && editName.trim()) {
      renameWorkspace(editingNameId, editName.trim());
    }
    setEditingNameId(null);
  };

  const handleStartComment = (wsId: string, currentComment: string) => {
    setEditingCommentId(wsId);
    setEditComment(currentComment);
  };

  const handleSubmitComment = () => {
    if (editingCommentId) {
      updateWorkspaceComment(editingCommentId, editComment.trim());
    }
    setEditingCommentId(null);
  };

  const handleColorSelect = (wsId: string, color: PastelColor) => {
    updateWorkspaceColor(wsId, color);
    setColorPickerId(null);
  };

  const confirmDelete = () => {
    if (deletingId) {
      deleteWorkspace(deletingId);
      setDeletingId(null);
    }
  };

  const handleTabClick = (e: React.MouseEvent, tabId: string, wsId: string) => {
    e.stopPropagation();
    if (wsId !== activeWorkspaceId) {
      setActiveWorkspace(wsId);
    }
    setActiveTab(tabId);
  };

  return (
    <div className="workspace-panel">
      <div className="workspace-panel-header">
        <span>Workspaces</span>
        <button
          className={`ws-filter-toggle ${!showHiddenWorkspaces ? 'filter-active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleShowHiddenWorkspaces();
          }}
          title={showHiddenWorkspaces ? 'Hide hidden workspaces' : 'Show all workspaces'}
        >
          {showHiddenWorkspaces ? 'All' : 'Visible'}
        </button>
      </div>
      <div className="workspace-panel-list">
        {workspaceList.map((ws) => {
          const wsTabs = ws.tabOrder
            .map((id) => tabs[id])
            .filter(Boolean);
          const isActive = ws.id === activeWorkspaceId;
          const isCollapsed = collapsedWorkspaces.has(ws.id);

          // D&D visual classes
          const isDragOverTab = dragOverWsId === ws.id && dragType === 'tab' && !dragOverWsSide;
          const isDragOverWsTop = dragOverWsId === ws.id && dragType === 'workspace' && dragOverWsSide === 'top';
          const isDragOverWsBottom = dragOverWsId === ws.id && dragType === 'workspace' && dragOverWsSide === 'bottom';

          const cardClasses = [
            'workspace-card',
            isActive && 'workspace-card-active',
            !ws.isVisible && 'workspace-card-hidden',
            isDragOverTab && 'workspace-card-dragover',
            isDragOverWsTop && 'workspace-card-drop-top',
            isDragOverWsBottom && 'workspace-card-drop-bottom',
          ].filter(Boolean).join(' ');

          return (
            <div
              key={ws.id}
              className={cardClasses}
              onClick={() => setActiveWorkspace(ws.id)}
              onDragOver={(e) => handleCardDragOver(e, ws.id)}
              onDragLeave={(e) => handleCardDragLeave(e, ws.id)}
              onDrop={(e) => handleCardDrop(e, ws.id)}
            >
              <div
                className="workspace-card-header"
                draggable
                onDragStart={(e) => handleWsDragStart(e, ws.id)}
              >
                <div
                  className="workspace-color-dot"
                  style={{ backgroundColor: ws.color }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setColorPickerId(colorPickerId === ws.id ? null : ws.id);
                  }}
                  title="Change color"
                />
                {editingNameId === ws.id ? (
                  <input
                    className="workspace-name-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleSubmitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmitRename();
                      if (e.key === 'Escape') setEditingNameId(null);
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="workspace-name"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStartRename(ws.id, ws.name);
                    }}
                  >
                    {ws.name}
                  </span>
                )}
                <button
                  className={`workspace-eye-toggle ${ws.isVisible ? 'ws-visible' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWorkspaceVisibility(ws.id);
                  }}
                  title={ws.isVisible ? 'Hide workspace' : 'Show workspace'}
                >
                  {ws.isVisible ? '\u25C9' : '\u25CE'}
                </button>
                {ws.id !== DEFAULT_WORKSPACE_ID && (
                  <button
                    className="workspace-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingId(ws.id);
                    }}
                    title="Delete workspace"
                  >
                    x
                  </button>
                )}
              </div>

              {colorPickerId === ws.id && (
                <div
                  className="color-picker"
                  onClick={(e) => e.stopPropagation()}
                >
                  {PASTEL_COLORS.map((color) => (
                    <div
                      key={color}
                      className={`color-option ${ws.color === color ? 'color-option-active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorSelect(ws.id, color)}
                    />
                  ))}
                </div>
              )}

              {editingCommentId === ws.id ? (
                <input
                  className="workspace-comment-input"
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  onBlur={handleSubmitComment}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmitComment();
                    if (e.key === 'Escape') setEditingCommentId(null);
                  }}
                  placeholder="Add a comment..."
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className={`workspace-comment ${ws.comment ? 'workspace-comment-filled' : 'workspace-comment-placeholder'}`}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleStartComment(ws.id, ws.comment);
                  }}
                >
                  {ws.comment || '+comment'}
                </span>
              )}

              {wsTabs.length > 0 && (
                <div
                  className="workspace-tabs-header"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapsed(ws.id);
                  }}
                >
                  <span className={`workspace-tabs-toggle ${isCollapsed ? 'collapsed' : ''}`}>
                    &#9660;
                  </span>
                  <span>Tabs ({wsTabs.length})</span>
                </div>
              )}

              {!isCollapsed && (
                <div className="workspace-tabs-list">
                  {wsTabs.map((tab) => {
                    const isActiveTab = tab.id === activeTabId;
                    const isDropTop = dragOverTabItemId === tab.id && dragOverTabSide === 'top';
                    const isDropBottom = dragOverTabItemId === tab.id && dragOverTabSide === 'bottom';

                    const tabClasses = [
                      'workspace-tab-item',
                      isActiveTab && 'workspace-tab-item-active',
                      isDropTop && 'workspace-tab-item-drop-top',
                      isDropBottom && 'workspace-tab-item-drop-bottom',
                    ].filter(Boolean).join(' ');

                    return (
                      <div
                        key={tab.id}
                        className={tabClasses}
                        onClick={(e) => handleTabClick(e, tab.id, ws.id)}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/ntr-tab', tab.id);
                          e.dataTransfer.setData('text/plain', tab.id);
                          e.dataTransfer.effectAllowed = 'move';
                          e.stopPropagation();
                        }}
                        onDragOver={(e) => handleTabItemDragOver(e, tab.id)}
                        onDragLeave={handleTabItemDragLeave}
                        onDrop={(e) => handleTabItemDrop(e, tab.id, ws.id)}
                      >
                        <button
                          className={`eye-toggle ${tab.isVisible ? 'eye-visible' : 'eye-hidden'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTabVisibility(tab.id);
                          }}
                          title={tab.isVisible ? 'Hide tab' : 'Show tab'}
                        >
                          {tab.isVisible ? '\u25C9' : '\u25CE'}
                        </button>
                        <span className={`workspace-tab-name ${!tab.isVisible ? 'tab-dimmed' : ''}`}>
                          {getTabDisplayName(tab)}
                        </span>
                        <button
                          className="workspace-tab-close-btn"
                          onClick={(e) => handleCloseTab(e, tab.id)}
                          title="Close tab"
                        >
                          x
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {wsTabs.length === 0 && (
                <span className="workspace-empty">Drop tabs here</span>
              )}
            </div>
          );
        })}
      </div>
      <button className="workspace-add-btn" onClick={createWorkspace}>
        + New Workspace
      </button>

      {deletingId && (
        <div className="dialog-overlay" onClick={() => setDeletingId(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <p>
              Delete workspace &quot;{workspaces[deletingId]?.name}&quot;?
            </p>
            <p className="dialog-sub">
              Note tabs will be deleted. File tabs will be moved to Default.
            </p>
            <div className="dialog-actions">
              <button className="dialog-btn" onClick={() => setDeletingId(null)}>
                Cancel
              </button>
              <button className="dialog-btn dialog-btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {closingTabId && (
        <CloseTabDialog
          tabId={closingTabId}
          onClose={() => setClosingTabId(null)}
        />
      )}
    </div>
  );
}
