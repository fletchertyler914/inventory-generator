export interface Case {
  id: string;
  name: string;
  case_id?: string;
  department?: string;
  client?: string;
  deployment_mode: 'local' | 'cloud';
  cloud_sync_enabled: boolean;
  created_at: number;
  updated_at: number;
  last_opened_at: number;
}

export interface CaseWithInventory extends Case {
  files: File[];
  file_count: number;
}

