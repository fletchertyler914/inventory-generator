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
/// 
/// Performance: Uses single batch SQL query with GROUP BY instead of sequential per-file queries
/// Scalability: Handles millions of files efficiently using index-optimized queries
/// Complexity: O(1) queries instead of O(n) where n = files with duplicates
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
    
    // ELITE: Ultra-optimized single query approach
    // Gets ALL duplicate files with their data AND existing duplicate_groups entries in one query
    // Then processes everything in memory and batch inserts
    // Note: Uses LEFT JOIN for case_sources to handle cases where source might not be in case_sources yet
    let duplicate_files_rows = sqlx::query(
        r#"
        SELECT 
            f.file_hash as group_id,
            f.id as file_id,
            f.created_at,
            dg.file_id as existing_file_id,
            dg.is_primary as existing_is_primary
        FROM files f
        LEFT JOIN case_sources cs ON f.case_id = cs.case_id 
            AND f.source_directory = cs.source_path
        LEFT JOIN duplicate_groups dg ON dg.group_id = f.file_hash AND dg.file_id = f.id
        WHERE f.case_id = ?
          AND f.file_hash IS NOT NULL
          AND f.deleted_at IS NULL
          AND (cs.source_location = 'local' OR cs.source_location IS NULL)
          AND f.file_hash IN (
              SELECT file_hash
              FROM files f2
              LEFT JOIN case_sources cs2 ON f2.case_id = cs2.case_id 
                  AND f2.source_directory = cs2.source_path
              WHERE f2.case_id = ?
                AND f2.file_hash IS NOT NULL
                AND f2.deleted_at IS NULL
                AND (cs2.source_location = 'local' OR cs2.source_location IS NULL)
              GROUP BY f2.file_hash
              HAVING COUNT(*) > 1
          )
        ORDER BY f.file_hash, f.created_at ASC
        "#
    )
    .bind(case_id)
    .bind(case_id)
    .fetch_all(&mut *transaction)
    .await
    .map_err(|e| format!("Failed to find duplicate files: {}", e))?;
    
    if duplicate_files_rows.is_empty() {
        log::debug!("No duplicate files found for case {} (all files are unique or already grouped)", case_id);
        transaction.commit()
            .await
            .map_err(|e| format!("Failed to commit transaction: {}", e))?;
        return Ok(0);
    }
    
    log::debug!("Found {} duplicate file rows to process for case {}", duplicate_files_rows.len(), case_id);
    
    // Process results in memory: group by hash, track existing entries, determine what to insert
    use std::collections::{HashMap, HashSet};
    
    // Map: group_id -> (file_id -> (created_at, is_existing, existing_is_primary))
    let mut groups: HashMap<String, HashMap<String, (i64, bool, Option<i64>)>> = HashMap::new();
    
    // Track which groups already exist (have at least one entry in duplicate_groups)
    let mut existing_groups: HashSet<String> = HashSet::new();
    
    for row in duplicate_files_rows {
        let group_id: String = row.get("group_id");
        let file_id: String = row.get("file_id");
        let created_at: i64 = row.get("created_at");
        let existing_file_id: Option<String> = row.try_get("existing_file_id").ok();
        let existing_is_primary: Option<i64> = row.try_get("existing_is_primary").ok();
        
        let is_existing = existing_file_id.is_some();
        if is_existing {
            existing_groups.insert(group_id.clone());
        }
        
        groups
            .entry(group_id)
            .or_insert_with(HashMap::new)
            .insert(file_id, (created_at, is_existing, existing_is_primary));
    }
    
    // Build batch insert list
    let mut inserts: Vec<(String, String, i64, i64)> = Vec::new(); // (group_id, file_id, is_primary, created_at)
    let mut duplicate_groups_created = 0;
    
    for (group_id, files) in groups {
        // Filter to files that don't already exist in duplicate_groups
        let files_to_insert: Vec<(String, i64)> = files
            .iter()
            .filter(|(_, (_, is_existing, _))| !is_existing)
            .map(|(file_id, (created_at, _, _))| (file_id.clone(), *created_at))
            .collect();
        
        if files_to_insert.is_empty() {
            continue; // All files already in duplicate_groups
        }
        
        let group_exists = existing_groups.contains(&group_id);
        
        if !group_exists {
            // New group: find file with earliest created_at to be primary
            // Check ALL files in the group (not just files_to_insert) to find the true primary
            let primary_file_id = files
                .iter()
                .min_by_key(|(_, (created_at, _, _))| *created_at)
                .map(|(file_id, _)| file_id.clone())
                .unwrap_or_else(|| {
                    // Fallback: use first file if min_by_key fails (shouldn't happen)
                    files.keys().next().cloned().unwrap_or_default()
                });
            
            // Verify primary is in files_to_insert (should always be true for new groups)
            let primary_in_inserts = files_to_insert.iter().any(|(fid, _)| fid == &primary_file_id);
            
            // Add all files, marking primary
            for (file_id, _created_at) in &files_to_insert {
                // Only mark as primary if it's the primary file AND it's being inserted
                let is_primary = if file_id == &primary_file_id && primary_in_inserts { 1 } else { 0 };
                inserts.push((group_id.clone(), file_id.clone(), is_primary, now));
            }
            
            duplicate_groups_created += 1;
        } else {
            // Existing group: add new files (none as primary)
            for (file_id, _created_at) in &files_to_insert {
                inserts.push((group_id.clone(), file_id.clone(), 0, now));
            }
            
            if !files_to_insert.is_empty() {
                duplicate_groups_created += 1;
            }
        }
    }
    
    // ELITE: Batch insert all entries at once using prepared statement
    if !inserts.is_empty() {
        // SQLite has a limit of 999 parameters, so we need to chunk if needed
        const MAX_BATCH_SIZE: usize = 200; // 4 params per insert = 800 params max (safe margin)
        
        for chunk in inserts.chunks(MAX_BATCH_SIZE) {
            let placeholders: Vec<String> = (0..chunk.len())
                .map(|_| "(?, ?, ?, ?)".to_string())
                .collect();
            
            let query_str = format!(
                "INSERT OR IGNORE INTO duplicate_groups (group_id, file_id, is_primary, created_at) VALUES {}",
                placeholders.join(", ")
            );
            
            let mut query = sqlx::query(&query_str);
            for (group_id, file_id, is_primary, created_at) in chunk {
                query = query.bind(group_id).bind(file_id).bind(is_primary).bind(created_at);
            }
            
            query
                .execute(&mut *transaction)
                .await
                .map_err(|e| format!("Failed to batch insert duplicate groups: {}", e))?;
        }
    }
    
    transaction.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;
    
    Ok(duplicate_groups_created)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePool;
    use crate::database;
    
    /// Helper to create in-memory test database with migrations
    async fn create_test_db() -> Result<SqlitePool, String> {
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .map_err(|e| format!("Failed to create test database: {}", e))?;
        
        // Run migrations manually (copying from database.rs)
        sqlx::raw_sql(
            "CREATE TABLE IF NOT EXISTS _migrations (
                version INTEGER PRIMARY KEY,
                description TEXT,
                applied_at INTEGER NOT NULL
            )"
        )
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to create migration tracking table: {}", e))?;
        
        let migrations = database::get_migrations();
        for migration in migrations {
            use tauri_plugin_sql::MigrationKind;
            if matches!(migration.kind, MigrationKind::Up) {
                let applied: Option<i32> = sqlx::query_scalar(
                    "SELECT version FROM _migrations WHERE version = ?"
                )
                .bind(migration.version)
                .fetch_optional(&pool)
                .await
                .map_err(|e| format!("Failed to check migration status: {}", e))?;
                
                if applied.is_none() {
                    sqlx::raw_sql(migration.sql)
                        .execute(&pool)
                        .await
                        .map_err(|e| format!("Migration {} failed: {}", migration.version, e))?;
                    
                    let now = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs() as i64;
                    
                    sqlx::query(
                        "INSERT OR IGNORE INTO _migrations (version, description, applied_at) VALUES (?, ?, ?)"
                    )
                    .bind(migration.version)
                    .bind(migration.description)
                    .bind(now)
                    .execute(&pool)
                    .await
                    .map_err(|e| format!("Failed to record migration {}: {}", migration.version, e))?;
                }
            }
        }
        
        Ok(pool)
    }
    
    /// Helper to create test case
    async fn create_test_case(pool: &SqlitePool, case_id: &str, name: &str) -> Result<(), String> {
        let now = chrono::Utc::now().timestamp();
        sqlx::query(
            "INSERT INTO cases (id, name, created_at, updated_at, last_opened_at) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(case_id)
        .bind(name)
        .bind(now)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to create test case: {}", e))?;
        
        Ok(())
    }
    
    /// Helper to create test source
    async fn create_test_source(pool: &SqlitePool, case_id: &str, source_path: &str, source_location: &str) -> Result<(), String> {
        let source_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        sqlx::query(
            "INSERT INTO case_sources (id, case_id, source_path, source_type, source_location, added_at) VALUES (?, ?, ?, 'folder', ?, ?)"
        )
        .bind(&source_id)
        .bind(case_id)
        .bind(source_path)
        .bind(source_location)
        .bind(now)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to create test source: {}", e))?;
        
        Ok(())
    }
    
    /// Helper to create test file in database
    async fn create_test_file(
        pool: &SqlitePool,
        case_id: &str,
        file_id: &str,
        file_hash: Option<&str>,
        source_directory: &str,
        created_at: Option<i64>,
    ) -> Result<(), String> {
        let now = created_at.unwrap_or_else(|| chrono::Utc::now().timestamp());
        sqlx::query(
            "INSERT INTO files (id, case_id, file_name, folder_path, absolute_path, file_hash, file_type, file_size, created_at, modified_at, updated_at, status, source_directory) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unreviewed', ?)"
        )
        .bind(file_id)
        .bind(case_id)
        .bind("test_file.txt")
        .bind("/test")
        .bind(&format!("/test/{}.txt", file_id))
        .bind(file_hash)
        .bind("text/plain")
        .bind(1000)
        .bind(now)
        .bind(now)
        .bind(now)
        .bind(source_directory)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to create test file: {}", e))?;
        
        Ok(())
    }
    
    #[tokio::test]
    async fn test_batch_create_duplicate_groups_no_duplicates() {
        let pool = create_test_db().await.unwrap();
        let case_id = "test-case-1";
        let source_path = "/test/source";
        
        create_test_case(&pool, case_id, "Test Case").await.unwrap();
        create_test_source(&pool, case_id, source_path, "local").await.unwrap();
        
        // Create files with unique hashes
        create_test_file(&pool, case_id, "file-1", Some("hash-1"), source_path, None).await.unwrap();
        create_test_file(&pool, case_id, "file-2", Some("hash-2"), source_path, None).await.unwrap();
        
        // Process new file with unique hash
        let files = vec![
            ProcessedFile {
                file_id: "file-3".to_string(),
                case_id: case_id.to_string(),
                file_name: "test.txt".to_string(),
                folder_path: "/test".to_string(),
                absolute_path: "/test/file-3.txt".to_string(),
                file_hash: Some("hash-3".to_string()),
                file_type: "text/plain".to_string(),
                file_size: 1000,
                created_at: chrono::Utc::now().timestamp(),
                modified_at: chrono::Utc::now().timestamp(),
                source_directory: source_path.to_string(),
                inventory_data: "{}".to_string(),
                action: FileAction::Insert,
            },
        ];
        
        let now = chrono::Utc::now().timestamp();
        let result = batch_create_duplicate_groups(&pool, case_id, &files, now).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0); // No duplicates, no groups created
        
        // Verify no duplicate groups created
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM duplicate_groups")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count, 0);
    }
    
    #[tokio::test]
    async fn test_batch_create_duplicate_groups_with_duplicates() {
        let pool = create_test_db().await.unwrap();
        let case_id = "test-case-2";
        let source_path = "/test/source";
        
        create_test_case(&pool, case_id, "Test Case").await.unwrap();
        create_test_source(&pool, case_id, source_path, "local").await.unwrap();
        
        // Create existing files with same hash
        let base_time = chrono::Utc::now().timestamp();
        create_test_file(&pool, case_id, "file-1", Some("duplicate-hash"), source_path, Some(base_time)).await.unwrap();
        create_test_file(&pool, case_id, "file-2", Some("duplicate-hash"), source_path, Some(base_time + 1)).await.unwrap();
        
        // New file with same hash
        let files = vec![
            ProcessedFile {
                file_id: "file-3".to_string(),
                case_id: case_id.to_string(),
                file_name: "test.txt".to_string(),
                folder_path: "/test".to_string(),
                absolute_path: "/test/file-3.txt".to_string(),
                file_hash: Some("duplicate-hash".to_string()),
                file_type: "text/plain".to_string(),
                file_size: 1000,
                created_at: base_time + 2,
                modified_at: chrono::Utc::now().timestamp(),
                source_directory: source_path.to_string(),
                inventory_data: "{}".to_string(),
                action: FileAction::Insert,
            },
        ];
        
        let now = chrono::Utc::now().timestamp();
        let result = batch_create_duplicate_groups(&pool, case_id, &files, now).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1); // One duplicate group created
        
        // Verify duplicate group created with all 3 files
        let rows = sqlx::query("SELECT file_id, is_primary FROM duplicate_groups WHERE group_id = 'duplicate-hash'")
            .fetch_all(&pool)
            .await
            .unwrap();
        
        assert_eq!(rows.len(), 3); // All 3 files in group
        
        // Verify primary file is set (earliest created_at = file-1)
        let primary_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM duplicate_groups WHERE group_id = 'duplicate-hash' AND is_primary = 1"
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(primary_count, 1); // Exactly one primary
        
        // Verify file-1 is primary (earliest created_at)
        let primary_file: String = sqlx::query_scalar(
            "SELECT file_id FROM duplicate_groups WHERE group_id = 'duplicate-hash' AND is_primary = 1"
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(primary_file, "file-1");
    }
    
    #[tokio::test]
    async fn test_batch_create_duplicate_groups_performance() {
        let pool = create_test_db().await.unwrap();
        let case_id = "test-case-3";
        let source_path = "/test/source";
        
        create_test_case(&pool, case_id, "Test Case").await.unwrap();
        create_test_source(&pool, case_id, source_path, "local").await.unwrap();
        
        // Create 1000 files with 100 duplicate hashes (10 files per hash)
        let base_time = chrono::Utc::now().timestamp();
        for i in 0..1000 {
            let file_id = format!("file-{}", i);
            let hash = format!("hash-{}", i / 10); // 10 files per hash
            create_test_file(&pool, case_id, &file_id, Some(&hash), source_path, Some(base_time + i as i64)).await.unwrap();
        }
        
        // Create processed files for new ingestion (100 more files, some duplicates)
        let files: Vec<ProcessedFile> = (1000..1100)
            .map(|i| {
                let file_id = format!("file-{}", i);
                let hash = format!("hash-{}", i / 10); // Some will be duplicates
                ProcessedFile {
                    file_id: file_id.clone(),
                    case_id: case_id.to_string(),
                    file_name: "test.txt".to_string(),
                    folder_path: "/test".to_string(),
                    absolute_path: format!("/test/{}.txt", file_id),
                    file_hash: Some(hash),
                    file_type: "text/plain".to_string(),
                    file_size: 1000,
                    created_at: base_time + i as i64,
                    modified_at: chrono::Utc::now().timestamp(),
                    source_directory: source_path.to_string(),
                    inventory_data: "{}".to_string(),
                    action: FileAction::Insert,
                }
            })
            .collect();
        
        let now = chrono::Utc::now().timestamp();
        let start = std::time::Instant::now();
        let result = batch_create_duplicate_groups(&pool, case_id, &files, now).await;
        let duration = start.elapsed();
        
        assert!(result.is_ok());
        
        // Performance assertion: Should complete in <500ms even with 1000 existing files
        // Note: In-memory DB is faster, but this tests the algorithm efficiency
        assert!(duration.as_millis() < 500, "Duplicate detection took {}ms, expected <500ms", duration.as_millis());
        
        // Verify groups created
        let group_count: i64 = sqlx::query_scalar("SELECT COUNT(DISTINCT group_id) FROM duplicate_groups")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert!(group_count > 0, "Should have created duplicate groups");
    }
    
    #[tokio::test]
    async fn test_batch_create_duplicate_groups_local_files_only() {
        let pool = create_test_db().await.unwrap();
        let case_id = "test-case-4";
        let local_source = "/test/local";
        let cloud_source = "s3://test/cloud";
        
        create_test_case(&pool, case_id, "Test Case").await.unwrap();
        create_test_source(&pool, case_id, local_source, "local").await.unwrap();
        create_test_source(&pool, case_id, cloud_source, "cloud").await.unwrap();
        
        // Create local file with hash
        create_test_file(&pool, case_id, "local-file", Some("test-hash"), local_source, None).await.unwrap();
        
        // Create cloud file with same hash (should not be grouped with local files)
        create_test_file(&pool, case_id, "cloud-file", Some("test-hash"), cloud_source, None).await.unwrap();
        
        // New local file with same hash
        let files = vec![
            ProcessedFile {
                file_id: "local-file-2".to_string(),
                case_id: case_id.to_string(),
                file_name: "test.txt".to_string(),
                folder_path: "/test".to_string(),
                absolute_path: "/test/local-file-2.txt".to_string(),
                file_hash: Some("test-hash".to_string()),
                file_type: "text/plain".to_string(),
                file_size: 1000,
                created_at: chrono::Utc::now().timestamp(),
                modified_at: chrono::Utc::now().timestamp(),
                source_directory: local_source.to_string(),
                inventory_data: "{}".to_string(),
                action: FileAction::Insert,
            },
        ];
        
        let now = chrono::Utc::now().timestamp();
        let result = batch_create_duplicate_groups(&pool, case_id, &files, now).await;
        assert!(result.is_ok());
        
        // Verify only local files are in duplicate group
        let rows = sqlx::query(
            "SELECT f.id FROM duplicate_groups dg JOIN files f ON dg.file_id = f.id WHERE dg.group_id = 'test-hash'"
        )
        .fetch_all(&pool)
        .await
        .unwrap();
        
        let file_ids: Vec<String> = rows.into_iter().map(|r| r.get::<String, _>("id")).collect();
        assert!(file_ids.contains(&"local-file".to_string()), "Should include local-file");
        assert!(file_ids.contains(&"local-file-2".to_string()), "Should include local-file-2");
        assert!(!file_ids.contains(&"cloud-file".to_string()), "Should exclude cloud-file");
    }
    
    #[tokio::test]
    async fn test_batch_create_duplicate_groups_existing_group() {
        let pool = create_test_db().await.unwrap();
        let case_id = "test-case-5";
        let source_path = "/test/source";
        
        create_test_case(&pool, case_id, "Test Case").await.unwrap();
        create_test_source(&pool, case_id, source_path, "local").await.unwrap();
        
        // Create existing files with duplicate group already created
        let base_time = chrono::Utc::now().timestamp();
        create_test_file(&pool, case_id, "file-1", Some("existing-hash"), source_path, Some(base_time)).await.unwrap();
        create_test_file(&pool, case_id, "file-2", Some("existing-hash"), source_path, Some(base_time + 1)).await.unwrap();
        
        // Manually create duplicate group (simulating previous ingestion)
        let now = chrono::Utc::now().timestamp();
        sqlx::query("INSERT INTO duplicate_groups (group_id, file_id, is_primary, created_at) VALUES (?, ?, 1, ?)")
            .bind("existing-hash")
            .bind("file-1")
            .bind(now)
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("INSERT INTO duplicate_groups (group_id, file_id, is_primary, created_at) VALUES (?, ?, 0, ?)")
            .bind("existing-hash")
            .bind("file-2")
            .bind(now)
            .execute(&pool)
            .await
            .unwrap();
        
        // New file with same hash
        let files = vec![
            ProcessedFile {
                file_id: "file-3".to_string(),
                case_id: case_id.to_string(),
                file_name: "test.txt".to_string(),
                folder_path: "/test".to_string(),
                absolute_path: "/test/file-3.txt".to_string(),
                file_hash: Some("existing-hash".to_string()),
                file_type: "text/plain".to_string(),
                file_size: 1000,
                created_at: base_time + 2,
                modified_at: chrono::Utc::now().timestamp(),
                source_directory: source_path.to_string(),
                inventory_data: "{}".to_string(),
                action: FileAction::Insert,
            },
        ];
        
        let result = batch_create_duplicate_groups(&pool, case_id, &files, now).await;
        assert!(result.is_ok());
        
        // Verify file-3 added to existing group (not as primary)
        let file_3_primary: Option<i64> = sqlx::query_scalar(
            "SELECT is_primary FROM duplicate_groups WHERE group_id = 'existing-hash' AND file_id = 'file-3'"
        )
        .fetch_optional(&pool)
        .await
        .unwrap();
        
        assert_eq!(file_3_primary, Some(0), "New file should not be primary");
        
        // Verify original primary still exists
        let original_primary: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM duplicate_groups WHERE group_id = 'existing-hash' AND file_id = 'file-1' AND is_primary = 1"
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(original_primary, 1, "Original primary should remain");
    }
}

