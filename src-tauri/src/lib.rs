mod scanner;
mod mappings;
mod export;
mod error;

use scanner::{scan_folder, count_files};
use mappings::process_file_metadata;
use export::{InventoryRow, generate_xlsx, generate_csv, generate_json, read_xlsx, read_csv, read_json};
use error::AppError;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryItem {
    pub date_rcvd: String,
    pub doc_year: i32,
    pub doc_date_range: String,
    pub document_type: String,
    pub document_description: String,
    pub file_name: String,
    pub folder_name: String,
    pub folder_path: String,
    pub file_type: String,
    pub bates_stamp: String,
    pub notes: String,
    // Internal fields for tracking
    pub absolute_path: String,
}

#[tauri::command]
fn count_directory_files(path: String) -> Result<usize, String> {
    let root_path = PathBuf::from(&path);
    
    if !root_path.exists() {
        return Err(AppError::PathNotFound(path).to_string_message());
    }
    
    if !root_path.is_dir() {
        return Err(AppError::NotADirectory(path).to_string_message());
    }
    
    count_files(&root_path)
        .map_err(|e| AppError::ScanError(e.to_string()).to_string_message())
}

#[tauri::command]
fn scan_directory(path: String) -> Result<Vec<InventoryItem>, String> {
    let root_path = PathBuf::from(&path);
    
    if !root_path.exists() {
        return Err(AppError::PathNotFound(path).to_string_message());
    }
    
    if !root_path.is_dir() {
        return Err(AppError::NotADirectory(path).to_string_message());
    }
    
    let files = scan_folder(&root_path)
        .map_err(|e| AppError::ScanError(e.to_string()).to_string_message())?;
    
    let mut items = Vec::new();
    
    for file_metadata in files {
        let doc_info = process_file_metadata(&file_metadata);
        
        items.push(InventoryItem {
            date_rcvd: String::new(),
            doc_year: file_metadata.created_year,
            doc_date_range: doc_info.doc_date_range,
            document_type: doc_info.document_type,
            document_description: doc_info.document_description,
            file_name: file_metadata.file_name,
            folder_name: file_metadata.folder_name,
            folder_path: file_metadata.folder_path,
            file_type: file_metadata.file_type,
            bates_stamp: String::new(),
            notes: String::new(),
            absolute_path: file_metadata.absolute_path,
        });
    }
    
    Ok(items)
}

#[tauri::command]
fn export_inventory(
    items: Vec<InventoryItem>,
    format: String,
    output_path: String,
    case_number: Option<String>,
    folder_path: Option<String>,
) -> Result<(), String> {
    let rows: Vec<InventoryRow> = items
        .into_iter()
        .map(|item| InventoryRow {
            date_rcvd: item.date_rcvd,
            doc_year: item.doc_year,
            doc_date_range: item.doc_date_range,
            document_type: item.document_type,
            document_description: item.document_description,
            file_name: item.file_name,
            folder_name: item.folder_name,
            folder_path: item.folder_path,
            file_type: item.file_type,
            bates_stamp: item.bates_stamp,
            notes: item.notes,
        })
        .collect();
    
    match format.as_str() {
        "xlsx" => generate_xlsx(&rows, case_number.as_deref(), folder_path.as_deref(), &output_path)
            .map_err(|e| AppError::XlsxError(e.to_string()).to_string_message()),
        "csv" => generate_csv(&rows, case_number.as_deref(), folder_path.as_deref(), &output_path)
            .map_err(|e| AppError::CsvError(e.to_string()).to_string_message()),
        "json" => generate_json(&rows, case_number.as_deref(), folder_path.as_deref(), &output_path)
            .map_err(|e| AppError::JsonError(e.to_string()).to_string_message()),
        _ => Err(AppError::UnsupportedFormat(format).to_string_message()),
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportResult {
    pub items: Vec<InventoryItem>,
    pub case_number: Option<String>,
    pub folder_path: Option<String>,
}

#[tauri::command]
fn import_inventory(
    file_path: String,
    format: Option<String>,
) -> Result<ImportResult, String> {
    // Detect format from file extension if not provided
    let detected_format = format.unwrap_or_else(|| {
        let path = PathBuf::from(&file_path);
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.to_lowercase())
            .unwrap_or_else(|| "xlsx".to_string())
    });
    
    let (rows, case_number, folder_path) = match detected_format.as_str() {
        "xlsx" => read_xlsx(&file_path)
            .map_err(|e| AppError::ReadXlsxError(e.to_string()).to_string_message())?,
        "csv" => read_csv(&file_path)
            .map_err(|e| AppError::ReadCsvError(e.to_string()).to_string_message())?,
        "json" => read_json(&file_path)
            .map_err(|e| AppError::ReadJsonError(e.to_string()).to_string_message())?,
        _ => return Err(AppError::UnsupportedFormat(detected_format).to_string_message()),
    };
    
    // Convert InventoryRow to InventoryItem (with empty absolute_path)
    let items: Vec<InventoryItem> = rows
        .into_iter()
        .map(|row| InventoryItem {
            date_rcvd: row.date_rcvd,
            doc_year: row.doc_year,
            doc_date_range: row.doc_date_range,
            document_type: row.document_type,
            document_description: row.document_description,
            file_name: row.file_name,
            folder_name: row.folder_name,
            folder_path: row.folder_path,
            file_type: row.file_type,
            bates_stamp: row.bates_stamp,
            notes: row.notes,
            absolute_path: String::new(), // Not exported, so empty
        })
        .collect();
    
    Ok(ImportResult {
        items,
        case_number,
        folder_path,
    })
}

#[tauri::command]
fn sync_inventory(
    folder_path: String,
    existing_items: Vec<InventoryItem>,
) -> Result<Vec<InventoryItem>, String> {
    let root_path = PathBuf::from(&folder_path);
    
    if !root_path.exists() {
        return Err(AppError::PathNotFound(folder_path).to_string_message());
    }
    
    if !root_path.is_dir() {
        return Err(AppError::NotADirectory(folder_path).to_string_message());
    }
    
    // Scan folder for current files
    let files = scan_folder(&root_path)
        .map_err(|e| AppError::ScanError(e.to_string()).to_string_message())?;
    
    // Create a map of existing items by absolute_path for quick lookup
    let mut existing_map: std::collections::HashMap<String, InventoryItem> = existing_items
        .into_iter()
        .map(|item| (item.absolute_path.clone(), item))
        .collect();
    
    let mut updated_items = Vec::new();
    let mut processed_paths = std::collections::HashSet::new();
    
    // Process new/updated files
    for file_metadata in files {
        let absolute_path = file_metadata.absolute_path.clone();
        processed_paths.insert(absolute_path.clone());
        
        if let Some(existing_item) = existing_map.remove(&absolute_path) {
            // File still exists - keep it with existing user edits
            updated_items.push(existing_item);
        } else {
            // New file - create new item
            let doc_info = process_file_metadata(&file_metadata);
            
            updated_items.push(InventoryItem {
                date_rcvd: String::new(),
                doc_year: file_metadata.created_year,
                doc_date_range: doc_info.doc_date_range,
                document_type: doc_info.document_type,
                document_description: doc_info.document_description,
                file_name: file_metadata.file_name,
                folder_name: file_metadata.folder_name,
                folder_path: file_metadata.folder_path,
                file_type: file_metadata.file_type,
                bates_stamp: String::new(),
                notes: String::new(),
                absolute_path: file_metadata.absolute_path,
            });
        }
    }
    
    // Files that were removed are not included (they're in existing_map but not in processed_paths)
    // This is intentional - we only keep files that still exist
    
    Ok(updated_items)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![count_directory_files, scan_directory, export_inventory, import_inventory, sync_inventory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
