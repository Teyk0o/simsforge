use rayon::prelude::*;
use sha2::{Digest, Sha256};
use std::fs::{copy as fs_copy, create_dir_all, metadata, read_dir, File};
use std::io::{copy, Read};
use std::path::Path;
use std::sync::Mutex;
use zip::ZipArchive;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn extract_zip(zip_path: String, dest_dir: String) -> Result<(), String> {
    let file = File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;

    // First pass: collect all file metadata and content (must be sequential due to ZipArchive)
    let mut files_to_create: Vec<(String, Vec<u8>, bool)> = Vec::new();
    let mut dirs_to_create: Vec<String> = Vec::new();

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = file.name().to_string();

        if name.ends_with('/') {
            dirs_to_create.push(name);
        } else {
            // Read file content into memory
            let mut buffer = Vec::new();
            copy(&mut file, &mut buffer).map_err(|e| e.to_string())?;
            files_to_create.push((name, buffer, false));
        }
    }

    // Create all directories first (sequential to avoid race conditions)
    for dir_name in dirs_to_create {
        let outpath = Path::new(&dest_dir).join(&dir_name);
        create_dir_all(&outpath).map_err(|e| e.to_string())?;
    }

    // Create parent directories for all files (sequential)
    for (file_name, _, _) in &files_to_create {
        let outpath = Path::new(&dest_dir).join(file_name);
        if let Some(p) = outpath.parent() {
            create_dir_all(p).map_err(|e| e.to_string())?;
        }
    }

    // Second pass: write all files in parallel with rayon
    let error_mutex = Mutex::new(Option::<String>::None);

    files_to_create
        .par_iter()
        .for_each(|(file_name, content, _)| {
            if error_mutex.lock().unwrap().is_some() {
                return;
            }

            let outpath = Path::new(&dest_dir).join(file_name);
            if let Err(e) = std::fs::write(&outpath, content) {
                *error_mutex.lock().unwrap() =
                    Some(format!("Failed to write {}: {}", file_name, e));
            }
        });

    // Check for errors from parallel operations
    if let Some(e) = error_mutex.into_inner().unwrap() {
        return Err(e);
    }

    Ok(())
}

/// Create a symbolic link (directory junction on Windows, symlink on Unix)
#[tauri::command]
fn create_symlink(source: String, target: String) -> Result<(), String> {
    let source_path = Path::new(&source);
    let target_path = Path::new(&target);

    // Remove existing target if it exists
    if target_path.exists() || target_path.is_symlink() {
        std::fs::remove_dir_all(target_path).map_err(|e| e.to_string())?;
    }

    // On Windows, use directory junctions (no admin required)
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::fs::symlink_dir;
        symlink_dir(source_path, target_path)
            .map_err(|e| format!("Failed to create symlink: {} -> {}: {}", source, target, e))?;
    }

    // On Unix-like systems, use standard symlinks
    #[cfg(not(target_os = "windows"))]
    {
        use std::os::unix::fs::symlink;
        symlink(source_path, target_path)
            .map_err(|e| format!("Failed to create symlink: {} -> {}: {}", source, target, e))?;
    }

    Ok(())
}

/// Remove a symbolic link or directory
#[tauri::command]
fn remove_symlink(path: String) -> Result<(), String> {
    let symlink_path = Path::new(&path);

    if !symlink_path.exists() && !symlink_path.is_symlink() {
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        // On Windows, remove directory junction
        std::fs::remove_dir(symlink_path)
            .map_err(|e| format!("Failed to remove symlink {}: {}", path, e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        // On Unix, remove symlink
        std::fs::remove_file(symlink_path)
            .map_err(|e| format!("Failed to remove symlink {}: {}", path, e))?;
    }

    Ok(())
}

/// List all symlinks in a directory
#[tauri::command]
fn list_symlinks(directory: String) -> Result<Vec<String>, String> {
    let dir_path = Path::new(&directory);
    let mut symlinks = Vec::new();

    if !dir_path.exists() {
        return Ok(symlinks);
    }

    let entries = read_dir(dir_path).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.is_symlink() {
            if let Some(path_str) = path.to_str() {
                symlinks.push(path_str.to_string());
            }
        }
    }

    Ok(symlinks)
}

/// Calculate SHA-256 hash of a file
#[tauri::command]
fn calculate_file_hash(file_path: String) -> Result<String, String> {
    let mut file =
        File::open(&file_path).map_err(|e| format!("Failed to open file {}: {}", file_path, e))?;

    let mut hasher = Sha256::new();
    let mut buffer = [0; 1024 * 64]; // 64KB buffer

    loop {
        let bytes_read = file
            .read(&mut buffer)
            .map_err(|e| format!("Failed to read file {}: {}", file_path, e))?;

        if bytes_read == 0 {
            break;
        }

        hasher.update(&buffer[..bytes_read]);
    }

    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

/// Get file size in bytes
#[tauri::command]
fn get_file_size(file_path: String) -> Result<u64, String> {
    let metadata = metadata(&file_path)
        .map_err(|e| format!("Failed to get file size {}: {}", file_path, e))?;

    Ok(metadata.len())
}

/// Copy a directory recursively from source to target
#[tauri::command]
fn copy_directory(source: String, target: String) -> Result<(), String> {
    let source_path = Path::new(&source);
    let target_path = Path::new(&target);

    // Remove existing target if it exists
    if target_path.exists() {
        std::fs::remove_dir_all(target_path).map_err(|e| e.to_string())?;
    }

    // Create target directory
    create_dir_all(target_path).map_err(|e| e.to_string())?;

    // Recursively copy all files and directories
    copy_dir_recursive(source_path, target_path)
        .map_err(|e| format!("Failed to copy directory: {} -> {}: {}", source, target, e))
}

/// Helper function to recursively copy directories using parallel processing
fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    let entries: Vec<_> = read_dir(src)?.collect::<Result<Vec<_>, std::io::Error>>()?;

    // Create directories first (must be sequential to avoid conflicts)
    for entry in &entries {
        let path = entry.path();
        let file_name = entry.file_name();
        let target_path = dst.join(&file_name);

        if path.is_dir() {
            create_dir_all(&target_path)?;
        }
    }

    // Collect errors from parallel operations
    let error_mutex = Mutex::new(None);

    // Process files in parallel with rayon
    let results: Vec<_> = entries
        .par_iter()
        .map(|entry| {
            let path = entry.path();
            let file_name = entry.file_name();
            let target_path = dst.join(&file_name);

            if path.is_dir() {
                // Recursively copy subdirectory
                if let Err(e) = copy_dir_recursive(&path, &target_path) {
                    return Err(e);
                }
            } else {
                // Copy file
                if let Err(e) = fs_copy(&path, &target_path) {
                    return Err(e);
                }
            }
            Ok(())
        })
        .collect();

    // Check for any errors from parallel operations
    for result in results {
        if let Err(e) = result {
            *error_mutex.lock().unwrap() = Some(e);
        }
    }

    if let Some(e) = error_mutex.into_inner().unwrap() {
        return Err(e);
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            extract_zip,
            create_symlink,
            remove_symlink,
            list_symlinks,
            calculate_file_hash,
            get_file_size,
            copy_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
