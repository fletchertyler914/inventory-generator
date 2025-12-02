/// Type conversion utilities between InventoryItem and File
/// Bridges the old inventory system with the new database-backed file system

use crate::database::File;
use crate::InventoryItem;
use serde_json;

/// Convert File (from database) to InventoryItem (for UI compatibility)
/// Loads inventory metadata from file_metadata table if available
pub fn file_to_inventory_item(file: &File, inventory_data: Option<&str>) -> InventoryItem {
    // Parse inventory metadata if available
    let (date_rcvd, doc_year, doc_date_range, document_type, document_description, bates_stamp, notes) = 
        if let Some(data_str) = inventory_data {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(data_str) {
                (
                    json.get("date_rcvd").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    json.get("doc_year").and_then(|v| v.as_i64()).unwrap_or(file.created_at as i64 / 31536000 + 1970) as i32, // Approximate year from timestamp
                    json.get("doc_date_range").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    json.get("document_type").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    json.get("document_description").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    json.get("bates_stamp").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    json.get("notes").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                )
            } else {
                ("".to_string(), 0, "".to_string(), "".to_string(), "".to_string(), "".to_string(), "".to_string())
            }
        } else {
            // No inventory metadata, use defaults
            ("".to_string(), 0, "".to_string(), "".to_string(), "".to_string(), "".to_string(), "".to_string())
        };
    
    // Extract folder name from folder_path
    let folder_name = file.folder_path
        .split('/')
        .last()
        .unwrap_or("")
        .to_string();
    
    InventoryItem {
        id: Some(file.id.clone()), // Include file ID for cloud-ready references
        date_rcvd,
        doc_year,
        doc_date_range,
        document_type,
        document_description,
        file_name: file.file_name.clone(),
        folder_name,
        folder_path: file.folder_path.clone(),
        file_type: file.file_type.clone(),
        bates_stamp,
        notes,
        absolute_path: file.absolute_path.clone(),
    }
}

/// Convert InventoryItem to File (for database storage)
/// Note: This creates a partial File - full File requires case_id and file metadata
#[allow(dead_code)] // May be useful for future import/export features
pub fn inventory_item_to_file_partial(item: &InventoryItem) -> PartialFile {
    PartialFile {
        file_name: item.file_name.clone(),
        folder_path: item.folder_path.clone(),
        absolute_path: item.absolute_path.clone(),
        file_type: item.file_type.clone(),
        inventory_data: serde_json::json!({
            "date_rcvd": item.date_rcvd,
            "doc_year": item.doc_year,
            "doc_date_range": item.doc_date_range,
            "document_type": item.document_type,
            "document_description": item.document_description,
            "bates_stamp": item.bates_stamp,
            "notes": item.notes,
        }),
    }
}

#[derive(Debug, Clone)]
#[allow(dead_code)] // May be useful for future import/export features
pub struct PartialFile {
    pub file_name: String,
    pub folder_path: String,
    pub absolute_path: String,
    pub file_type: String,
    pub inventory_data: serde_json::Value,
}

