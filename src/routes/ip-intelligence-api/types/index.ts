export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';
export type JobStatus = 'pending' | 'processing' | 'success' | 'error';

export interface LookupRequest {
  ip: string;
  fields?: string[];
}

export interface BatchRequest {
  ips: LookupRequest[];
}

export interface LocationData {
  country?: string;
  country_code?: string;
  region?: string;
  region_code?: string;
  city?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  currency?: string;
  accuracy_radius?: number;
}

export interface NetworkData {
  asn?: string;
  asn_number?: number;
  org?: string;
  isp?: string;
  connection_type?: string;
  domain?: string;
}

export interface RiskData {
  score: number;
  threat_level: ThreatLevel;
  is_vpn: boolean;
  is_proxy: boolean;
  is_tor: boolean;
  is_hosting: boolean;
  is_anonymous: boolean;
  is_bogon: boolean;
  abuse_confidence?: number;
  confidence: number;
  factors: string[];
}

export interface LookupResponse {
  ip: string;
  type: 'IPv4' | 'IPv6' | 'private' | 'unknown';
  status: 'success' | 'error';
  location?: LocationData;
  network?: NetworkData;
  risk?: RiskData;
  latency_ms: number;
  created_at: string;
}

export interface BatchResponse {
  batch_id: string;
  total: number;
  results: LookupResponse[];
  latency_ms: number;
}
