import { invoke } from '@tauri-apps/api/core';

export async function ensureDataDir(): Promise<string> {
  return invoke<string>('ensure_data_dir');
}

export async function saveState(data: string): Promise<void> {
  return invoke('save_state', { data });
}

export async function loadState(): Promise<string> {
  return invoke<string>('load_state');
}

export async function readFile(path: string): Promise<string> {
  return invoke<string>('read_file', { path });
}

export async function writeFile(path: string, content: string): Promise<void> {
  return invoke('write_file', { path, content });
}

export async function getCliFilePath(): Promise<string | null> {
  return invoke<string | null>('get_cli_file_path');
}
