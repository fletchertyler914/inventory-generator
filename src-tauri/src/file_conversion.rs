/// Type conversion utilities between InventoryItem and File
/// Bridges the old inventory system with the new database-backed file system

use crate::database::File;
use crate::InventoryItem;
use serde_json;

/// Convert File (from database) to InventoryItem (for UI compatibility)
/// ELITE: Schema-driven conversion - all fields stored in inventory_data JSON
/// Loads inventory metadata from file_metadata table if available
pub fn file_to_inventory_item(file: &File, inventory_data: Option<&str>) -> InventoryItem {
    // Extract folder name from folder_path
    let folder_name = file.folder_path
        .split('/')
        .last()
        .unwrap_or("")
        .to_string();
    
    // Parse existing inventory_data or create new JSON object
    let inventory_data_json = if let Some(data_str) = inventory_data {
        // Use existing inventory_data as-is (preserves all schema-defined fields)
        data_str.to_string()
    } else {
        // Create empty inventory_data JSON for new files
        "{}".to_string()
    };
    
    // Parse tags from JSON if available
    let tags: Option<Vec<String>> = if let Some(tags_str) = &file.tags {
        serde_json::from_str(tags_str).ok()
    } else {
        None
    };
    
    InventoryItem {
        id: Some(file.id.clone()), // Include file ID for cloud-ready references
        absolute_path: file.absolute_path.clone(),
        status: Some(file.status.clone()),
        tags,
        file_name: file.file_name.clone(),
        folder_name,
        folder_path: file.folder_path.clone(),
        file_type: file.file_type.clone(),
        inventory_data: Some(inventory_data_json),
    }
}

/// Convert InventoryItem to File (for database storage)
/// ELITE: Schema-driven conversion - preserves all inventory_data fields
/// Note: This creates a partial File - full File requires case_id and file metadata
#[allow(dead_code)] // May be useful for future import/export features
pub fn inventory_item_to_file_partial(item: &InventoryItem) -> PartialFile {
    // Parse inventory_data JSON or create empty object
    let inventory_data_value = if let Some(data_str) = &item.inventory_data {
        serde_json::from_str(data_str).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };
    
    PartialFile {
        file_name: item.file_name.clone(),
        folder_path: item.folder_path.clone(),
        absolute_path: item.absolute_path.clone(),
        file_type: item.file_type.clone(),
        inventory_data: inventory_data_value,
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

