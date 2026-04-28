export type LeadQuality = 'excellent' | 'good' | 'fair' | 'poor';
export type CompanySize = 'solo' | 'small' | 'medium' | 'large' | 'enterprise' | 'unknown';

export interface ScoreRequest {
  email?: string;
  phone?: string;
  domain?: string;
  company_name?: string;
  ip?: string;
}

export interface ContactData {
  email_valid: boolean;
  email_disposable: boolean;
  email_free_provider: boolean;
  email_role_based: boolean;
  phone_valid: boolean;
  phone_line_type: string;
}

export interface CompanyData {
  name?: string;
  domain?: string;
  description?: string;
  industry?: string;
  company_size?: CompanySize;
  is_b2b?: boolean;
  has_website?: boolean;
  technologies?: string[];
}

export interface ConversionSignals {
  likely_to_convert: boolean;
  confidence: number;
  positive_signals: string[];
  negative_signals: string[];
}

export interface LeadScoreResponse {
  id: string;
  lead_score: number;
  quality: LeadQuality;
  is_b2b: boolean;
  likely_to_convert: boolean;
  conversion_confidence: number;
  contact: ContactData;
  company?: CompanyData;
  conversion_signals: ConversionSignals;
  checks_performed: string[];
  latency_ms: number;
  created_at: string;
}

export interface BatchRequest {
  leads: ScoreRequest[];
}

export interface BatchResponse {
  batch_id: string;
  total: number;
  results: LeadScoreResponse[];
  latency_ms: number;
}
