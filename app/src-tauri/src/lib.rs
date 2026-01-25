use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::{copy as fs_copy, create_dir_all, metadata, read_dir, remove_dir_all, File};
use std::io::{copy, Read, Write};
use std::path::Path;
use std::sync::Mutex;
use std::time::Instant;
use uuid::Uuid;
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

/// Result of ZIP content analysis for fake mod detection
#[derive(Serialize, Deserialize)]
pub struct ZipAnalysis {
    /// Whether the ZIP contains any .package files
    pub has_package_files: bool,
    /// Whether the ZIP contains any .ts4script files
    pub has_ts_script: bool,
    /// List of all files in the ZIP
    pub file_list: Vec<String>,
    /// List of suspicious files (README, HTML, URL shortcuts, etc.)
    pub suspicious_files: Vec<String>,
    /// Total number of files in the ZIP
    pub total_files: usize,
}

/// Analyze ZIP content for fake mod detection
/// Returns information about the files contained in the ZIP without extracting
#[tauri::command]
fn analyze_zip_content(zip_path: String) -> Result<ZipAnalysis, String> {
    let file = File::open(&zip_path).map_err(|e| format!("Failed to open ZIP: {}", e))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("Invalid ZIP file: {}", e))?;

    let mut has_package_files = false;
    let mut has_ts_script = false;
    let mut file_list: Vec<String> = Vec::new();
    let mut suspicious_files: Vec<String> = Vec::new();

    // Suspicious file patterns
    let suspicious_extensions = [".url", ".lnk", ".html", ".htm", ".webloc"];
    let suspicious_names = ["readme", "patreon", "support", "donate", "link", "discord"];

    for i in 0..archive.len() {
        let file = archive.by_index(i).map_err(|e| format!("Failed to read ZIP entry: {}", e))?;
        let name = file.name().to_string();
        let name_lower = name.to_lowercase();

        // Skip directory entries
        if name.ends_with('/') || name.ends_with('\\') {
            continue;
        }

        file_list.push(name.clone());

        // Check for valid mod files
        if name_lower.ends_with(".package") {
            has_package_files = true;
        }
        if name_lower.ends_with(".ts4script") {
            has_ts_script = true;
        }

        // Check for suspicious files
        let is_suspicious = suspicious_extensions.iter().any(|ext| name_lower.ends_with(ext))
            || suspicious_names
                .iter()
                .any(|pattern| name_lower.contains(pattern));

        if is_suspicious {
            suspicious_files.push(name);
        }
    }

    Ok(ZipAnalysis {
        has_package_files,
        has_ts_script,
        file_list,
        suspicious_files,
        total_files: archive.len(),
    })
}

/// Result of disk benchmark
#[derive(Serialize, Deserialize)]
pub struct DiskBenchmarkResult {
    /// Measured disk speed in MB/s
    pub speed_mbps: u64,
    /// Total bytes written during benchmark
    pub bytes_written: u64,
    /// Time taken in milliseconds
    pub elapsed_ms: u64,
}

/// Benchmark disk write speed by writing test files directly in Rust
/// This avoids IPC overhead and gives accurate disk performance measurement
#[tauri::command]
fn benchmark_disk_speed(app_handle: tauri::AppHandle) -> Result<DiskBenchmarkResult, String> {
    use tauri::Manager;

    // Get app data directory for temp files
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let benchmark_dir = app_data_dir.join("benchmark_temp");

    // Create benchmark directory
    create_dir_all(&benchmark_dir)
        .map_err(|e| format!("Failed to create benchmark directory: {}", e))?;

    // Configuration: 5 files of 50MB each = 250MB total
    // Larger files reduce overhead impact and give more accurate measurements
    const FILE_COUNT: usize = 5;
    const FILE_SIZE: usize = 50 * 1024 * 1024; // 50MB per file
    const TOTAL_BYTES: u64 = (FILE_COUNT * FILE_SIZE) as u64;

    // Generate test data (pseudo-random pattern)
    let test_data: Vec<u8> = (0..FILE_SIZE)
        .map(|i| ((i * 17 + 31) % 256) as u8)
        .collect();

    // Measure write time
    let start = Instant::now();

    for i in 0..FILE_COUNT {
        let file_path = benchmark_dir.join(format!("bench_{}.bin", i));
        let mut file = File::create(&file_path)
            .map_err(|e| format!("Failed to create benchmark file: {}", e))?;

        file.write_all(&test_data)
            .map_err(|e| format!("Failed to write benchmark file: {}", e))?;

        // Ensure data is flushed to disk
        file.sync_all()
            .map_err(|e| format!("Failed to sync benchmark file: {}", e))?;
    }

    let elapsed = start.elapsed();
    let elapsed_ms = elapsed.as_millis() as u64;

    // Calculate speed in MB/s
    let speed_mbps = if elapsed_ms > 0 {
        (TOTAL_BYTES / (1024 * 1024)) * 1000 / elapsed_ms
    } else {
        1000 // If too fast to measure, assume very fast
    };

    // Cleanup benchmark files
    if let Err(e) = remove_dir_all(&benchmark_dir) {
        eprintln!("Warning: Failed to cleanup benchmark directory: {}", e);
    }

    Ok(DiskBenchmarkResult {
        speed_mbps,
        bytes_written: TOTAL_BYTES,
        elapsed_ms,
    })
}

/// Get or create a persistent machine ID for fake mod reporting
/// The ID is stored in the app data directory and persists across sessions
#[tauri::command]
fn get_or_create_machine_id(app_handle: tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;

    // Get app data directory
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let machine_id_file = app_data_dir.join("machine_id");

    // Try to read existing machine ID
    if machine_id_file.exists() {
        match std::fs::read_to_string(&machine_id_file) {
            Ok(existing_id) => {
                let trimmed = existing_id.trim();
                // Validate it's a valid UUID
                if !trimmed.is_empty() && Uuid::parse_str(trimmed).is_ok() {
                    return Ok(trimmed.to_string());
                }
            }
            Err(_) => {
                // File exists but couldn't be read, will regenerate
            }
        }
    }

    // Generate new UUID
    let new_id = Uuid::new_v4().to_string();

    // Ensure directory exists
    if let Some(parent) = machine_id_file.parent() {
        create_dir_all(parent).map_err(|e| format!("Failed to create app data directory: {}", e))?;
    }

    // Write new ID
    let mut file = File::create(&machine_id_file)
        .map_err(|e| format!("Failed to create machine ID file: {}", e))?;
    file.write_all(new_id.as_bytes())
        .map_err(|e| format!("Failed to write machine ID: {}", e))?;

    Ok(new_id)
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
            copy_directory,
            analyze_zip_content,
            get_or_create_machine_id,
            benchmark_disk_speed
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
