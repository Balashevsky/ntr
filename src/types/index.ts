export type PastelColor =
  | '#ffffff'
  | '#e8e8e8'
  | '#cccccc'
  | '#aaaaaa'
  | '#888888'
  | '#e8d0d0'
  | '#e8dcc8'
  | '#d0e0d0'
  | '#c8d8e8'
  | '#d8d0e0';

export type ThemeName = 'monokai' | 'sixteen' | 'celeste' | 'breeze';

export interface Tab {
  id: string;
  type: 'file' | 'note';
  name: string;
  content: string;
  filePath: string | null;
  isVisible: boolean;
  cursorPosition: number;
  scrollTop: number;
  workspaceId: string;
  createdAt: number;
  updatedAt: number;
}

export interface Workspace {
  id: string;
  name: string;
  comment: string;
  color: PastelColor;
  tabOrder: string[];
  isVisible: boolean;
  createdAt: number;
}

export interface AppState {
  workspaces: Record<string, Workspace>;
  tabs: Record<string, Tab>;
  activeWorkspaceId: string;
  activeTabId: string | null;
  isWorkspacePanelOpen: boolean;
  lastSavedAt: number;
  schemaVersion: number;
  theme: ThemeName;
  editorZoom: number;
  workspaceOrder: string[];
  showHiddenWorkspaces: boolean;
  customAccentColor: string | null;
  customEyeColor: string | null;
  customCaretColor: string | null;
  caretWidth: number;
  caretHeightPercent: number;
}

export interface PersistedState {
  workspaces: Record<string, Workspace>;
  tabs: Record<string, Tab>;
  activeWorkspaceId: string;
  activeTabId: string | null;
  isWorkspacePanelOpen: boolean;
  lastSavedAt: number;
  schemaVersion: number;
  theme?: ThemeName;
  editorZoom?: number;
  workspaceOrder?: string[];
  showHiddenWorkspaces?: boolean;
  customAccentColor?: string | null;
  customEyeColor?: string | null;
  customCaretColor?: string | null;
  caretWidth?: number;
  caretHeightPercent?: number;
}
