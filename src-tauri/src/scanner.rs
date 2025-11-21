use serde::{Deserialize, Serialize};
use std::path::Path;
use std::fs;
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
    pub fn from_path(root_path: &Path, file_path: &Path) -> std::io::Result<Self> {
        let metadata = fs::metadata(file_path)?;
        
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

pub fn scan_folder(root_path: &Path) -> std::io::Result<Vec<FileMetadata>> {
    let mut files = Vec::new();
    
    fn walk_dir(dir: &Path, root: &Path, files: &mut Vec<FileMetadata>) -> std::io::Result<()> {
        if dir.is_dir() {
            for entry in fs::read_dir(dir)? {
                let entry = entry?;
                let path = entry.path();
                
                if path.is_dir() {
                    walk_dir(&path, root, files)?;
                } else if path.is_file() {
                    match FileMetadata::from_path(root, &path) {
                        Ok(metadata) => files.push(metadata),
                        Err(e) => eprintln!("Error reading file {:?}: {}", path, e),
                    }
                }
            }
        }
        Ok(())
    }
    
    walk_dir(root_path, root_path, &mut files)?;
    Ok(files)
}

