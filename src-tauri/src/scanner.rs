use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tokio::fs;
use chrono::{Local, TimeZone, Datelike};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub file_name: String,
    pub folder_name: String,
    pub folder_path: String,
    pub absolute_path: String,
    pub file_type: String,
    pub size_bytes: u64,
    pub size_human: String,
    pub created: String,
    pub modified: String,
    pub created_year: i32,
}

impl FileMetadata {
    /// ELITE: Async version using tokio::fs for non-blocking I/O
    pub async fn from_path_async(root_path: &Path, file_path: &Path) -> std::io::Result<Self> {
        let metadata = fs::metadata(file_path).await?;
        
        // Get file name without extension
        let file_stem = file_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_string();
        
        // Get parent folder name
        let folder_name = file_path
            .parent()
            .and_then(|p| p.file_name())
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_string();
        
        // Get relative path from root
        let folder_path = file_path
            .parent()
            .and_then(|p| p.strip_prefix(root_path).ok())
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .unwrap_or_else(|| folder_name.clone());
        
        // Get file extension (uppercase)
        let file_type = file_path
            .extension()
            .and_then(|s| s.to_str())
            .map(|s| s.to_uppercase())
            .unwrap_or_else(|| "".to_string());
        
        // Get file size
        let size_bytes = metadata.len();
        let size_human = format_size(size_bytes);
        
        // Get file dates
        let created = metadata
            .created()
            .ok()
            .and_then(|t| {
                let duration = t.duration_since(std::time::UNIX_EPOCH).ok()?;
                Local.timestamp_opt(duration.as_secs() as i64, 0).single()
            })
            .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
            .unwrap_or_else(|| "".to_string());
        
        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| {
                let duration = t.duration_since(std::time::UNIX_EPOCH).ok()?;
                Local.timestamp_opt(duration.as_secs() as i64, 0).single()
            })
            .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
            .unwrap_or_else(|| "".to_string());
        
        // Extract year from creation date
        let created_year = metadata
            .created()
            .ok()
            .and_then(|t| {
                let duration = t.duration_since(std::time::UNIX_EPOCH).ok()?;
                Local.timestamp_opt(duration.as_secs() as i64, 0).single()
            })
            .map(|dt| dt.year())
            .unwrap_or_else(|| chrono::Local::now().year());
        
        let absolute_path = file_path.to_string_lossy().to_string();
        
        Ok(Self {
            file_name: file_stem,
            folder_name,
            folder_path,
            absolute_path,
            file_type,
            size_bytes,
            size_human,
            created,
            modified,
            created_year,
        })
    }
    
    /// Synchronous version for compatibility (uses spawn_blocking internally)
    pub fn from_path(root_path: &Path, file_path: &Path) -> std::io::Result<Self> {
        // Try to use current runtime handle
        if let Ok(handle) = tokio::runtime::Handle::try_current() {
            return handle.block_on(Self::from_path_async(root_path, file_path));
        }
        
        // Fallback: create temporary runtime
        let rt = tokio::runtime::Runtime::new()
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, format!("Failed to create runtime: {}", e)))?;
        rt.block_on(Self::from_path_async(root_path, file_path))
    }
}

fn format_size(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    let mut size = bytes as f64;
    let mut unit_index = 0;
    
    while size >= 1024.0 && unit_index < UNITS.len() - 1 {
        size /= 1024.0;
        unit_index += 1;
    }
    
    format!("{:.2} {}", size, UNITS[unit_index])
}

/// ELITE: Compute additional file system fields for generic column support
/// Computes parent_folder, folder_depth, file_path_segments, file_extension
pub fn compute_additional_fields(metadata: &FileMetadata) -> serde_json::Value {
    // Compute parent folder (parent of folder_name)
    let parent_folder = PathBuf::from(&metadata.folder_path)
        .parent()
        .and_then(|p| p.file_name())
        .and_then(|s| s.to_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "".to_string());
    
    // Compute folder depth (number of path segments)
    let folder_depth = if metadata.folder_path.is_empty() {
        0
    } else {
        metadata.folder_path.split('/').filter(|s| !s.is_empty()).count()
    };
    
    // Compute file path segments (array of path components)
    let file_path_segments: Vec<String> = if metadata.folder_path.is_empty() {
        vec![]
    } else {
        metadata.folder_path
            .split('/')
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .collect()
    };
    
    // File extension (already computed as file_type, but also store as file_extension)
    let file_extension = metadata.file_type.clone();
    
    serde_json::json!({
        "parent_folder": parent_folder,
        "folder_depth": folder_depth,
        "file_path_segments": file_path_segments,
        "file_extension": file_extension,
    })
}

/// ELITE: Fast async file count - only counts files without reading metadata
/// Uses tokio::fs for non-blocking directory traversal
pub async fn count_files_async(root_path: &Path) -> std::io::Result<usize> {
    // Use a boxed future for recursive async function
    fn walk_dir_count(dir: PathBuf) -> std::pin::Pin<Box<dyn std::future::Future<Output = std::io::Result<usize>> + Send>> {
        Box::pin(async move {
            let mut count = 0;
            let mut entries = fs::read_dir(&dir).await?;
            
            while let Some(entry) = entries.next_entry().await? {
                let path = entry.path();
                let metadata = entry.metadata().await?;
                
                if metadata.is_dir() {
                    count += walk_dir_count(path).await?;
                } else if metadata.is_file() {
                    count += 1;
                }
            }
            
            Ok(count)
        })
    }
    
    walk_dir_count(root_path.to_path_buf()).await
}

/// Synchronous wrapper for count_files_async
pub fn count_files(root_path: &Path) -> std::io::Result<usize> {
    // Try to use current runtime handle
    if let Ok(handle) = tokio::runtime::Handle::try_current() {
        return handle.block_on(count_files_async(root_path));
    }
    
    // Fallback: create temporary runtime
    let rt = tokio::runtime::Runtime::new()
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, format!("Failed to create runtime: {}", e)))?;
    rt.block_on(count_files_async(root_path))
}

/// ELITE: Async folder scanning using tokio::fs for non-blocking I/O
/// Processes directories in parallel for maximum performance
pub async fn scan_folder_async(root_path: &Path) -> std::io::Result<Vec<FileMetadata>> {
    // Use a boxed future for recursive async function
    fn walk_dir(dir: PathBuf, root: PathBuf) -> std::pin::Pin<Box<dyn std::future::Future<Output = std::io::Result<Vec<FileMetadata>>> + Send>> {
        Box::pin(async move {
            let mut files = Vec::new();
            let mut entries = fs::read_dir(&dir).await?;
            
            // Collect all entries first
            let mut subdirs = Vec::new();
            let mut file_paths = Vec::new();
            
            while let Some(entry) = entries.next_entry().await? {
                let path = entry.path();
                let metadata = entry.metadata().await?;
                
                if metadata.is_dir() {
                    subdirs.push(path);
                } else if metadata.is_file() {
                    file_paths.push(path);
                }
            }
            
            // Process files in parallel (ELITE: concurrent file metadata reading)
            let file_futures: Vec<_> = file_paths.into_iter().map(|path| {
                let root_clone = root.clone();
                async move {
                    match FileMetadata::from_path_async(&root_clone, &path).await {
                        Ok(metadata) => Some(metadata),
                        Err(e) => {
                            eprintln!("Error reading file {:?}: {}", path, e);
                            None
                        }
                    }
                }
            }).collect();
            
            // Wait for all file metadata reads to complete
            let file_results = futures_util::future::join_all(file_futures).await;
            files.extend(file_results.into_iter().flatten());
            
            // Recursively process subdirectories (can be parallelized further if needed)
            for subdir in subdirs {
                let subdir_files = walk_dir(subdir, root.clone()).await?;
                files.extend(subdir_files);
            }
            
            Ok(files)
        })
    }
    
    walk_dir(root_path.to_path_buf(), root_path.to_path_buf()).await
}

/// Synchronous wrapper for scan_folder_async
pub fn scan_folder(root_path: &Path) -> std::io::Result<Vec<FileMetadata>> {
    // Try to use current runtime handle
    if let Ok(handle) = tokio::runtime::Handle::try_current() {
        return handle.block_on(scan_folder_async(root_path));
    }
    
    // Fallback: create temporary runtime
    let rt = tokio::runtime::Runtime::new()
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, format!("Failed to create runtime: {}", e)))?;
    rt.block_on(scan_folder_async(root_path))
}

