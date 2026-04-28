export type EmailStatus = 'valid' | 'invalid' | 'risky' | 'unknown';
export type JobStatus = 'pending' | 'processing' | 'success' | 'error';

export interface ValidateRequest {
  email: string;
  check_mx?: boolean;
  check_disposable?: boolean;
  check_spam_trap?: boolean;
}

export interface BatchRequest {
  emails: ValidateRequest[];
}

export interface MxRecord {
  exchange: string;
  priority: number;
}

export interface ValidationResult {
  email: string;
  status: EmailStatus;
  score: number;
  format_valid: boolean;
  mx_found: boolean;
  mx_records: MxRecord[];
  disposable: boolean;
  free_provider: boolean;
  role_based: boolean;
  spam_trap_likely: boolean;
  domain: string;
  username: string;
  did_you_mean?: string;
  checks: {
    format: boolean;
    mx: boolean;
    disposable: boolean;
    spam_trap: boolean;
  };
  latency_ms: number;
  created_at: string;
}

export interface BatchResponse {
  batch_id: string;
  total: number;
  valid: number;
  invalid: number;
  risky: number;
  results: ValidationResult[];
  latency_ms: number;
}

export interface Job {
  job_id: string;
  status: JobStatus;
  created_at: string;
  completed_at?: string;
  result?: ValidationResult;
  error?: string;
}
