import { useAppStore } from './appStore';
import { ensureDataDir, saveState, loadState } from '../utils/tauriCommands';
import type { PersistedState } from '../types';
import { SCHEMA_VERSION } from '../utils/constants';

export async function persistState(): Promise<void> {
  const state = useAppStore.getState().getSerializableState();
  const json = JSON.stringify(state);
  await saveState(json);
  useAppStore.getState().markSaved();
}

export async function restoreState(): Promise<boolean> {
  try {
    await ensureDataDir();
    const json = await loadState();
    const parsed: PersistedState = JSON.parse(json);

    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      console.warn('State schema version mismatch, using default state');
      return false;
    }

    useAppStore.getState().loadPersistedState(parsed);
    return true;
  } catch {
    console.log('No saved state found, starting fresh');
    return false;
  }
}
