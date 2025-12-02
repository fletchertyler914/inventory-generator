export type FileStatus = 'unreviewed' | 'in_progress' | 'reviewed' | 'flagged' | 'finalized';

export interface File {
  id: string;
  case_id: string;
  file_name: string;
  folder_path: string;
  absolute_path: string;
  file_hash?: string;
  file_type: string;
  file_size: number;
  created_at: number;
  modified_at: number;
  status: FileStatus;
  tags?: string[];
  source_directory?: string;
}

// Extended file with inventory metadata (for table display)
export interface FileWithInventory extends File {
  date_rcvd?: string;
  doc_year?: number;
  doc_date_range?: string;
  document_type?: string;
  document_description?: string;
  bates_stamp?: string;
  notes?: string;
}

