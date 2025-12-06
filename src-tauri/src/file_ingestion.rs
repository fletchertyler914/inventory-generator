/// ELITE file ingestion module
/// Optimized for maximum performance: parallel processing, batch operations, fast-path checks

use crate::file_utils::{calculate_file_hash_secure, get_file_metadata_async, metadata_matches};
use crate::mappings::process_file_metadata;
use crate::scanner::{FileMetadata as ScannerFileMetadata, compute_additional_fields};
use crate::database;
use serde_json;
use sqlx::{sqlite::SqlitePool, Row};
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct ProcessedFile {
    pub file_id: String,
    pub case_id: String,
    pub file_name: String,
    pub folder_path: String,
    pub absolute_path: String,
    pub file_hash: Option<String>,
    pub file_type: String,
    pub file_size: i64,
    pub created_at: i64,
    pub modified_at: i64,
    pub source_directory: String,
    pub inventory_data: String,
    pub action: FileAction,
}

#[derive(Debug, Clone)]
pub enum FileAction {
    Insert,
    Update { file_id: String },
    Skip,
}

/// Process a single file asynchronously
/// Returns ProcessedFile with action determined
pub async fn process_file_async(
    file_metadata: &ScannerFileMetadata,
    case_id: &str,
    folder_path: &str,
    pool: &SqlitePool,
    incremental: bool,
) -> Result<ProcessedFile, String> {
    let absolute_path = PathBuf::from(&file_metadata.absolute_path);
    
    // Fast-path: Get metadata first (cheap operation)
    let file_meta = get_file_metadata_async(&absolute_path)
        .await
        .map_err(|e| format!("Failed to get metadata: {}", e))?;
    
    // Check if file exists in DB (on-demand query, not HashMap)
    // Include deleted files in check - if a file was soft-deleted, we should skip re-adding it
    let existing_file = if incremental {
        sqlx::query("SELECT id, file_hash, file_size, modified_at, status, deleted_at FROM files WHERE case_id = ? AND absolute_path = ?")
            .bind(case_id)
            .bind(&file_metadata.absolute_path)
            .fetch_optional(pool)
            .await
            .map_err(|e| format!("Database query error: {}", e))?
    } else {
        None
    };
    
    let (action, file_id, file_hash) = if let Some(row) = existing_file {
        let existing_id: String = row.get("id");
        let existing_hash: Option<String> = row.get("file_hash");
        let existing_size: i64 = row.get("file_size");
        let existing_modified: i64 = row.get("modified_at");
        let existing_status: String = row.get("status");
        let deleted_at: Option<i64> = row.get("deleted_at");
        
        // If file was soft-deleted, skip re-adding it
        if deleted_at.is_some() {
            return Ok(ProcessedFile {
                file_id: existing_id.clone(),
                case_id: case_id.to_string(),
                file_name: file_metadata.file_name.clone(),
                folder_path: file_metadata.folder_path.clone(),
                absolute_path: file_metadata.absolute_path.clone(),
                file_hash: existing_hash,
                file_type: file_metadata.file_type.clone(),
                file_size: existing_size,
                created_at: 0,
                modified_at: existing_modified,
                source_directory: folder_path.to_string(),
                inventory_data: String::new(),
                action: FileAction::Skip,
            });
        }
        
        // For reviewed/flagged/finalized files, always verify hash even if metadata matches
        // This ensures we catch content changes that don't affect metadata
        let needs_hash_check = existing_status == "reviewed" || 
            existing_status == "flagged" || 
            existing_status == "finalized";
        
        // Fast-path: Check metadata first (nanoseconds vs milliseconds for hash)
        // For critical files (reviewed/flagged/finalized), always verify hash
        let metadata_changed = !metadata_matches(&file_meta, existing_size, existing_modified);
        let should_hash = metadata_changed || needs_hash_check;
        
        if !should_hash {
            // File unchanged - skip hashing entirely (only for non-critical files with matching metadata)
            return Ok(ProcessedFile {
                file_id: existing_id.clone(),
                case_id: case_id.to_string(),
                file_name: file_metadata.file_name.clone(),
                folder_path: file_metadata.folder_path.clone(),
                absolute_path: file_metadata.absolute_path.clone(),
                file_hash: existing_hash,
                file_type: file_metadata.file_type.clone(),
                file_size: file_meta.size,
                created_at: file_meta.created_at,
                modified_at: file_meta.modified_at,
                source_directory: folder_path.to_string(),
                inventory_data: String::new(),
                action: FileAction::Skip,
            });
        }
        
        // File changed or needs verification - hash it (using SHA-256 for cryptographic security)
        let hash = calculate_file_hash_secure(&absolute_path)
            .await
            .map_err(|e| format!("Failed to hash file: {}", e))?;
        
        // Double-check hash matches (in case metadata check had false positive)
        if let Some(ref existing) = existing_hash {
            if hash == *existing {
                // Actually unchanged, skip
                return Ok(ProcessedFile {
                    file_id: existing_id.clone(),
                    case_id: case_id.to_string(),
                    file_name: file_metadata.file_name.clone(),
                    folder_path: file_metadata.folder_path.clone(),
                    absolute_path: file_metadata.absolute_path.clone(),
                    file_hash: Some(hash),
                    file_type: file_metadata.file_type.clone(),
                    file_size: file_meta.size,
                    created_at: file_meta.created_at,
                    modified_at: file_meta.modified_at,
                    source_directory: folder_path.to_string(),
                    inventory_data: String::new(),
                    action: FileAction::Skip,
                });
            }
        }
        
        let existing_id_clone = existing_id.clone();
        (FileAction::Update { file_id: existing_id_clone }, existing_id, Some(hash))
    } else {
        // File not found by path - could be new file or renamed file
        // ELITE: Check for rename by hash matching (detects file renames)
        let hash = calculate_file_hash_secure(&absolute_path)
            .await
            .map_err(|e| format!("Failed to hash file: {}", e))?;
        
        // Check if there's an existing file with the same hash in the SAME source_directory
        // ELITE: Only match files whose old path no longer exists (true rename detection)
        // This prevents matching other duplicates that still exist at their original paths
        let candidate_files = sqlx::query(
            "SELECT id, absolute_path, file_hash, file_size, modified_at, status, deleted_at 
             FROM files 
             WHERE case_id = ? 
               AND file_hash = ? 
               AND absolute_path != ? 
               AND source_directory = ?
               AND deleted_at IS NULL"
        )
            .bind(case_id)
            .bind(&hash)
            .bind(&file_metadata.absolute_path)
            .bind(folder_path) // Only match files from the same source directory
            .fetch_all(pool)
            .await
            .map_err(|e| format!("Database query error checking for rename: {}", e))?;
        
        // ELITE: Find the file whose old path no longer exists on disk
        // This ensures we only match the file that was actually renamed, not other duplicates
        let mut renamed_file_id: Option<String> = None;
        for row in candidate_files {
            let candidate_id: String = row.get("id");
            let candidate_path: String = row.get("absolute_path");
            
            // Check if the old path still exists on disk
            let old_path_exists = tokio::fs::try_exists(&PathBuf::from(&candidate_path))
                .await
                .unwrap_or(false);
            
            if !old_path_exists {
                // Found a file with same hash whose old path doesn't exist - this is the renamed file!
                renamed_file_id = Some(candidate_id);
                break; // Only match the first one found (should be only one)
            }
        }
        
        if let Some(existing_id) = renamed_file_id {
            // Found existing file with same hash whose old path no longer exists - this is a rename!
            // Update the existing file with new path and metadata
            // Preserve status and other user data
            // ELITE: Duplicate groups remain intact because we're updating the same file entry
            (
                FileAction::Update { file_id: existing_id.clone() },
                existing_id,
                Some(hash)
            )
        } else {
            // Truly new file (or all duplicates still exist at their paths) - create new entry
            // ELITE: Duplicates in different folders will be detected and grouped separately
            let new_id = Uuid::new_v4().to_string();
            (FileAction::Insert, new_id, Some(hash))
        }
    };
    
    // Process inventory metadata
    let doc_info = process_file_metadata(file_metadata);
    
    // ELITE: Extract dates from file for timeline automation
    let extracted_dates = crate::date_extraction::extract_dates_from_file(&absolute_path).await.ok();
    let primary_date = extracted_dates.as_ref()
        .and_then(|r| r.primary_date)
        .or_else(|| {
            // Fallback: try to extract statement period from filename
            crate::date_extraction::extract_statement_period(&file_metadata.file_name)
                .map(|(start, _)| start)
        });
    
    // ELITE: Compute additional file system fields for generic column support
    let additional_fields = compute_additional_fields(file_metadata);
    
    // Build base inventory_data with file system fields and document metadata
    let mut inventory_data = serde_json::json!({
        // File system basics
        "file_size": file_meta.size,
        "file_extension": additional_fields["file_extension"],
        "created_at": file_meta.created_at,
        "modified_at": file_meta.modified_at,
        // Path-based fields
        "parent_folder": additional_fields["parent_folder"],
        "folder_depth": additional_fields["folder_depth"],
        "file_path_segments": additional_fields["file_path_segments"],
        // Extracted metadata
        "extracted_date": primary_date,
        // Document metadata (from filename analysis)
        "document_type": doc_info.document_type,
        "document_description": doc_info.document_description,
        "doc_date_range": doc_info.doc_date_range,
    });
    
    // ELITE: Apply schema mappings to extract custom field values
    // Load mapping config for this case (or global if no case-specific)
    if let Ok(Some(mapping_config_json)) = database::get_mapping_config(pool, Some(&case_id)).await {
        if let Ok(mapping_config) = serde_json::from_str::<serde_json::Value>(&mapping_config_json) {
            if let Some(mappings) = mapping_config.get("mappings").and_then(|m| m.as_array()) {
                // Create regex cache for performance
                let mut regex_cache = crate::field_extraction::RegexCache::new();
                
                // Build metadata map for extraction
                let mut metadata_map = std::collections::HashMap::new();
                metadata_map.insert("file_name".to_string(), file_metadata.file_name.clone());
                metadata_map.insert("folder_name".to_string(), file_metadata.folder_path.split('/').last().unwrap_or("").to_string());
                metadata_map.insert("folder_path".to_string(), file_metadata.folder_path.clone());
                
                // Apply each enabled mapping
                for mapping in mappings {
                    if let Some(enabled) = mapping.get("enabled").and_then(|e| e.as_bool()) {
                        if !enabled {
                            continue;
                        }
                        
                        // Extract mapping details
                        if let (Some(column_id), Some(source_type), Some(extraction_method)) = (
                            mapping.get("columnId").and_then(|c| c.as_str()),
                            mapping.get("sourceType").and_then(|s| s.as_str()),
                            mapping.get("extractionMethod").and_then(|e| e.as_str()),
                        ) {
                            // Convert to FieldMappingRule format
                            let rule = crate::field_extraction::FieldMappingRule {
                                source_type: source_type.to_string(),
                                extraction_method: match extraction_method {
                                    "direct" => crate::field_extraction::ExtractionMethod::Direct,
                                    "pattern" => crate::field_extraction::ExtractionMethod::Pattern,
                                    "date" => crate::field_extraction::ExtractionMethod::Date,
                                    "number" => crate::field_extraction::ExtractionMethod::Number,
                                    "text_before" => crate::field_extraction::ExtractionMethod::TextBefore,
                                    "text_after" => crate::field_extraction::ExtractionMethod::TextAfter,
                                    "text_between" => crate::field_extraction::ExtractionMethod::TextBetween,
                                    _ => crate::field_extraction::ExtractionMethod::Direct,
                                },
                                pattern: mapping.get("patternConfig").and_then(|p| {
                                    if let (Some(pattern), Some(flags), Some(group)) = (
                                        p.get("pattern").and_then(|pat| pat.as_str()),
                                        p.get("flags").and_then(|f| f.as_str()),
                                        p.get("group").and_then(|g| g.as_u64()),
                                    ) {
                                        Some(crate::field_extraction::ExtractionPattern {
                                            pattern: pattern.to_string(),
                                            flags: if flags.is_empty() { None } else { Some(flags.to_string()) },
                                            group: Some(group as usize),
                                            format: p.get("format").and_then(|f| f.as_str()).map(|s| s.to_string()),
                                        })
                                    } else {
                                        None
                                    }
                                }),
                                target_field: column_id.to_string(),
                            };
                            
                            // Apply mapping rule to extract value
                            if let Ok(Some(extracted_value)) = crate::field_extraction::apply_mapping_rule(
                                &rule,
                                &file_metadata.file_name,
                                &metadata_map.get("folder_name").unwrap_or(&String::new()),
                                &file_metadata.folder_path,
                                &metadata_map,
                                &mut regex_cache,
                            ) {
                                // Store extracted value in inventory_data
                                inventory_data[column_id] = serde_json::Value::String(extracted_value);
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Add file hash if available (will be computed later if needed)
    // Note: file_hash is stored in files table, not inventory_data
    
    Ok(ProcessedFile {
        file_id,
        case_id: case_id.to_string(),
        file_name: file_metadata.file_name.clone(),
        folder_path: file_metadata.folder_path.clone(),
        absolute_path: file_metadata.absolute_path.clone(),
        file_hash,
        file_type: file_metadata.file_type.clone(),
        file_size: file_meta.size,
        created_at: file_meta.created_at,
        modified_at: file_meta.modified_at,
        source_directory: folder_path.to_string(),
        inventory_data: inventory_data.to_string(),
        action,
    })
}

/// Batch insert files into database using transaction
pub async fn batch_insert_files(
    pool: &SqlitePool,
    files: &[ProcessedFile],
    now: i64,
) -> Result<(), String> {
    if files.is_empty() {
        return Ok(());
    }
    
    let mut transaction = pool.begin()
        .await
        .map_err(|e| format!("Failed to begin transaction: {}", e))?;
    
    // Batch insert files
    for file in files {
        sqlx::query(
            "INSERT INTO files (id, case_id, file_name, folder_path, absolute_path, file_hash, file_type, file_size, created_at, modified_at, updated_at, status, source_directory) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unreviewed', ?)"
        )
        .bind(&file.file_id)
        .bind(&file.case_id)
        .bind(&file.file_name)
        .bind(&file.folder_path)
        .bind(&file.absolute_path)
        .bind(&file.file_hash)
        .bind(&file.file_type)
        .bind(file.file_size)
        .bind(file.created_at)
        .bind(file.modified_at)
        .bind(file.modified_at) // updated_at set to modified_at for new files
        .bind(&file.source_directory)
        .execute(&mut *transaction)
        .await
        .map_err(|e| format!("Failed to insert file: {}", e))?;
        
        // Insert metadata
        sqlx::query(
            "INSERT INTO file_metadata (file_id, inventory_data, last_scanned_at) VALUES (?, ?, ?)"
        )
        .bind(&file.file_id)
        .bind(&file.inventory_data)
        .bind(now)
        .execute(&mut *transaction)
        .await
        .map_err(|e| format!("Failed to insert metadata: {}", e))?;
        
        // ELITE: Auto-create timeline event if date was extracted
        if let Ok(inventory_json) = serde_json::from_str::<serde_json::Value>(&file.inventory_data) {
            if let Some(extracted_date) = inventory_json.get("extracted_date").and_then(|v| v.as_i64()) {
                // Create timeline event automatically
                let event_id = uuid::Uuid::new_v4().to_string();
                let description = format!("Document: {}", file.file_name);
                let metadata = serde_json::json!({
                    "source": "auto_extracted",
                    "file_id": file.file_id,
                    "file_name": file.file_name
                }).to_string();
                
                // Insert timeline event (ignore errors to not block file ingestion)
                let _ = sqlx::query(
                    "INSERT INTO timeline_events (id, case_id, event_date, description, source_file_id, event_type, metadata, created_at) VALUES (?, ?, ?, ?, ?, 'extracted', ?, ?)"
                )
                .bind(&event_id)
                .bind(&file.case_id)
                .bind(extracted_date)
                .bind(&description)
                .bind(&file.file_id)
                .bind(&metadata)
                .bind(now)
                .execute(&mut *transaction)
                .await;
            }
        }
    }
    
    transaction.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;
    
    Ok(())
}

/// Batch update files in database using transaction
pub async fn batch_update_files(
    pool: &SqlitePool,
    files: &[ProcessedFile],
    now: i64,
) -> Result<(), String> {
    if files.is_empty() {
        return Ok(());
    }
    
    let mut transaction = pool.begin()
        .await
        .map_err(|e| format!("Failed to begin transaction: {}", e))?;
    
    for file in files {
        if let FileAction::Update { file_id } = &file.action {
            // Get current status to check if we need to auto-transition
            let status_row = sqlx::query("SELECT status FROM files WHERE id = ?")
                .bind(file_id)
                .fetch_optional(&mut *transaction)
                .await
                .map_err(|e| format!("Failed to get file status: {}", e))?;
            
            let mut new_status: Option<String> = None;
            if let Some(row) = status_row {
                let current_status: String = row.get("status");
                // Auto-transition reviewed/flagged to in_progress when file is updated
                if current_status == "reviewed" || current_status == "flagged" {
                    new_status = Some("in_progress".to_string());
                }
            }
            
            // Update file with optional status transition
            // ELITE: Also update path fields (file_name, folder_path, absolute_path) to handle renames
            if let Some(ref status) = new_status {
                sqlx::query(
                    "UPDATE files SET file_name = ?, folder_path = ?, absolute_path = ?, file_hash = ?, file_size = ?, modified_at = ?, updated_at = ?, status = ? WHERE id = ?"
                )
                .bind(&file.file_name)
                .bind(&file.folder_path)
                .bind(&file.absolute_path)
                .bind(&file.file_hash)
                .bind(file.file_size)
                .bind(file.modified_at)
                .bind(now)
                .bind(status)
                .bind(file_id)
                .execute(&mut *transaction)
                .await
                .map_err(|e| format!("Failed to update file: {}", e))?;
            } else {
                sqlx::query(
                    "UPDATE files SET file_name = ?, folder_path = ?, absolute_path = ?, file_hash = ?, file_size = ?, modified_at = ?, updated_at = ? WHERE id = ?"
                )
                .bind(&file.file_name)
                .bind(&file.folder_path)
                .bind(&file.absolute_path)
                .bind(&file.file_hash)
                .bind(file.file_size)
                .bind(file.modified_at)
                .bind(now)
                .bind(file_id)
                .execute(&mut *transaction)
                .await
                .map_err(|e| format!("Failed to update file: {}", e))?;
            }
            
            // Update metadata
            sqlx::query(
                "UPDATE file_metadata SET inventory_data = ?, last_scanned_at = ? WHERE file_id = ?"
            )
            .bind(&file.inventory_data)
            .bind(now)
            .bind(file_id)
            .execute(&mut *transaction)
            .await
            .map_err(|e| format!("Failed to update metadata: {}", e))?;
        }
    }
    
    transaction.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;
    
    Ok(())
}

/// ELITE: Batch create duplicate groups for newly inserted files
/// Only processes local files (filters by case_sources.source_location = 'local')
/// Groups files with the same hash into duplicate_groups
pub async fn batch_create_duplicate_groups(
    pool: &SqlitePool,
    case_id: &str,
    files: &[ProcessedFile],
    now: i64,
) -> Result<usize, String> {
    if files.is_empty() {
        return Ok(0);
    }
    
    // Only process files with hashes
    let files_with_hash: Vec<_> = files.iter()
        .filter(|f| f.file_hash.is_some())
        .collect();
    
    if files_with_hash.is_empty() {
        return Ok(0);
    }
    
    let mut transaction = pool.begin()
        .await
        .map_err(|e| format!("Failed to begin transaction: {}", e))?;
    
    let mut duplicate_groups_created = 0;
    
    // For each file with a hash, check for existing duplicates (local files only)
    for file in files_with_hash {
        if let Some(ref hash) = file.file_hash {
            // Find existing files with same hash in this case (local files only)
            // JOIN with case_sources to ensure we only check local files
            let existing_duplicates = sqlx::query(
                r#"
                SELECT DISTINCT f.id, f.file_hash
                FROM files f
                INNER JOIN case_sources cs ON f.case_id = cs.case_id
                WHERE f.case_id = ?
                  AND f.file_hash = ?
                  AND f.id != ?
                  AND f.deleted_at IS NULL
                  AND cs.source_location = 'local'
                  AND f.source_directory = cs.source_path
                LIMIT 100
                "#
            )
            .bind(case_id)
            .bind(hash)
            .bind(&file.file_id)
            .fetch_all(&mut *transaction)
            .await
            .map_err(|e| format!("Failed to find duplicates: {}", e))?;
            
            if !existing_duplicates.is_empty() {
                // Create or get duplicate group
                // Use hash as group_id for simplicity (ensures same hash = same group)
                let group_id = hash.clone();
                
                // Check if group already exists and if it has a primary
                let group_info = sqlx::query(
                    "SELECT COUNT(*) as count, MAX(is_primary) as has_primary FROM duplicate_groups WHERE group_id = ?"
                )
                .bind(&group_id)
                .fetch_one(&mut *transaction)
                .await
                .map_err(|e| format!("Failed to check group existence: {}", e))?;
                
                let group_count: i64 = group_info.get("count");
                let _has_primary: Option<i64> = group_info.get("has_primary");
                let group_exists = group_count > 0;
                
                // If group doesn't exist, add all existing duplicates to it
                // First existing duplicate becomes primary
                if !group_exists {
                    let mut first = true;
                    for row in &existing_duplicates {
                        let existing_file_id: String = row.get("id");
                        let is_primary = first; // First file becomes primary
                        first = false;
                        
                        sqlx::query(
                            "INSERT INTO duplicate_groups (group_id, file_id, is_primary, created_at) VALUES (?, ?, ?, ?)"
                        )
                        .bind(&group_id)
                        .bind(&existing_file_id)
                        .bind(if is_primary { 1 } else { 0 })
                        .bind(now)
                        .execute(&mut *transaction)
                        .await
                        .map_err(|e| format!("Failed to insert duplicate group: {}", e))?;
                    }
                }
                
                // Add current file to the group (not primary - existing files take precedence)
                sqlx::query(
                    "INSERT OR IGNORE INTO duplicate_groups (group_id, file_id, is_primary, created_at) VALUES (?, ?, 0, ?)"
                )
                .bind(&group_id)
                .bind(&file.file_id)
                .bind(now)
                .execute(&mut *transaction)
                .await
                .map_err(|e| format!("Failed to insert duplicate group: {}", e))?;
                
                duplicate_groups_created += 1;
            }
        }
    }
    
    transaction.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;
    
    Ok(duplicate_groups_created)
}

