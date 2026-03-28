import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Tab, Workspace, AppState, PastelColor, PersistedState, ThemeName } from '../types';
import { DEFAULT_WORKSPACE_ID, SCHEMA_VERSION } from '../utils/constants';

interface AppActions {
  // Tab actions
  createNoteTab: () => void;
  openFileTab: (filePath: string, fileName: string, content: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  renameTab: (tabId: string, newName: string) => void;
  toggleTabVisibility: (tabId: string) => void;
  moveTabToWorkspace: (tabId: string, targetWorkspaceId: string) => void;
  reorderTab: (tabId: string, targetIndex: number, workspaceId: string) => void;
  updateTabScroll: (tabId: string, scrollTop: number) => void;
  updateTabCursor: (tabId: string, cursorPosition: number) => void;
  saveTabAsFile: (tabId: string, filePath: string) => void;

  // Workspace actions
  createWorkspace: () => void;
  deleteWorkspace: (workspaceId: string) => void;
  renameWorkspace: (workspaceId: string, name: string) => void;
  updateWorkspaceComment: (workspaceId: string, comment: string) => void;
  updateWorkspaceColor: (workspaceId: string, color: PastelColor) => void;
  setActiveWorkspace: (workspaceId: string) => void;
  toggleWorkspaceVisibility: (workspaceId: string) => void;
  reorderWorkspace: (workspaceId: string, targetIndex: number) => void;

  // Panel
  toggleWorkspacePanel: () => void;
  toggleShowHiddenWorkspaces: () => void;

  // Theme
  setTheme: (theme: ThemeName) => void;

  // Custom colors
  setCustomAccentColor: (color: string | null) => void;
  setCustomEyeColor: (color: string | null) => void;
  setCustomCaretColor: (color: string | null) => void;

  // Caret
  setCaretWidth: (width: number) => void;
  setCaretHeightPercent: (percent: number) => void;

  // Zoom
  setEditorZoom: (zoom: number) => void;

  // Persistence
  getSerializableState: () => PersistedState;
  loadPersistedState: (state: PersistedState) => void;
  markSaved: () => void;
}

type Store = AppState & AppActions;

function createDefaultState(): AppState {
  return {
    workspaces: {
      [DEFAULT_WORKSPACE_ID]: {
        id: DEFAULT_WORKSPACE_ID,
        name: 'Default',
        comment: '',
        color: '#ffffff',
        tabOrder: [],
        isVisible: true,
        createdAt: Date.now(),
      },
    },
    tabs: {},
    activeWorkspaceId: DEFAULT_WORKSPACE_ID,
    activeTabId: null,
    isWorkspacePanelOpen: false,
    lastSavedAt: 0,
    schemaVersion: SCHEMA_VERSION,
    theme: 'monokai',
    editorZoom: 14,
    workspaceOrder: [DEFAULT_WORKSPACE_ID],
    showHiddenWorkspaces: true,
    customAccentColor: null,
    customEyeColor: null,
    customCaretColor: null,
    caretWidth: 2,
    caretHeightPercent: 100,
  };
}

function getTabDisplayName(tab: Tab): string {
  if (tab.name) return tab.name;
  const firstLine = tab.content.split('\n')[0]?.trim();
  if (firstLine) return firstLine.substring(0, 30);
  return 'Untitled';
}

export { getTabDisplayName };

export const useAppStore = create<Store>((set, get) => ({
  ...createDefaultState(),

  createNoteTab: () => {
    const id = nanoid();
    const { activeWorkspaceId } = get();
    const tab: Tab = {
      id,
      type: 'note',
      name: '',
      content: '',
      filePath: null,
      isVisible: true,
      cursorPosition: 0,
      scrollTop: 0,
      workspaceId: activeWorkspaceId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({
      tabs: { ...state.tabs, [id]: tab },
      workspaces: {
        ...state.workspaces,
        [activeWorkspaceId]: {
          ...state.workspaces[activeWorkspaceId],
          tabOrder: [...state.workspaces[activeWorkspaceId].tabOrder, id],
        },
      },
      activeTabId: id,
    }));
  },

  openFileTab: (filePath: string, fileName: string, content: string) => {
    const { tabs, activeWorkspaceId } = get();
    const existing = Object.values(tabs).find((t) => t.filePath === filePath);
    if (existing) {
      set({ activeTabId: existing.id, activeWorkspaceId: existing.workspaceId });
      return;
    }

    const id = nanoid();
    const tab: Tab = {
      id,
      type: 'file',
      name: fileName,
      content,
      filePath,
      isVisible: true,
      cursorPosition: 0,
      scrollTop: 0,
      workspaceId: activeWorkspaceId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({
      tabs: { ...state.tabs, [id]: tab },
      workspaces: {
        ...state.workspaces,
        [activeWorkspaceId]: {
          ...state.workspaces[activeWorkspaceId],
          tabOrder: [...state.workspaces[activeWorkspaceId].tabOrder, id],
        },
      },
      activeTabId: id,
    }));
  },

  closeTab: (tabId: string) => {
    const { tabs, workspaces, activeTabId, activeWorkspaceId } = get();
    const tab = tabs[tabId];
    if (!tab) return;

    const workspace = workspaces[tab.workspaceId];
    const newTabOrder = workspace.tabOrder.filter((id) => id !== tabId);

    let newActiveTabId = activeTabId;
    if (activeTabId === tabId) {
      if (newTabOrder.length > 0) {
        const oldIndex = workspace.tabOrder.indexOf(tabId);
        const newIndex = Math.min(oldIndex, newTabOrder.length - 1);
        newActiveTabId = newTabOrder[newIndex];
      } else {
        newActiveTabId = null;
      }
    }

    const newTabs = { ...tabs };
    delete newTabs[tabId];

    set({
      tabs: newTabs,
      workspaces: {
        ...workspaces,
        [tab.workspaceId]: {
          ...workspace,
          tabOrder: newTabOrder,
        },
      },
      activeTabId: tab.workspaceId === activeWorkspaceId ? newActiveTabId : activeTabId,
    });
  },

  setActiveTab: (tabId: string) => {
    set({ activeTabId: tabId });
  },

  updateTabContent: (tabId: string, content: string) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, content, updatedAt: Date.now() },
        },
      };
    });
  },

  renameTab: (tabId: string, newName: string) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab || tab.type !== 'note') return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, name: newName, updatedAt: Date.now() },
        },
      };
    });
  },

  toggleTabVisibility: (tabId: string) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      const newVisible = !tab.isVisible;
      const newTabs = {
        ...state.tabs,
        [tabId]: { ...tab, isVisible: newVisible },
      };

      let newActiveTabId = state.activeTabId;
      if (!newVisible && state.activeTabId === tabId) {
        const ws = state.workspaces[tab.workspaceId];
        if (ws && tab.workspaceId === state.activeWorkspaceId) {
          const nextVisible = ws.tabOrder.find(
            (id) => id !== tabId && newTabs[id]?.isVisible
          );
          newActiveTabId = nextVisible ?? null;
        }
      }
      if (newVisible && !state.activeTabId && tab.workspaceId === state.activeWorkspaceId) {
        newActiveTabId = tabId;
      }

      return { tabs: newTabs, activeTabId: newActiveTabId };
    });
  },

  moveTabToWorkspace: (tabId: string, targetWorkspaceId: string) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab || tab.workspaceId === targetWorkspaceId) return state;
      if (!state.workspaces[targetWorkspaceId]) return state;

      const sourceWorkspace = state.workspaces[tab.workspaceId];
      const targetWorkspace = state.workspaces[targetWorkspaceId];

      const newSourceOrder = sourceWorkspace.tabOrder.filter((id) => id !== tabId);
      const newTargetOrder = [...targetWorkspace.tabOrder, tabId];

      let newActiveTabId = state.activeTabId;
      if (state.activeTabId === tabId && tab.workspaceId === state.activeWorkspaceId) {
        newActiveTabId = newSourceOrder.length > 0 ? newSourceOrder[0] : null;
      }

      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, workspaceId: targetWorkspaceId },
        },
        workspaces: {
          ...state.workspaces,
          [tab.workspaceId]: { ...sourceWorkspace, tabOrder: newSourceOrder },
          [targetWorkspaceId]: { ...targetWorkspace, tabOrder: newTargetOrder },
        },
        activeTabId: newActiveTabId,
      };
    });
  },

  reorderTab: (tabId: string, targetIndex: number, workspaceId: string) => {
    set((state) => {
      const ws = state.workspaces[workspaceId];
      if (!ws) return state;
      const currentIndex = ws.tabOrder.indexOf(tabId);
      if (currentIndex === -1) return state;
      if (currentIndex === targetIndex) return state;

      const newOrder = [...ws.tabOrder];
      newOrder.splice(currentIndex, 1);
      const insertAt = Math.min(targetIndex, newOrder.length);
      newOrder.splice(insertAt, 0, tabId);

      return {
        workspaces: {
          ...state.workspaces,
          [workspaceId]: { ...ws, tabOrder: newOrder },
        },
      };
    });
  },

  updateTabScroll: (tabId: string, scrollTop: number) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: { ...state.tabs, [tabId]: { ...tab, scrollTop } },
      };
    });
  },

  updateTabCursor: (tabId: string, cursorPosition: number) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: { ...state.tabs, [tabId]: { ...tab, cursorPosition } },
      };
    });
  },

  saveTabAsFile: (tabId: string, filePath: string) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      const fileName = filePath.split(/[/\\]/).pop() || 'Untitled';
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, type: 'file' as const, filePath, name: fileName, updatedAt: Date.now() },
        },
      };
    });
  },

  createWorkspace: () => {
    const id = nanoid();
    const { workspaces } = get();
    const count = Object.keys(workspaces).length;

    const workspace: Workspace = {
      id,
      name: `Workspace ${count + 1}`,
      comment: '',
      color: '#ffffff' as PastelColor,
      tabOrder: [],
      isVisible: true,
      createdAt: Date.now(),
    };
    set((state) => ({
      workspaces: { ...state.workspaces, [id]: workspace },
      workspaceOrder: [...state.workspaceOrder, id],
    }));
  },

  deleteWorkspace: (workspaceId: string) => {
    if (workspaceId === DEFAULT_WORKSPACE_ID) return;
    const { workspaces, tabs, activeWorkspaceId } = get();
    const workspace = workspaces[workspaceId];
    if (!workspace) return;

    const newTabs = { ...tabs };
    const defaultWorkspace = workspaces[DEFAULT_WORKSPACE_ID];
    const newDefaultOrder = [...defaultWorkspace.tabOrder];

    for (const tabId of workspace.tabOrder) {
      const tab = newTabs[tabId];
      if (!tab) continue;
      if (tab.type === 'file') {
        newTabs[tabId] = { ...tab, workspaceId: DEFAULT_WORKSPACE_ID };
        newDefaultOrder.push(tabId);
      } else {
        delete newTabs[tabId];
      }
    }

    const newWorkspaces = { ...workspaces };
    delete newWorkspaces[workspaceId];
    newWorkspaces[DEFAULT_WORKSPACE_ID] = {
      ...defaultWorkspace,
      tabOrder: newDefaultOrder,
    };

    set((state) => ({
      workspaces: newWorkspaces,
      tabs: newTabs,
      workspaceOrder: state.workspaceOrder.filter((id) => id !== workspaceId),
      activeWorkspaceId:
        activeWorkspaceId === workspaceId ? DEFAULT_WORKSPACE_ID : activeWorkspaceId,
      activeTabId:
        activeWorkspaceId === workspaceId && newDefaultOrder.length > 0
          ? newDefaultOrder[0]
          : activeWorkspaceId === workspaceId
            ? null
            : get().activeTabId,
    }));
  },

  renameWorkspace: (workspaceId: string, name: string) => {
    set((state) => {
      const ws = state.workspaces[workspaceId];
      if (!ws) return state;
      return {
        workspaces: { ...state.workspaces, [workspaceId]: { ...ws, name } },
      };
    });
  },

  updateWorkspaceComment: (workspaceId: string, comment: string) => {
    set((state) => {
      const ws = state.workspaces[workspaceId];
      if (!ws) return state;
      return {
        workspaces: { ...state.workspaces, [workspaceId]: { ...ws, comment } },
      };
    });
  },

  updateWorkspaceColor: (workspaceId: string, color: PastelColor) => {
    set((state) => {
      const ws = state.workspaces[workspaceId];
      if (!ws) return state;
      return {
        workspaces: { ...state.workspaces, [workspaceId]: { ...ws, color } },
      };
    });
  },

  setActiveWorkspace: (workspaceId: string) => {
    const { workspaces, tabs } = get();
    const ws = workspaces[workspaceId];
    if (!ws) return;
    const firstVisibleTab = ws.tabOrder.find((id) => {
      const tab = tabs[id];
      return tab?.isVisible;
    });
    set({
      activeWorkspaceId: workspaceId,
      activeTabId: firstVisibleTab ?? null,
    });
  },

  toggleWorkspaceVisibility: (workspaceId: string) => {
    set((state) => {
      const ws = state.workspaces[workspaceId];
      if (!ws) return state;
      return {
        workspaces: {
          ...state.workspaces,
          [workspaceId]: { ...ws, isVisible: !ws.isVisible },
        },
      };
    });
  },

  reorderWorkspace: (workspaceId: string, targetIndex: number) => {
    set((state) => {
      const currentIndex = state.workspaceOrder.indexOf(workspaceId);
      if (currentIndex === -1 || currentIndex === targetIndex) return state;

      const newOrder = [...state.workspaceOrder];
      newOrder.splice(currentIndex, 1);
      const insertAt = Math.min(targetIndex, newOrder.length);
      newOrder.splice(insertAt, 0, workspaceId);

      return { workspaceOrder: newOrder };
    });
  },

  toggleWorkspacePanel: () => {
    set((state) => ({ isWorkspacePanelOpen: !state.isWorkspacePanelOpen }));
  },

  toggleShowHiddenWorkspaces: () => {
    set((state) => ({ showHiddenWorkspaces: !state.showHiddenWorkspaces }));
  },

  setTheme: (theme: ThemeName) => {
    set({ theme });
  },

  setCustomAccentColor: (color: string | null) => {
    set({ customAccentColor: color });
  },

  setCustomEyeColor: (color: string | null) => {
    set({ customEyeColor: color });
  },

  setCustomCaretColor: (color: string | null) => {
    set({ customCaretColor: color });
  },

  setCaretWidth: (width: number) => {
    set({ caretWidth: Math.max(1, Math.min(6, width)) });
  },

  setCaretHeightPercent: (percent: number) => {
    set({ caretHeightPercent: Math.max(50, Math.min(120, percent)) });
  },

  setEditorZoom: (zoom: number) => {
    const clamped = Math.max(8, Math.min(32, zoom));
    set({ editorZoom: clamped });
  },

  getSerializableState: () => {
    const { workspaces, tabs, activeWorkspaceId, activeTabId, isWorkspacePanelOpen, lastSavedAt, schemaVersion, theme, editorZoom, workspaceOrder, showHiddenWorkspaces, customAccentColor, customEyeColor, customCaretColor, caretWidth, caretHeightPercent } = get();
    return { workspaces, tabs, activeWorkspaceId, activeTabId, isWorkspacePanelOpen, lastSavedAt, schemaVersion, theme, editorZoom, workspaceOrder, showHiddenWorkspaces, customAccentColor, customEyeColor, customCaretColor, caretWidth, caretHeightPercent };
  },

  loadPersistedState: (state: PersistedState) => {
    // Migrate workspaces: ensure isVisible exists
    const migratedWorkspaces: Record<string, import('../types').Workspace> = {};
    for (const [id, ws] of Object.entries(state.workspaces)) {
      migratedWorkspaces[id] = {
        ...ws,
        isVisible: ws.isVisible ?? true,
      };
    }

    // Derive workspaceOrder if missing
    const workspaceOrder = state.workspaceOrder ??
      Object.values(migratedWorkspaces)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((w) => w.id);

    set({
      workspaces: migratedWorkspaces,
      tabs: state.tabs,
      activeWorkspaceId: state.activeWorkspaceId,
      activeTabId: state.activeTabId,
      isWorkspacePanelOpen: state.isWorkspacePanelOpen,
      lastSavedAt: state.lastSavedAt,
      schemaVersion: state.schemaVersion,
      theme: state.theme ?? 'monokai',
      editorZoom: state.editorZoom ?? 14,
      workspaceOrder,
      showHiddenWorkspaces: state.showHiddenWorkspaces ?? true,
      customAccentColor: state.customAccentColor ?? null,
      customEyeColor: state.customEyeColor ?? null,
      customCaretColor: state.customCaretColor ?? null,
      caretWidth: state.caretWidth ?? 2,
      caretHeightPercent: state.caretHeightPercent ?? 100,
    });
  },

  markSaved: () => {
    set({ lastSavedAt: Date.now() });
  },
}));
