use rust_xlsxwriter::*;
use std::collections::HashMap;
use std::fs::File;
use std::io::{Write, BufReader};
use serde_json;
use calamine::{open_workbook, Reader, Xlsx, Data};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct InventoryRow {
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
}

pub fn generate_xlsx(
    rows: &[InventoryRow],
    case_number: Option<&str>,
    folder_path: Option<&str>,
    output_path: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    
    // Set column widths
    worksheet.set_column_width(0, 12.0)?; // Date Rcvd
    worksheet.set_column_width(1, 10.0)?; // Doc Year
    worksheet.set_column_width(2, 18.0)?; // Doc Date Range
    worksheet.set_column_width(3, 20.0)?; // Document Type
    worksheet.set_column_width(4, 35.0)?; // Document Description
    worksheet.set_column_width(5, 30.0)?; // File Name
    worksheet.set_column_width(6, 20.0)?; // Folder Name
    worksheet.set_column_width(7, 40.0)?; // Folder Path
    worksheet.set_column_width(8, 10.0)?; // File Type
    worksheet.set_column_width(9, 15.0)?; // Bates Stamp
    worksheet.set_column_width(10, 30.0)?; // Notes
    
    // Create header format (bold)
    let header_format = Format::new()
        .set_bold()
        .set_border(FormatBorder::Thin);
    
    // Write metadata rows if case number or folder path provided
    let mut current_row = 0;
    if case_number.is_some() {
        // Create centered format for merged title cells
        let title_format = Format::new()
            .set_bold()
            .set_font_size(14)
            .set_align(FormatAlign::Center);
        
        // Merge first two cells and write title with case number
        let title_text = if let Some(case_no) = case_number {
            format!("Document Inventory - Case No. {}", case_no)
        } else {
            "Document Inventory".to_string()
        };
        
        worksheet.merge_range(current_row, 0, current_row, 1, &title_text, &title_format)?;
        current_row += 1;
        
        // Write folder path row if provided
        if let Some(folder) = folder_path {
            let folder_text = format!("Source Folder: {}", folder);
            worksheet.write_string(current_row, 0, &folder_text)?;
        }
        current_row += 1;
        
        // Empty row for spacing
        current_row += 1;
    } else if folder_path.is_some() {
        // If no case number but folder path exists, write folder path row
        if let Some(folder) = folder_path {
            let folder_text = format!("Source Folder: {}", folder);
            worksheet.write_string(current_row, 0, &folder_text)?;
        }
        current_row += 1;
        
        // Empty row for spacing
        current_row += 1;
    }
    
    // Write headers
    let headers = [
        "Date Rcvd",
        "Doc Year",
        "Doc Date Range",
        "Document Type",
        "Document Description",
        "File Name",
        "Folder Name",
        "Folder Path",
        "File Type",
        "Bates Stamp",
        "Notes",
    ];
    
    for (col, header) in headers.iter().enumerate() {
        worksheet.write_string_with_format(current_row, col as u16, header.to_string(), &header_format)?;
    }
    current_row += 1;
    
    // Write data rows
    for row in rows {
        worksheet.write_string(current_row, 0, &row.date_rcvd)?;
        worksheet.write_number(current_row, 1, row.doc_year as f64)?;
        worksheet.write_string(current_row, 2, &row.doc_date_range)?;
        worksheet.write_string(current_row, 3, &row.document_type)?;
        worksheet.write_string(current_row, 4, &row.document_description)?;
        worksheet.write_string(current_row, 5, &row.file_name)?;
        worksheet.write_string(current_row, 6, &row.folder_name)?;
        worksheet.write_string(current_row, 7, &row.folder_path)?;
        worksheet.write_string(current_row, 8, &row.file_type)?;
        worksheet.write_string(current_row, 9, &row.bates_stamp)?;
        worksheet.write_string(current_row, 10, &row.notes)?;
        current_row += 1;
    }
    
    workbook.save(output_path)?;
    Ok(())
}

pub fn generate_csv(
    rows: &[InventoryRow],
    case_number: Option<&str>,
    folder_path: Option<&str>,
    output_path: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut wtr = csv::Writer::from_path(output_path)?;
    
    // Write title row with case number and source folder row
    if case_number.is_some() {
        // First row: Merged title in first two cells
        // CSV doesn't support merged cells, so we put the full title in first cell
        // and leave second cell empty - user can merge manually in Excel/Numbers
        let title_text = if let Some(case_no) = case_number {
            format!("Document Inventory - Case No. {}", case_no)
        } else {
            "Document Inventory".to_string()
        };
        
        let mut title_row: Vec<String> = vec![title_text];
        // Second cell empty (will be merged with first in spreadsheet apps)
        title_row.push(String::new());
        // Pad with empty cells to match column structure (11 columns total)
        while title_row.len() < 11 {
            title_row.push(String::new());
        }
        let title_row_refs: Vec<&str> = title_row.iter().map(|s| s.as_str()).collect();
        wtr.write_record(&title_row_refs)?;
        
        // Write folder path row if provided
        if let Some(folder) = folder_path {
            let mut folder_row: Vec<String> = vec![format!("Source Folder: {}", folder)];
            // Pad with empty cells to match column structure (11 columns total)
            while folder_row.len() < 11 {
                folder_row.push(String::new());
            }
            let folder_row_refs: Vec<&str> = folder_row.iter().map(|s| s.as_str()).collect();
            wtr.write_record(&folder_row_refs)?;
        }
        
        // Empty row for spacing (matching XLSX format)
        let empty_row: Vec<&str> = vec![""; 11];
        wtr.write_record(&empty_row)?;
    } else if folder_path.is_some() {
        // If no case number but folder path exists, write folder path row
        if let Some(folder) = folder_path {
            let mut folder_row: Vec<String> = vec![format!("Source Folder: {}", folder)];
            // Pad with empty cells to match column structure (11 columns total)
            while folder_row.len() < 11 {
                folder_row.push(String::new());
            }
            let folder_row_refs: Vec<&str> = folder_row.iter().map(|s| s.as_str()).collect();
            wtr.write_record(&folder_row_refs)?;
        }
        
        // Empty row for spacing
        let empty_row: Vec<&str> = vec![""; 11];
        wtr.write_record(&empty_row)?;
    }
    
    // Write headers
    wtr.write_record(&[
        "Date Rcvd",
        "Doc Year",
        "Doc Date Range",
        "Document Type",
        "Document Description",
        "File Name",
        "Folder Name",
        "Folder Path",
        "File Type",
        "Bates Stamp",
        "Notes",
    ])?;
    
    // Write data rows
    for row in rows {
        wtr.write_record(&[
            &row.date_rcvd,
            &row.doc_year.to_string(),
            &row.doc_date_range,
            &row.document_type,
            &row.document_description,
            &row.file_name,
            &row.folder_name,
            &row.folder_path,
            &row.file_type,
            &row.bates_stamp,
            &row.notes,
        ])?;
    }
    
    wtr.flush()?;
    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize)]
struct JsonMetadata {
    case_number: Option<String>,
    folder_path: Option<String>,
}

#[derive(serde::Serialize)]
struct JsonExport {
    metadata: Option<JsonMetadata>,
    items: Vec<InventoryRow>,
}

pub fn generate_json(
    rows: &[InventoryRow],
    case_number: Option<&str>,
    folder_path: Option<&str>,
    output_path: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let export = JsonExport {
        metadata: if case_number.is_some() || folder_path.is_some() {
            Some(JsonMetadata {
                case_number: case_number.map(|s| s.to_string()),
                folder_path: folder_path.map(|s| s.to_string()),
            })
        } else {
            None
        },
        items: rows.to_vec(),
    };
    let json = serde_json::to_string_pretty(&export)?;
    let mut file = File::create(output_path)?;
    file.write_all(json.as_bytes())?;
    Ok(())
}

pub fn read_xlsx(
    file_path: &str,
) -> Result<(Vec<InventoryRow>, Option<String>, Option<String>), Box<dyn std::error::Error>> {
    let mut workbook: Xlsx<_> = open_workbook(file_path)?;
    let range = workbook
        .worksheet_range_at(0)
        .ok_or("No worksheet found")??;
    
    let mut case_number: Option<String> = None;
    let mut folder_path: Option<String> = None;
    let mut header_row_index = 0;
    let mut data_start_row = 1;
    
    // Check for metadata rows (title row with case number and folder path)
    let rows: Vec<_> = range.rows().collect();
    if let Some(row) = rows.get(0) {
        if let Some(cell) = row.get(0) {
            if let Data::String(ref s) = *cell {
                if s == "Document Inventory" {
                    // Check column 1 for case number
                    if let Some(case_cell) = row.get(1) {
                        if let Data::String(ref case_str) = *case_cell {
                            if case_str.starts_with("Case No. ") {
                                case_number = Some(case_str.replace("Case No. ", "").trim().to_string());
                            }
                        }
                    }
                    // Check row 1 for folder path
                    if let Some(folder_row) = rows.get(1) {
                        if let Some(folder_cell) = folder_row.get(0) {
                            if let Data::String(ref folder_str) = *folder_cell {
                                if folder_str.starts_with("Source Folder: ") {
                                    folder_path = Some(folder_str.replace("Source Folder: ", "").trim().to_string());
                                }
                            }
                        }
                    }
                    header_row_index = 2; // Skip title row, folder row, and empty row
                    data_start_row = 3;
                }
            }
        }
    }
    
    // Find header row
    let headers: Vec<String> = rows
        .get(header_row_index)
        .ok_or("No header row found")?
        .iter()
        .map(|cell| {
            match *cell {
                Data::String(ref s) => s.clone(),
                Data::Int(i) => i.to_string(),
                Data::Float(f) => f.to_string(),
                Data::Bool(b) => b.to_string(),
                Data::Error(ref e) => format!("Error: {:?}", e),
                Data::Empty => String::new(),
                Data::DateTime(ref dt) => format!("{:?}", dt),
                Data::DateTimeIso(ref s) => s.clone(),
                Data::DurationIso(ref s) => s.clone(),
            }
        })
        .collect();
    
    // Create a mapping from header name to column index
    let header_map: HashMap<String, usize> = headers
        .iter()
        .enumerate()
        .map(|(idx, header)| (header.trim().to_string(), idx))
        .collect();
    
    // Read data rows
    let mut inventory_rows = Vec::new();
    for row in rows.iter().skip(data_start_row) {
        if row.is_empty() {
            continue;
        }
        
        let get_cell_value = |col_name: &str| -> String {
            header_map
                .get(col_name)
                .and_then(|&idx| row.get(idx))
                .map(|cell| {
                    match *cell {
                        Data::String(ref s) => s.clone(),
                        Data::Int(i) => i.to_string(),
                        Data::Float(f) => f.to_string(),
                        Data::Bool(b) => b.to_string(),
                        Data::Error(ref e) => format!("Error: {:?}", e),
                        Data::Empty => String::new(),
                        Data::DateTime(ref dt) => format!("{:?}", dt),
                        Data::DateTimeIso(ref s) => s.clone(),
                        Data::DurationIso(ref s) => s.clone(),
                    }
                })
                .unwrap_or_default()
        };
        
        let doc_year_str = get_cell_value("Doc Year");
        let doc_year = doc_year_str.parse::<i32>().unwrap_or(0);
        
        inventory_rows.push(InventoryRow {
            date_rcvd: get_cell_value("Date Rcvd"),
            doc_year,
            doc_date_range: get_cell_value("Doc Date Range"),
            document_type: get_cell_value("Document Type"),
            document_description: get_cell_value("Document Description"),
            file_name: get_cell_value("File Name"),
            folder_name: get_cell_value("Folder Name"),
            folder_path: get_cell_value("Folder Path"),
            file_type: get_cell_value("File Type"),
            bates_stamp: get_cell_value("Bates Stamp"),
            notes: get_cell_value("Notes"),
        });
    }
    
    Ok((inventory_rows, case_number, folder_path))
}

pub fn read_csv(
    file_path: &str,
) -> Result<(Vec<InventoryRow>, Option<String>, Option<String>), Box<dyn std::error::Error>> {
    let file = File::open(file_path)?;
    let mut rdr = csv::Reader::from_reader(BufReader::new(file));
    
    let mut case_number: Option<String> = None;
    let mut folder_path: Option<String> = None;
    let mut skip_rows = 0;
    
    // Read first record to check if it's the title row
    let mut records = rdr.records();
    if let Some(Ok(first_record)) = records.next() {
        let first_field = first_record.get(0).unwrap_or("");
        if first_field == "Document Inventory" {
            // Parse case number from first row
            if let Some(case_field) = first_record.get(1) {
                if case_field.starts_with("Case No. ") {
                    case_number = Some(case_field.replace("Case No. ", "").trim().to_string());
                }
            }
            skip_rows = 1;
            
            // Check second row for folder path
            if let Some(Ok(second_record)) = records.next() {
                if let Some(folder_field) = second_record.get(0) {
                    if folder_field.starts_with("Source Folder: ") {
                        folder_path = Some(folder_field.replace("Source Folder: ", "").trim().to_string());
                    }
                }
                skip_rows = 2;
                
                // Check third row (should be empty)
                if let Some(Ok(_third_record)) = records.next() {
                    skip_rows = 3;
                }
            }
        } else if first_field.starts_with("#") {
            // Old format - metadata comment row
            skip_rows = 1;
            for field in first_record.iter() {
                if field.starts_with("Case No. ") {
                    case_number = Some(field.replace("Case No. ", "").trim().to_string());
                } else if field.starts_with("Source Folder: ") {
                    folder_path = Some(field.replace("Source Folder: ", "").trim().to_string());
                }
            }
        }
    }
    
    // Re-read file from start
    // If we have title rows, they come BEFORE headers in CSV
    let file = File::open(file_path)?;
    let mut rdr = csv::Reader::from_reader(BufReader::new(file));
    
    let headers: Vec<String> = if skip_rows > 0 {
        // Title rows come before headers - skip them, then read headers
        let file = File::open(file_path)?;
        let mut temp_rdr = csv::Reader::from_reader(BufReader::new(file));
        // Skip title rows
        for _ in 0..skip_rows {
            let mut record = csv::StringRecord::new();
            temp_rdr.read_record(&mut record)?;
        }
        // Now read headers
        temp_rdr.headers()?.iter().map(|s| s.to_string()).collect()
    } else {
        // Normal case - headers are first
        rdr.headers()?.iter().map(|s| s.to_string()).collect()
    };
    
    // Create a mapping from header name to column index
    let header_map: HashMap<String, usize> = headers
        .iter()
        .enumerate()
        .map(|(idx, header)| (header.trim().to_string(), idx))
        .collect();
    
    let mut rows = Vec::new();
    
    // Read data rows
    for result in rdr.records() {
        let record = result?;
        
        let get_field = |col_name: &str| -> String {
            header_map
                .get(col_name)
                .and_then(|&idx| record.get(idx))
                .map(|s| s.to_string())
                .unwrap_or_default()
        };
        
        let doc_year_str = get_field("Doc Year");
        let doc_year = doc_year_str.parse::<i32>().unwrap_or(0);
        
        rows.push(InventoryRow {
            date_rcvd: get_field("Date Rcvd"),
            doc_year,
            doc_date_range: get_field("Doc Date Range"),
            document_type: get_field("Document Type"),
            document_description: get_field("Document Description"),
            file_name: get_field("File Name"),
            folder_name: get_field("Folder Name"),
            folder_path: get_field("Folder Path"),
            file_type: get_field("File Type"),
            bates_stamp: get_field("Bates Stamp"),
            notes: get_field("Notes"),
        });
    }
    
    Ok((rows, case_number, folder_path))
}

#[derive(serde::Deserialize)]
struct JsonImport {
    metadata: Option<JsonMetadata>,
    items: Option<Vec<InventoryRow>>,
}

pub fn read_json(
    file_path: &str,
) -> Result<(Vec<InventoryRow>, Option<String>, Option<String>), Box<dyn std::error::Error>> {
    // Try to parse as new format with metadata first
    let file = File::open(file_path)?;
    let reader = BufReader::new(file);
    let json_value: serde_json::Value = serde_json::from_reader(reader)?;
    
    if json_value.get("metadata").is_some() {
        // New format with metadata
        let import: JsonImport = serde_json::from_value(json_value)?;
        let rows = import.items.unwrap_or_default();
        let case_number = import.metadata.as_ref().and_then(|m| m.case_number.clone());
        let folder_path = import.metadata.as_ref().and_then(|m| m.folder_path.clone());
        Ok((rows, case_number, folder_path))
    } else {
        // Old format - just array of items
        let rows: Vec<InventoryRow> = serde_json::from_value(json_value)?;
        Ok((rows, None, None))
    }
}

