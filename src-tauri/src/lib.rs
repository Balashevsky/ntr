use serde_json;
use std::fs;
use std::path::PathBuf;
use tauri::{Emitter, Manager};

fn get_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let data_dir = base.join("ntr-data");
    Ok(data_dir)
}

#[tauri::command]
fn ensure_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    let data_dir = get_data_dir(&app)?;
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create data dir: {}", e))?;
    }
    data_dir
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid path".to_string())
}

#[tauri::command]
fn save_state(app: tauri::AppHandle, data: String) -> Result<(), String> {
    let data_dir = get_data_dir(&app)?;
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create data dir: {}", e))?;
    }

    let state_path = data_dir.join("state.json");
    let backup_path = data_dir.join("state.backup.json");

    // Validate JSON before writing
    serde_json::from_str::<serde_json::Value>(&data)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    // Rotate: current -> backup
    if state_path.exists() {
        let _ = fs::copy(&state_path, &backup_path);
    }

    // Write new state
    fs::write(&state_path, &data)
        .map_err(|e| format!("Failed to write state: {}", e))?;

    Ok(())
}

#[tauri::command]
fn load_state(app: tauri::AppHandle) -> Result<String, String> {
    let data_dir = get_data_dir(&app)?;
    let state_path = data_dir.join("state.json");
    let backup_path = data_dir.join("state.backup.json");

    // Try main state file first
    if state_path.exists() {
        match fs::read_to_string(&state_path) {
            Ok(content) => {
                // Validate JSON
                if serde_json::from_str::<serde_json::Value>(&content).is_ok() {
                    return Ok(content);
                }
            }
            Err(_) => {}
        }
    }

    // Fallback to backup
    if backup_path.exists() {
        match fs::read_to_string(&backup_path) {
            Ok(content) => {
                if serde_json::from_str::<serde_json::Value>(&content).is_ok() {
                    return Ok(content);
                }
            }
            Err(_) => {}
        }
    }

    // No state found
    Err("No saved state found".to_string())
}

fn find_file_in_args(args: &[String]) -> Option<String> {
    for arg in args.iter().skip(1) {
        if arg.starts_with('-') || arg.is_empty() {
            continue;
        }
        let path = std::path::Path::new(arg);
        if path.is_file() {
            return Some(arg.clone());
        }
    }
    None
}

#[tauri::command]
fn get_cli_file_path() -> Option<String> {
    let args: Vec<String> = std::env::args().collect();
    find_file_in_args(&args)
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file '{}': {}", path, e))
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content)
        .map_err(|e| format!("Failed to write file '{}': {}", path, e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // Second instance launched with a file -- send it to the existing window
            if let Some(file_path) = find_file_in_args(&args) {
                let _ = app.emit("open-file", file_path);
            }
            // Focus the existing window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            ensure_data_dir,
            save_state,
            load_state,
            read_file,
            write_file,
            get_cli_file_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
