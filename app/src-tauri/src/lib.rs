use std::fs::{create_dir_all, File, metadata, read_dir, copy as fs_copy};
use std::io::{copy, Read};
use std::path::Path;
use zip::ZipArchive;
use sha2::{Sha256, Digest};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn extract_zip(zip_path: String, dest_dir: String) -> Result<(), String> {
    let file = File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = Path::new(&dest_dir).join(file.name());

        if file.name().ends_with('/') {
            create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(p) = outpath.parent() {
                create_dir_all(p).map_err(|e| e.to_string())?;
            }
            let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
            copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
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
        symlink_dir(source_path, target_path).map_err(|e| {
            format!("Failed to create symlink: {} -> {}: {}", source, target, e)
        })?;
    }

    // On Unix-like systems, use standard symlinks
    #[cfg(not(target_os = "windows"))]
    {
        use std::os::unix::fs::symlink;
        symlink(source_path, target_path).map_err(|e| {
            format!("Failed to create symlink: {} -> {}: {}", source, target, e)
        })?;
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
        std::fs::remove_dir(symlink_path).map_err(|e| {
            format!("Failed to remove symlink {}: {}", path, e)
        })?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        // On Unix, remove symlink
        std::fs::remove_file(symlink_path).map_err(|e| {
            format!("Failed to remove symlink {}: {}", path, e)
        })?;
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
    let mut file = File::open(&file_path)
        .map_err(|e| format!("Failed to open file {}: {}", file_path, e))?;

    let mut hasher = Sha256::new();
    let mut buffer = [0; 1024 * 64]; // 64KB buffer

    loop {
        let bytes_read = file.read(&mut buffer)
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

/// Helper function to recursively copy directories
fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    for entry in read_dir(src)? {
        let entry = entry?;
        let path = entry.path();
        let file_name = entry.file_name();
        let target_path = dst.join(&file_name);

        if path.is_dir() {
            // Recursively copy subdirectory
            create_dir_all(&target_path)?;
            copy_dir_recursive(&path, &target_path)?;
        } else {
            // Copy file
            fs_copy(&path, &target_path)?;
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
