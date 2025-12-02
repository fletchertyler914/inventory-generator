export interface Note {
  id: string;
  case_id: string;
  file_id?: string; // null for case-level notes
  content: string;
  pinned: boolean;
  created_at: number;
  updated_at: number;
}

