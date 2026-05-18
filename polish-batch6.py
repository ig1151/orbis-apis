#!/usr/bin/env python3
"""Polish batch 6: typed schemas, canonical envelope, enums, deterministic structures."""

import os, json

BASE = '/workspaces/orbis-apis'

# ── Shared canonical component schemas ─────────────────────────────────────────
SHARED = {
    'Confidence': {
        'type': 'object', 'required': ['score'],
        'properties': {
            'score': {'type': 'number', 'minimum': 0, 'maximum': 1},
            'reason': {'type': 'string'},
            'per_section': {'type': 'object', 'additionalProperties': {'type': 'number'}}
        }
    },
    'Provenance': {
        'type': 'object', 'required': ['provider', 'retrieved_at'],
        'properties': {
            'provider': {'type': 'string'},
            'retrieved_at': {'type': 'string', 'format': 'date-time'},
            'source_type': {'type': 'string', 'enum': ['live_scan', 'cached', 'ai_generated', 'api_call']}
        }
    },
    'Cache': {
        'type': 'object',
        'properties': {
            'recommended_ttl_seconds': {'type': 'integer'},
            'retryable': {'type': 'boolean'},
            'cache_recommended': {'type': 'boolean'}
        }
    },
    'NextApi': {
        'type': 'array',
        'items': {
            'type': 'object', 'required': ['api', 'reason'],
            'properties': {'api': {'type': 'string'}, 'endpoint': {'type': 'string'}, 'reason': {'type': 'string'}}
        }
    },
    'Recommendation': {
        'type': 'array',
        'items': {
            'type': 'object', 'required': ['priority', 'action'],
            'properties': {
                'priority': {'type': 'string', 'enum': ['high', 'medium', 'low']},
                'action': {'type': 'string'},
                'reason': {'type': 'string'}
            }
        }
    },
    'ExecMeta': {
        'type': 'object',
        'properties': {
            'latency_ms': {'type': 'integer'},
            'model': {'type': 'string'},
            'automation_safe': {'type': 'boolean'}
        }
    },
    'Error': {
        'type': 'object', 'required': ['error', 'code'],
        'properties': {
            'error': {'type': 'string'}, 'code': {'type': 'string'},
            'retryable': {'type': 'boolean'}, 'details': {'type': 'string'}
        }
    },
}

def env(data_ref):
    return {
        'type': 'object',
        'required': ['success', 'request_id', 'data', 'confidence', 'provenance'],
        'properties': {
            'success': {'type': 'boolean'},
            'request_id': {'type': 'string', 'format': 'uuid'},
            'data': {'$ref': f'#/components/schemas/{data_ref}'},
            'confidence': {'$ref': '#/components/schemas/Confidence'},
            'provenance': {'$ref': '#/components/schemas/Provenance'},
            'cache': {'$ref': '#/components/schemas/Cache'},
            'recommended_next_api': {'$ref': '#/components/schemas/NextApi'},
            'recommended_actions_priority_order': {'$ref': '#/components/schemas/Recommendation'},
            'execution_metadata': {'$ref': '#/components/schemas/ExecMeta'},
        }
    }

def gate_env():
    return {
        'type': 'object',
        'required': ['success', 'request_id', 'execution_ready'],
        'properties': {
            'success': {'type': 'boolean'},
            'request_id': {'type': 'string', 'format': 'uuid'},
            'execution_ready': {'type': 'boolean'},
            'next_api': {'type': 'string'},
            'next_endpoint': {'type': 'string'},
            'blocking_flags': {'type': 'array', 'items': {'type': 'string'}},
            'confidence': {'$ref': '#/components/schemas/Confidence'},
            'provenance': {'$ref': '#/components/schemas/Provenance'},
            'execution_metadata': {'$ref': '#/components/schemas/ExecMeta'},
        }
    }

issue_item = lambda: {
    'type': 'object', 'required': ['severity', 'message'],
    'properties': {
        'field': {'type': 'string'},
        'severity': {'type': 'string', 'enum': ['critical', 'warning', 'info']},
        'message': {'type': 'string'},
        'fix': {'type': 'string'}
    }
}

# ── Per-API data schemas ────────────────────────────────────────────────────────
# Each entry: slug -> { schemas: {Name: schema}, endpoint_map: {ep_slug: SchemaName} }

APIS = {
    'meta-tags-extractor': {
        'schemas': {
            'ExtractData': {
                'type': 'object', 'required': ['url', 'meta_count'],
                'properties': {
                    'url': {'type': 'string'},
                    'title': {'type': 'string'},
                    'description': {'type': 'string'},
                    'keywords': {'type': 'array', 'items': {'type': 'string'}},
                    'canonical': {'type': 'string'},
                    'robots': {'type': 'string'},
                    'og_tags': {'type': 'object', 'properties': {'title': {'type': 'string'}, 'description': {'type': 'string'}, 'image': {'type': 'string'}, 'type': {'type': 'string'}, 'site_name': {'type': 'string'}}},
                    'twitter_card': {'type': 'object', 'properties': {'card': {'type': 'string', 'enum': ['summary', 'summary_large_image', 'app', 'player']}, 'title': {'type': 'string'}, 'description': {'type': 'string'}, 'image': {'type': 'string'}}},
                    'meta_count': {'type': 'integer'},
                    'charset': {'type': 'string'},
                }
            },
            'ValidateData': {
                'type': 'object', 'required': ['url', 'score', 'seo_compliance_level'],
                'properties': {
                    'url': {'type': 'string'},
                    'score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'seo_compliance_level': {'type': 'string', 'enum': ['excellent', 'good', 'fair', 'poor']},
                    'issues': {'type': 'array', 'items': issue_item()},
                    'missing_tags': {'type': 'array', 'items': {'type': 'string'}},
                    'duplicate_tags': {'type': 'array', 'items': {'type': 'string'}},
                }
            },
            'MetaBatchData': {
                'type': 'object', 'required': ['results', 'summary'],
                'properties': {
                    'results': {'type': 'array', 'items': {'type': 'object', 'properties': {'url': {'type': 'string'}, 'title': {'type': 'string'}, 'description': {'type': 'string'}, 'meta_count': {'type': 'integer'}, 'error': {'type': 'string', 'nullable': True}}}},
                    'summary': {'type': 'object', 'properties': {'total': {'type': 'integer'}, 'successful': {'type': 'integer'}, 'failed': {'type': 'integer'}}}
                }
            },
            'MetaIntelligenceData': {
                'type': 'object', 'required': ['url', 'seo_score'],
                'properties': {
                    'url': {'type': 'string'},
                    'seo_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'title': {'type': 'string'}, 'description': {'type': 'string'},
                    'og_completeness': {'type': 'string', 'enum': ['complete', 'partial', 'missing']},
                    'twitter_completeness': {'type': 'string', 'enum': ['complete', 'partial', 'missing']},
                    'issues': {'type': 'array', 'items': issue_item()},
                    'missing_tags': {'type': 'array', 'items': {'type': 'string'}},
                }
            },
        },
        'endpoint_map': {'extract': 'ExtractData', 'validate': 'ValidateData', 'batch': 'MetaBatchData', 'meta-intelligence': 'MetaIntelligenceData'},
    },

    'open-graph-preview': {
        'schemas': {
            'OGPreviewData': {
                'type': 'object', 'required': ['url', 'og_title'],
                'properties': {
                    'url': {'type': 'string'},
                    'og_title': {'type': 'string'}, 'og_description': {'type': 'string'},
                    'og_image': {'type': 'string'}, 'og_type': {'type': 'string'},
                    'og_site_name': {'type': 'string'},
                    'twitter_card': {'type': 'string', 'enum': ['summary', 'summary_large_image', 'app', 'player']},
                    'twitter_title': {'type': 'string'}, 'twitter_description': {'type': 'string'},
                    'twitter_image': {'type': 'string'},
                    'share_preview_quality': {'type': 'string', 'enum': ['excellent', 'good', 'fair', 'poor']},
                }
            },
            'OGValidateData': {
                'type': 'object', 'required': ['url', 'score'],
                'properties': {
                    'url': {'type': 'string'},
                    'score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'missing_tags': {'type': 'array', 'items': {'type': 'string'}},
                    'issues': {'type': 'array', 'items': issue_item()},
                    'og_completeness': {'type': 'string', 'enum': ['complete', 'partial', 'missing']},
                    'twitter_completeness': {'type': 'string', 'enum': ['complete', 'partial', 'missing']},
                }
            },
            'OGGenerateData': {
                'type': 'object', 'required': ['url'],
                'properties': {
                    'url': {'type': 'string'},
                    'suggested_og': {'type': 'object', 'properties': {'title': {'type': 'string'}, 'description': {'type': 'string'}, 'type': {'type': 'string'}}},
                    'suggested_twitter': {'type': 'object', 'properties': {'card': {'type': 'string'}, 'title': {'type': 'string'}, 'description': {'type': 'string'}}},
                    'html_snippet': {'type': 'string'},
                }
            },
            'OGIntelligenceData': {
                'type': 'object', 'required': ['url', 'overall_score'],
                'properties': {
                    'url': {'type': 'string'},
                    'overall_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'preview': {'$ref': '#/components/schemas/OGPreviewData'},
                    'validation': {'$ref': '#/components/schemas/OGValidateData'},
                    'generated_tags': {'$ref': '#/components/schemas/OGGenerateData'},
                    'ctr_lift_estimate': {'type': 'number'},
                }
            },
        },
        'endpoint_map': {'preview': 'OGPreviewData', 'validate': 'OGValidateData', 'generate': 'OGGenerateData', 'og-intelligence': 'OGIntelligenceData'},
    },

    'app-store-lookup': {
        'schemas': {
            'AppLookupData': {
                'type': 'object', 'required': ['app_id', 'name', 'platform'],
                'properties': {
                    'app_id': {'type': 'string'}, 'name': {'type': 'string'},
                    'developer': {'type': 'string'}, 'platform': {'type': 'string', 'enum': ['ios', 'android', 'both']},
                    'rating': {'type': 'number', 'minimum': 0, 'maximum': 5},
                    'reviews_count': {'type': 'integer'}, 'price': {'type': 'number'},
                    'category': {'type': 'string'}, 'last_updated': {'type': 'string', 'format': 'date'},
                    'version': {'type': 'string'}, 'size_mb': {'type': 'number'},
                    'age_rating': {'type': 'string'}, 'downloads': {'type': 'string'},
                }
            },
            'AppReviewsData': {
                'type': 'object', 'required': ['app_id', 'reviews'],
                'properties': {
                    'app_id': {'type': 'string'},
                    'reviews': {'type': 'array', 'items': {'type': 'object', 'properties': {'rating': {'type': 'integer', 'minimum': 1, 'maximum': 5}, 'title': {'type': 'string'}, 'body': {'type': 'string'}, 'date': {'type': 'string', 'format': 'date'}, 'version': {'type': 'string'}}}},
                    'sentiment_summary': {'type': 'object', 'properties': {'positive': {'type': 'number'}, 'neutral': {'type': 'number'}, 'negative': {'type': 'number'}}},
                    'avg_rating': {'type': 'number'}, 'total_reviews': {'type': 'integer'},
                }
            },
            'AppSimilarData': {
                'type': 'object', 'required': ['app_id', 'similar_apps'],
                'properties': {
                    'app_id': {'type': 'string'},
                    'similar_apps': {'type': 'array', 'items': {'type': 'object', 'properties': {'name': {'type': 'string'}, 'developer': {'type': 'string'}, 'rating': {'type': 'number'}, 'downloads': {'type': 'string'}, 'overlap_score': {'type': 'number'}}}},
                }
            },
            'AppIntelligenceData': {
                'type': 'object', 'required': ['app_id', 'market_position'],
                'properties': {
                    'app_id': {'type': 'string'},
                    'market_position': {'type': 'string', 'enum': ['market_leader', 'strong_competitor', 'niche', 'declining']},
                    'app_details': {'$ref': '#/components/schemas/AppLookupData'},
                    'sentiment_summary': {'type': 'object', 'properties': {'positive': {'type': 'number'}, 'neutral': {'type': 'number'}, 'negative': {'type': 'number'}}},
                    'competitive_threats': {'type': 'array', 'items': {'type': 'string'}},
                    'growth_trend': {'type': 'string', 'enum': ['growing', 'stable', 'declining']},
                }
            },
        },
        'endpoint_map': {'lookup': 'AppLookupData', 'reviews': 'AppReviewsData', 'similar': 'AppSimilarData', 'app-intelligence': 'AppIntelligenceData'},
    },

    'chrome-extension-lookup': {
        'schemas': {
            'ExtensionLookupData': {
                'type': 'object', 'required': ['extension_id', 'name'],
                'properties': {
                    'extension_id': {'type': 'string'}, 'name': {'type': 'string'},
                    'developer': {'type': 'string'}, 'version': {'type': 'string'},
                    'users': {'type': 'integer'}, 'rating': {'type': 'number', 'minimum': 0, 'maximum': 5},
                    'last_updated': {'type': 'string', 'format': 'date'},
                    'category': {'type': 'string'}, 'size_kb': {'type': 'integer'},
                }
            },
            'ExtensionAnalyzeData': {
                'type': 'object', 'required': ['extension_id', 'risk_score', 'risk_level'],
                'properties': {
                    'extension_id': {'type': 'string'},
                    'risk_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'risk_level': {'type': 'string', 'enum': ['high', 'medium', 'low', 'safe']},
                    'permissions': {'type': 'array', 'items': {'type': 'object', 'properties': {'name': {'type': 'string'}, 'sensitivity': {'type': 'string', 'enum': ['high', 'medium', 'low']}, 'description': {'type': 'string'}}}},
                    'security_flags': {'type': 'array', 'items': {'type': 'string'}},
                    'data_access': {'type': 'array', 'items': {'type': 'string'}},
                }
            },
            'ExtensionSimilarData': {
                'type': 'object', 'required': ['extension_id', 'similar_extensions'],
                'properties': {
                    'extension_id': {'type': 'string'},
                    'similar_extensions': {'type': 'array', 'items': {'type': 'object', 'properties': {'name': {'type': 'string'}, 'users': {'type': 'integer'}, 'rating': {'type': 'number'}, 'risk_level': {'type': 'string', 'enum': ['high', 'medium', 'low', 'safe']}}}},
                }
            },
            'ExtensionIntelligenceData': {
                'type': 'object', 'required': ['extension_id', 'risk_level'],
                'properties': {
                    'extension_id': {'type': 'string'},
                    'risk_level': {'type': 'string', 'enum': ['high', 'medium', 'low', 'safe']},
                    'details': {'$ref': '#/components/schemas/ExtensionLookupData'},
                    'security': {'$ref': '#/components/schemas/ExtensionAnalyzeData'},
                    'safer_alternatives': {'type': 'array', 'items': {'type': 'string'}},
                    'install_recommendation': {'type': 'string', 'enum': ['safe_to_install', 'review_permissions', 'avoid']},
                }
            },
        },
        'endpoint_map': {'lookup': 'ExtensionLookupData', 'analyze': 'ExtensionAnalyzeData', 'similar': 'ExtensionSimilarData', 'extension-intelligence': 'ExtensionIntelligenceData'},
    },

    'browser-compatibility': {
        'schemas': {
            'CompatCheckData': {
                'type': 'object', 'required': ['feature', 'browsers'],
                'properties': {
                    'feature': {'type': 'string'},
                    'browsers': {'type': 'array', 'items': {'type': 'object', 'required': ['name', 'support_status'], 'properties': {'name': {'type': 'string'}, 'min_version': {'type': 'string'}, 'support_status': {'type': 'string', 'enum': ['supported', 'partial', 'unsupported', 'flagged']}, 'global_usage_percent': {'type': 'number'}, 'notes': {'type': 'string'}}}},
                    'overall_support_percent': {'type': 'number'},
                    'mdn_url': {'type': 'string'},
                }
            },
            'PolyfillData': {
                'type': 'object', 'required': ['features', 'polyfills'],
                'properties': {
                    'features': {'type': 'array', 'items': {'type': 'string'}},
                    'polyfills': {'type': 'array', 'items': {'type': 'object', 'required': ['name'], 'properties': {'name': {'type': 'string'}, 'size_kb': {'type': 'number'}, 'cdn_url': {'type': 'string'}, 'npm_package': {'type': 'string'}, 'covers_features': {'type': 'array', 'items': {'type': 'string'}}}}},
                    'total_polyfill_size_kb': {'type': 'number'},
                }
            },
            'CompatReportData': {
                'type': 'object', 'required': ['url', 'overall_score'],
                'properties': {
                    'url': {'type': 'string'},
                    'overall_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'unsupported_features': {'type': 'array', 'items': {'type': 'object', 'properties': {'feature': {'type': 'string'}, 'affected_browsers': {'type': 'array', 'items': {'type': 'string'}}, 'severity': {'type': 'string', 'enum': ['critical', 'warning', 'info']}}}},
                    'browser_coverage': {'type': 'object', 'additionalProperties': {'type': 'number'}},
                }
            },
            'CompatIntelligenceData': {
                'type': 'object', 'required': ['overall_support_percent'],
                'properties': {
                    'overall_support_percent': {'type': 'number'},
                    'compatibility_grade': {'type': 'string', 'enum': ['A', 'B', 'C', 'D', 'F']},
                    'check': {'$ref': '#/components/schemas/CompatCheckData'},
                    'polyfills_needed': {'$ref': '#/components/schemas/PolyfillData'},
                    'critical_issues': {'type': 'integer'},
                }
            },
        },
        'endpoint_map': {'check': 'CompatCheckData', 'polyfills': 'PolyfillData', 'report': 'CompatReportData', 'compat-intelligence': 'CompatIntelligenceData'},
    },

    'dns-propagation': {
        'schemas': {
            'PropagationCheckData': {
                'type': 'object', 'required': ['domain', 'record_type', 'propagation_percentage', 'propagation_status'],
                'properties': {
                    'domain': {'type': 'string'},
                    'record_type': {'type': 'string', 'enum': ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR']},
                    'propagation_percentage': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'propagation_status': {'type': 'string', 'enum': ['complete', 'partial', 'not_started', 'failed']},
                    'nodes': {'type': 'array', 'items': {'type': 'object', 'required': ['region', 'status'], 'properties': {'region': {'type': 'string'}, 'nameserver': {'type': 'string'}, 'ip': {'type': 'string'}, 'status': {'type': 'string', 'enum': ['propagated', 'pending', 'failed']}, 'latency_ms': {'type': 'integer'}, 'resolved_value': {'type': 'string'}}}},
                    'estimated_completion_minutes': {'type': 'integer'},
                }
            },
            'PropagationStatusData': {
                'type': 'object', 'required': ['domain', 'is_propagated'],
                'properties': {
                    'domain': {'type': 'string'},
                    'record_type': {'type': 'string', 'enum': ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR']},
                    'is_propagated': {'type': 'boolean'},
                    'propagation_percentage': {'type': 'number'},
                    'regions_summary': {'type': 'object', 'properties': {'propagated': {'type': 'integer'}, 'pending': {'type': 'integer'}, 'failed': {'type': 'integer'}}},
                    'fully_propagated_at': {'type': 'string', 'format': 'date-time', 'nullable': True},
                }
            },
            'PropagationTraceData': {
                'type': 'object', 'required': ['domain', 'resolution_path'],
                'properties': {
                    'domain': {'type': 'string'},
                    'resolution_path': {'type': 'array', 'items': {'type': 'object', 'properties': {'step': {'type': 'integer'}, 'server': {'type': 'string'}, 'response': {'type': 'string'}, 'latency_ms': {'type': 'integer'}}}},
                    'authoritative_ns': {'type': 'array', 'items': {'type': 'string'}},
                    'final_value': {'type': 'string'},
                    'ttl_seconds': {'type': 'integer'},
                }
            },
            'PropagationIntelligenceData': {
                'type': 'object', 'required': ['domain', 'propagation_status', 'propagation_percentage'],
                'properties': {
                    'domain': {'type': 'string'},
                    'propagation_status': {'type': 'string', 'enum': ['complete', 'partial', 'not_started', 'failed']},
                    'propagation_percentage': {'type': 'number'},
                    'check': {'$ref': '#/components/schemas/PropagationCheckData'},
                    'trace': {'$ref': '#/components/schemas/PropagationTraceData'},
                    'health_assessment': {'type': 'string', 'enum': ['healthy', 'in_progress', 'stalled', 'failed']},
                    'estimated_completion_minutes': {'type': 'integer'},
                }
            },
        },
        'endpoint_map': {'check': 'PropagationCheckData', 'status': 'PropagationStatusData', 'trace': 'PropagationTraceData', 'propagation-intelligence': 'PropagationIntelligenceData'},
    },

    'ssl-expiry-monitor': {
        'schemas': {
            'SSLExpiryCheckData': {
                'type': 'object', 'required': ['domain', 'expires_at', 'days_remaining', 'urgency_level'],
                'properties': {
                    'domain': {'type': 'string'},
                    'expires_at': {'type': 'string', 'format': 'date-time'},
                    'issued_at': {'type': 'string', 'format': 'date-time'},
                    'days_remaining': {'type': 'integer'},
                    'is_expired': {'type': 'boolean'},
                    'urgency_level': {'type': 'string', 'enum': ['critical', 'warning', 'ok']},
                    'issuer': {'type': 'string'},
                    'subject': {'type': 'string'},
                    'san_domains': {'type': 'array', 'items': {'type': 'string'}},
                    'auto_renew_detected': {'type': 'boolean'},
                }
            },
            'SSLMonitorData': {
                'type': 'object', 'required': ['domains_checked', 'summary'],
                'properties': {
                    'domains_checked': {'type': 'integer'},
                    'critical': {'type': 'array', 'items': {'type': 'object', 'properties': {'domain': {'type': 'string'}, 'days_remaining': {'type': 'integer'}}}},
                    'warning': {'type': 'array', 'items': {'type': 'object', 'properties': {'domain': {'type': 'string'}, 'days_remaining': {'type': 'integer'}}}},
                    'ok': {'type': 'array', 'items': {'type': 'object', 'properties': {'domain': {'type': 'string'}, 'days_remaining': {'type': 'integer'}}}},
                    'summary': {'type': 'object', 'properties': {'critical_count': {'type': 'integer'}, 'warning_count': {'type': 'integer'}, 'ok_count': {'type': 'integer'}}},
                }
            },
            'SSLAlertData': {
                'type': 'object', 'required': ['domain', 'days_remaining', 'urgency_level'],
                'properties': {
                    'domain': {'type': 'string'},
                    'days_remaining': {'type': 'integer'},
                    'urgency_level': {'type': 'string', 'enum': ['critical', 'warning', 'ok']},
                    'renewal_steps': {'type': 'array', 'items': {'type': 'object', 'properties': {'step': {'type': 'integer'}, 'action': {'type': 'string'}, 'estimated_time': {'type': 'string'}}}},
                    'estimated_downtime_risk': {'type': 'string', 'enum': ['high', 'medium', 'low', 'none']},
                    'auto_renew_available': {'type': 'boolean'},
                }
            },
            'SSLExpiryIntelligenceData': {
                'type': 'object', 'required': ['domain', 'days_remaining', 'urgency_level'],
                'properties': {
                    'domain': {'type': 'string'},
                    'days_remaining': {'type': 'integer'},
                    'urgency_level': {'type': 'string', 'enum': ['critical', 'warning', 'ok']},
                    'certificate': {'$ref': '#/components/schemas/SSLExpiryCheckData'},
                    'alert': {'$ref': '#/components/schemas/SSLAlertData'},
                    'action_required': {'type': 'boolean'},
                }
            },
        },
        'endpoint_map': {'check': 'SSLExpiryCheckData', 'monitor': 'SSLMonitorData', 'alert': 'SSLAlertData', 'ssl-expiry-intelligence': 'SSLExpiryIntelligenceData'},
    },

    'tls-configuration': {
        'schemas': {
            'TLSAnalyzeData': {
                'type': 'object', 'required': ['domain', 'tls_versions', 'cipher_suites'],
                'properties': {
                    'domain': {'type': 'string'},
                    'tls_versions': {'type': 'array', 'items': {'type': 'object', 'required': ['version', 'enabled'], 'properties': {'version': {'type': 'string', 'enum': ['TLS 1.0', 'TLS 1.1', 'TLS 1.2', 'TLS 1.3']}, 'enabled': {'type': 'boolean'}, 'recommended': {'type': 'boolean'}}}},
                    'cipher_suites': {'type': 'array', 'items': {'type': 'object', 'required': ['name', 'strength'], 'properties': {'name': {'type': 'string'}, 'strength': {'type': 'string', 'enum': ['strong', 'adequate', 'weak', 'insecure']}, 'pfs': {'type': 'boolean'}}}},
                    'vulnerabilities': {'type': 'array', 'items': {'type': 'object', 'properties': {'name': {'type': 'string'}, 'cve_id': {'type': 'string'}, 'severity': {'type': 'string', 'enum': ['critical', 'high', 'medium', 'low']}}}},
                    'certificate_info': {'type': 'object', 'properties': {'issuer': {'type': 'string'}, 'valid_until': {'type': 'string', 'format': 'date-time'}, 'key_bits': {'type': 'integer'}, 'signature_algorithm': {'type': 'string'}}},
                    'hsts_enabled': {'type': 'boolean'},
                }
            },
            'TLSGradeData': {
                'type': 'object', 'required': ['domain', 'grade', 'score'],
                'properties': {
                    'domain': {'type': 'string'},
                    'grade': {'type': 'string', 'enum': ['A+', 'A', 'B', 'C', 'D', 'F']},
                    'score': {'type': 'integer', 'minimum': 0, 'maximum': 100},
                    'breakdown': {'type': 'object', 'properties': {'protocol_support': {'type': 'integer'}, 'key_exchange': {'type': 'integer'}, 'cipher_strength': {'type': 'integer'}, 'certificate': {'type': 'integer'}}},
                    'vulnerabilities_count': {'type': 'integer'},
                }
            },
            'TLSRecommendationsData': {
                'type': 'object', 'required': ['domain', 'hardening_recommendations'],
                'properties': {
                    'domain': {'type': 'string'},
                    'hardening_recommendations': {'type': 'array', 'items': {'type': 'object', 'required': ['priority', 'action'], 'properties': {'priority': {'type': 'string', 'enum': ['critical', 'high', 'medium', 'low']}, 'action': {'type': 'string'}, 'reason': {'type': 'string'}, 'cve_reference': {'type': 'string'}}}},
                    'compliance_gaps': {'type': 'array', 'items': {'type': 'object', 'properties': {'framework': {'type': 'string', 'enum': ['PCI-DSS', 'NIST', 'SOC2', 'HIPAA', 'GDPR']}, 'requirement': {'type': 'string'}, 'status': {'type': 'string', 'enum': ['pass', 'fail', 'partial']}}}},
                    'estimated_fix_hours': {'type': 'number'},
                }
            },
            'TLSIntelligenceData': {
                'type': 'object', 'required': ['domain', 'grade'],
                'properties': {
                    'domain': {'type': 'string'},
                    'grade': {'type': 'string', 'enum': ['A+', 'A', 'B', 'C', 'D', 'F']},
                    'analyze': {'$ref': '#/components/schemas/TLSAnalyzeData'},
                    'grade_detail': {'$ref': '#/components/schemas/TLSGradeData'},
                    'remediation': {'$ref': '#/components/schemas/TLSRecommendationsData'},
                    'critical_vulnerabilities': {'type': 'integer'},
                }
            },
        },
        'endpoint_map': {'analyze': 'TLSAnalyzeData', 'grade': 'TLSGradeData', 'recommendations': 'TLSRecommendationsData', 'tls-intelligence': 'TLSIntelligenceData'},
    },

    'website-carbon-footprint': {
        'schemas': {
            'CarbonEstimateData': {
                'type': 'object', 'required': ['url', 'co2_grams', 'rating'],
                'properties': {
                    'url': {'type': 'string'},
                    'co2_grams': {'type': 'number'},
                    'co2_grams_per_view': {'type': 'number'},
                    'page_size_kb': {'type': 'number'},
                    'energy_kwh': {'type': 'number'},
                    'rating': {'type': 'string', 'enum': ['A+', 'A', 'B', 'C', 'D', 'E', 'F']},
                    'cleaner_than_percent': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'annual_co2_kg_per_10k_views': {'type': 'number'},
                    'renewable_energy_used': {'type': 'boolean'},
                }
            },
            'CarbonBenchmarkData': {
                'type': 'object', 'required': ['url', 'co2_grams', 'industry_average_grams'],
                'properties': {
                    'url': {'type': 'string'},
                    'co2_grams': {'type': 'number'},
                    'industry_average_grams': {'type': 'number'},
                    'industry_category': {'type': 'string'},
                    'percentile': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'vs_industry': {'type': 'string', 'enum': ['above_average', 'average', 'below_average']},
                    'vs_global_median': {'type': 'string', 'enum': ['cleaner', 'average', 'dirtier']},
                }
            },
            'CarbonOptimizeData': {
                'type': 'object', 'required': ['url', 'optimizations'],
                'properties': {
                    'url': {'type': 'string'},
                    'current_co2_grams': {'type': 'number'},
                    'optimizations': {'type': 'array', 'items': {'type': 'object', 'required': ['action', 'co2_savings_grams'], 'properties': {'action': {'type': 'string'}, 'category': {'type': 'string', 'enum': ['images', 'scripts', 'fonts', 'server', 'caching', 'rendering']}, 'co2_savings_grams': {'type': 'number'}, 'difficulty': {'type': 'string', 'enum': ['easy', 'medium', 'hard']}}}},
                    'potential_savings_percent': {'type': 'number'},
                    'estimated_optimized_co2_grams': {'type': 'number'},
                }
            },
            'CarbonIntelligenceData': {
                'type': 'object', 'required': ['url', 'co2_grams', 'rating'],
                'properties': {
                    'url': {'type': 'string'},
                    'co2_grams': {'type': 'number'},
                    'rating': {'type': 'string', 'enum': ['A+', 'A', 'B', 'C', 'D', 'E', 'F']},
                    'estimate': {'$ref': '#/components/schemas/CarbonEstimateData'},
                    'benchmark': {'$ref': '#/components/schemas/CarbonBenchmarkData'},
                    'top_optimizations': {'$ref': '#/components/schemas/CarbonOptimizeData'},
                }
            },
        },
        'endpoint_map': {'estimate': 'CarbonEstimateData', 'benchmark': 'CarbonBenchmarkData', 'optimize': 'CarbonOptimizeData', 'carbon-intelligence': 'CarbonIntelligenceData'},
    },

    'accessibility-audit-lite': {
        'schemas': {
            'A11yAuditData': {
                'type': 'object', 'required': ['url', 'violations', 'wcag_level'],
                'properties': {
                    'url': {'type': 'string'},
                    'violations': {'type': 'array', 'items': {'type': 'object', 'required': ['id', 'impact', 'description'], 'properties': {'id': {'type': 'string'}, 'impact': {'type': 'string', 'enum': ['critical', 'serious', 'moderate', 'minor']}, 'wcag_criterion': {'type': 'string'}, 'description': {'type': 'string'}, 'affected_elements': {'type': 'array', 'items': {'type': 'string'}}, 'fix': {'type': 'string'}}}},
                    'passes': {'type': 'integer'},
                    'violations_count': {'type': 'integer'},
                    'warnings': {'type': 'integer'},
                    'wcag_level': {'type': 'string', 'enum': ['A', 'AA', 'AAA', 'none']},
                }
            },
            'A11yScoreData': {
                'type': 'object', 'required': ['url', 'score'],
                'properties': {
                    'url': {'type': 'string'},
                    'score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'wcag_a_compliance': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'wcag_aa_compliance': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'wcag_aaa_compliance': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'grade': {'type': 'string', 'enum': ['A+', 'A', 'B', 'C', 'D', 'F']},
                    'critical_violations': {'type': 'integer'},
                }
            },
            'A11yFixData': {
                'type': 'object', 'required': ['url', 'fixes'],
                'properties': {
                    'url': {'type': 'string'},
                    'fixes': {'type': 'array', 'items': {'type': 'object', 'required': ['priority', 'violation_id', 'fix_description'], 'properties': {'priority': {'type': 'string', 'enum': ['critical', 'high', 'medium', 'low']}, 'violation_id': {'type': 'string'}, 'wcag_criterion': {'type': 'string'}, 'fix_description': {'type': 'string'}, 'code_snippet': {'type': 'string'}, 'estimated_minutes': {'type': 'integer'}}}},
                    'estimated_total_hours': {'type': 'number'},
                    'quick_wins_count': {'type': 'integer'},
                }
            },
            'A11yIntelligenceData': {
                'type': 'object', 'required': ['url', 'score', 'wcag_level'],
                'properties': {
                    'url': {'type': 'string'},
                    'score': {'type': 'number'},
                    'wcag_level': {'type': 'string', 'enum': ['A', 'AA', 'AAA', 'none']},
                    'audit': {'$ref': '#/components/schemas/A11yAuditData'},
                    'score_detail': {'$ref': '#/components/schemas/A11yScoreData'},
                    'top_fixes': {'$ref': '#/components/schemas/A11yFixData'},
                    'critical_violations': {'type': 'integer'},
                }
            },
        },
        'endpoint_map': {'audit': 'A11yAuditData', 'score': 'A11yScoreData', 'fix-suggestions': 'A11yFixData', 'accessibility-intelligence': 'A11yIntelligenceData'},
    },

    'keyword-density': {
        'schemas': {
            'KeywordAnalyzeData': {
                'type': 'object', 'required': ['word_count', 'top_keywords'],
                'properties': {
                    'word_count': {'type': 'integer'},
                    'unique_words': {'type': 'integer'},
                    'top_keywords': {'type': 'array', 'items': {'type': 'object', 'required': ['keyword', 'count', 'density'], 'properties': {'keyword': {'type': 'string'}, 'count': {'type': 'integer'}, 'density': {'type': 'number'}, 'in_title': {'type': 'boolean'}, 'in_headings': {'type': 'boolean'}}}},
                    'bigrams': {'type': 'array', 'items': {'type': 'object', 'properties': {'phrase': {'type': 'string'}, 'count': {'type': 'integer'}, 'density': {'type': 'number'}}}},
                    'stop_words_removed': {'type': 'integer'},
                    'density_rating': {'type': 'string', 'enum': ['optimal', 'over_stuffed', 'under_optimized', 'thin']},
                }
            },
            'KeywordOptimizeData': {
                'type': 'object', 'required': ['target_keywords', 'recommendations'],
                'properties': {
                    'target_keywords': {'type': 'array', 'items': {'type': 'string'}},
                    'recommendations': {'type': 'array', 'items': {'type': 'object', 'required': ['keyword', 'current_density', 'target_density', 'action'], 'properties': {'keyword': {'type': 'string'}, 'current_density': {'type': 'number'}, 'target_density': {'type': 'number'}, 'action': {'type': 'string', 'enum': ['increase', 'decrease', 'maintain']}, 'suggested_additions': {'type': 'integer'}}}},
                    'ideal_density_range': {'type': 'object', 'properties': {'min': {'type': 'number'}, 'max': {'type': 'number'}}},
                }
            },
            'KeywordCompareData': {
                'type': 'object', 'required': ['gap_analysis'],
                'properties': {
                    'url1': {'type': 'string'},
                    'url2': {'type': 'string'},
                    'gap_analysis': {'type': 'array', 'items': {'type': 'object', 'properties': {'keyword': {'type': 'string'}, 'url1_density': {'type': 'number'}, 'url2_density': {'type': 'number'}, 'opportunity': {'type': 'string', 'enum': ['url1_advantage', 'url2_advantage', 'parity']}}}},
                    'unique_to_url1': {'type': 'array', 'items': {'type': 'string'}},
                    'unique_to_url2': {'type': 'array', 'items': {'type': 'string'}},
                }
            },
            'KeywordIntelligenceData': {
                'type': 'object', 'required': ['density_rating'],
                'properties': {
                    'density_rating': {'type': 'string', 'enum': ['optimal', 'over_stuffed', 'under_optimized', 'thin']},
                    'analysis': {'$ref': '#/components/schemas/KeywordAnalyzeData'},
                    'optimization': {'$ref': '#/components/schemas/KeywordOptimizeData'},
                    'seo_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                }
            },
        },
        'endpoint_map': {'analyze': 'KeywordAnalyzeData', 'optimize': 'KeywordOptimizeData', 'compare': 'KeywordCompareData', 'keyword-intelligence': 'KeywordIntelligenceData'},
    },

    'serp-snippet-preview': {
        'schemas': {
            'SERPPreviewData': {
                'type': 'object', 'required': ['url', 'title_display', 'description_display'],
                'properties': {
                    'url': {'type': 'string'},
                    'title_display': {'type': 'string'},
                    'title_char_count': {'type': 'integer'},
                    'title_truncated': {'type': 'boolean'},
                    'description_display': {'type': 'string'},
                    'description_char_count': {'type': 'integer'},
                    'description_truncated': {'type': 'boolean'},
                    'breadcrumb': {'type': 'string'},
                    'rich_snippet_eligible': {'type': 'boolean'},
                    'rich_snippet_types': {'type': 'array', 'items': {'type': 'string', 'enum': ['faq', 'how_to', 'review', 'product', 'event', 'recipe', 'article']}},
                }
            },
            'SERPOptimizeData': {
                'type': 'object', 'required': ['url', 'optimized_title', 'optimized_description'],
                'properties': {
                    'url': {'type': 'string'},
                    'optimized_title': {'type': 'string'},
                    'optimized_description': {'type': 'string'},
                    'title_changes': {'type': 'array', 'items': {'type': 'string'}},
                    'description_changes': {'type': 'array', 'items': {'type': 'string'}},
                    'ctr_lift_estimate': {'type': 'number'},
                    'power_words_added': {'type': 'array', 'items': {'type': 'string'}},
                }
            },
            'SERPScoreData': {
                'type': 'object', 'required': ['url', 'ctr_score', 'appeal_score'],
                'properties': {
                    'url': {'type': 'string'},
                    'ctr_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'appeal_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'title_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'description_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'issues': {'type': 'array', 'items': issue_item()},
                    'overall_grade': {'type': 'string', 'enum': ['A+', 'A', 'B', 'C', 'D', 'F']},
                }
            },
            'SERPIntelligenceData': {
                'type': 'object', 'required': ['url', 'ctr_score'],
                'properties': {
                    'url': {'type': 'string'},
                    'ctr_score': {'type': 'number'},
                    'preview': {'$ref': '#/components/schemas/SERPPreviewData'},
                    'optimization': {'$ref': '#/components/schemas/SERPOptimizeData'},
                    'score_detail': {'$ref': '#/components/schemas/SERPScoreData'},
                }
            },
        },
        'endpoint_map': {'preview': 'SERPPreviewData', 'optimize': 'SERPOptimizeData', 'score': 'SERPScoreData', 'serp-intelligence': 'SERPIntelligenceData'},
    },

    'slug-generator': {
        'schemas': {
            'SlugGenerateData': {
                'type': 'object', 'required': ['input', 'slug'],
                'properties': {
                    'input': {'type': 'string'}, 'slug': {'type': 'string'},
                    'slug_length': {'type': 'integer'},
                    'url_safe': {'type': 'boolean'},
                    'locale': {'type': 'string'},
                    'alternatives': {'type': 'array', 'items': {'type': 'string'}},
                    'stop_words_removed': {'type': 'array', 'items': {'type': 'string'}},
                }
            },
            'SlugValidateData': {
                'type': 'object', 'required': ['slug', 'is_valid'],
                'properties': {
                    'slug': {'type': 'string'},
                    'is_valid': {'type': 'boolean'},
                    'issues': {'type': 'array', 'items': {'type': 'object', 'properties': {'type': {'type': 'string', 'enum': ['invalid_chars', 'too_long', 'too_short', 'reserved_word', 'starts_with_number']}, 'message': {'type': 'string'}}}},
                    'cleaned_slug': {'type': 'string'},
                    'seo_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                }
            },
            'SlugBatchData': {
                'type': 'object', 'required': ['results'],
                'properties': {
                    'results': {'type': 'array', 'items': {'type': 'object', 'required': ['input', 'slug'], 'properties': {'input': {'type': 'string'}, 'slug': {'type': 'string'}, 'url_safe': {'type': 'boolean'}}}},
                    'total': {'type': 'integer'},
                }
            },
            'SlugIntelligenceData': {
                'type': 'object', 'required': ['input', 'slug', 'seo_score'],
                'properties': {
                    'input': {'type': 'string'}, 'slug': {'type': 'string'},
                    'seo_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'alternatives': {'type': 'array', 'items': {'type': 'string'}},
                    'validation': {'$ref': '#/components/schemas/SlugValidateData'},
                    'character_count': {'type': 'integer'},
                    'keyword_rich': {'type': 'boolean'},
                }
            },
        },
        'endpoint_map': {'generate': 'SlugGenerateData', 'validate': 'SlugValidateData', 'batch': 'SlugBatchData', 'slug-intelligence': 'SlugIntelligenceData'},
    },

    'text-readability-score': {
        'schemas': {
            'ReadabilityScoreData': {
                'type': 'object', 'required': ['word_count', 'reading_level'],
                'properties': {
                    'word_count': {'type': 'integer'},
                    'sentence_count': {'type': 'integer'},
                    'avg_sentence_length': {'type': 'number'},
                    'avg_syllables_per_word': {'type': 'number'},
                    'flesch_reading_ease': {'type': 'number'},
                    'flesch_kincaid_grade': {'type': 'number'},
                    'gunning_fog': {'type': 'number'},
                    'smog_index': {'type': 'number'},
                    'coleman_liau': {'type': 'number'},
                    'reading_level': {'type': 'string', 'enum': ['elementary', 'middle_school', 'high_school', 'college', 'graduate', 'professional']},
                    'estimated_read_time_minutes': {'type': 'number'},
                }
            },
            'ReadabilityAnalyzeData': {
                'type': 'object', 'required': ['complex_sentence_count'],
                'properties': {
                    'complex_sentence_count': {'type': 'integer'},
                    'complex_sentences': {'type': 'array', 'items': {'type': 'object', 'properties': {'text': {'type': 'string'}, 'word_count': {'type': 'integer'}, 'syllables': {'type': 'integer'}}}},
                    'complex_words': {'type': 'array', 'items': {'type': 'object', 'properties': {'word': {'type': 'string'}, 'syllables': {'type': 'integer'}, 'simpler_alternative': {'type': 'string'}}}},
                    'passive_voice_sentences': {'type': 'integer'},
                    'adverb_count': {'type': 'integer'},
                }
            },
            'ReadabilitySimplifyData': {
                'type': 'object', 'required': ['suggestions'],
                'properties': {
                    'suggestions': {'type': 'array', 'items': {'type': 'object', 'required': ['original', 'simplified'], 'properties': {'original': {'type': 'string'}, 'simplified': {'type': 'string'}, 'grade_reduction': {'type': 'number'}}}},
                    'estimated_grade_reduction': {'type': 'number'},
                    'target_reading_level': {'type': 'string'},
                }
            },
            'ReadabilityIntelligenceData': {
                'type': 'object', 'required': ['reading_level', 'flesch_reading_ease'],
                'properties': {
                    'reading_level': {'type': 'string', 'enum': ['elementary', 'middle_school', 'high_school', 'college', 'graduate', 'professional']},
                    'flesch_reading_ease': {'type': 'number'},
                    'scores': {'$ref': '#/components/schemas/ReadabilityScoreData'},
                    'analysis': {'$ref': '#/components/schemas/ReadabilityAnalyzeData'},
                    'top_simplifications': {'$ref': '#/components/schemas/ReadabilitySimplifyData'},
                    'audience_fit': {'type': 'string'},
                }
            },
        },
        'endpoint_map': {'score': 'ReadabilityScoreData', 'analyze': 'ReadabilityAnalyzeData', 'simplify': 'ReadabilitySimplifyData', 'readability-intelligence': 'ReadabilityIntelligenceData'},
    },

    'grammar-check-lite': {
        'schemas': {
            'GrammarCheckData': {
                'type': 'object', 'required': ['error_count', 'errors'],
                'properties': {
                    'word_count': {'type': 'integer'},
                    'error_count': {'type': 'integer'},
                    'errors': {'type': 'array', 'items': {'type': 'object', 'required': ['type', 'message', 'offset'], 'properties': {'type': {'type': 'string', 'enum': ['grammar', 'spelling', 'punctuation', 'style', 'word_choice']}, 'message': {'type': 'string'}, 'offset': {'type': 'integer'}, 'length': {'type': 'integer'}, 'context': {'type': 'string'}, 'replacements': {'type': 'array', 'items': {'type': 'string'}}}}},
                    'error_types': {'type': 'object', 'properties': {'grammar': {'type': 'integer'}, 'spelling': {'type': 'integer'}, 'punctuation': {'type': 'integer'}, 'style': {'type': 'integer'}}},
                }
            },
            'GrammarFixData': {
                'type': 'object', 'required': ['original', 'corrected', 'change_count'],
                'properties': {
                    'original': {'type': 'string'}, 'corrected': {'type': 'string'},
                    'change_count': {'type': 'integer'},
                    'changes': {'type': 'array', 'items': {'type': 'object', 'properties': {'original_fragment': {'type': 'string'}, 'corrected_fragment': {'type': 'string'}, 'type': {'type': 'string'}}}},
                }
            },
            'GrammarAnalyzeData': {
                'type': 'object', 'required': ['style_score', 'tone'],
                'properties': {
                    'style_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'tone': {'type': 'string', 'enum': ['formal', 'professional', 'neutral', 'casual', 'informal']},
                    'sentence_variety': {'type': 'string', 'enum': ['high', 'medium', 'low']},
                    'passive_voice_percent': {'type': 'number'},
                    'avg_sentence_length': {'type': 'number'},
                    'writing_quality': {'type': 'string', 'enum': ['excellent', 'good', 'fair', 'poor']},
                }
            },
            'GrammarIntelligenceData': {
                'type': 'object', 'required': ['error_count', 'writing_quality'],
                'properties': {
                    'error_count': {'type': 'integer'},
                    'writing_quality': {'type': 'string', 'enum': ['excellent', 'good', 'fair', 'poor']},
                    'style_score': {'type': 'number'},
                    'check': {'$ref': '#/components/schemas/GrammarCheckData'},
                    'fix': {'$ref': '#/components/schemas/GrammarFixData'},
                    'style': {'$ref': '#/components/schemas/GrammarAnalyzeData'},
                }
            },
        },
        'endpoint_map': {'check': 'GrammarCheckData', 'fix': 'GrammarFixData', 'analyze': 'GrammarAnalyzeData', 'grammar-intelligence': 'GrammarIntelligenceData'},
    },

    'emoji-sentiment': {
        'schemas': {
            'EmojiAnalyzeData': {
                'type': 'object', 'required': ['overall_sentiment', 'emotional_tone'],
                'properties': {
                    'text_length': {'type': 'integer'},
                    'emojis_found': {'type': 'array', 'items': {'type': 'object', 'properties': {'emoji': {'type': 'string'}, 'unicode': {'type': 'string'}, 'name': {'type': 'string'}, 'sentiment': {'type': 'string', 'enum': ['positive', 'negative', 'neutral']}, 'valence': {'type': 'number', 'minimum': -1, 'maximum': 1}, 'count': {'type': 'integer'}}}},
                    'overall_sentiment': {'type': 'string', 'enum': ['positive', 'negative', 'neutral', 'mixed']},
                    'emotional_tone': {'type': 'string', 'enum': ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'neutral']},
                    'emoji_density': {'type': 'number'},
                    'sentiment_score': {'type': 'number', 'minimum': -1, 'maximum': 1},
                }
            },
            'EmojiSuggestData': {
                'type': 'object', 'required': ['topic', 'suggested_emojis'],
                'properties': {
                    'topic': {'type': 'string'},
                    'suggested_emojis': {'type': 'array', 'items': {'type': 'object', 'required': ['emoji'], 'properties': {'emoji': {'type': 'string'}, 'name': {'type': 'string'}, 'relevance_score': {'type': 'number'}, 'context': {'type': 'string'}, 'platform_support': {'type': 'string', 'enum': ['universal', 'modern_only', 'limited']}}}},
                    'emotional_context': {'type': 'string'},
                    'usage_recommendations': {'type': 'array', 'items': {'type': 'string'}},
                }
            },
            'EmojiDecodeData': {
                'type': 'object', 'required': ['emoji', 'meaning', 'sentiment_valence'],
                'properties': {
                    'emoji': {'type': 'string'},
                    'unicode': {'type': 'string'},
                    'official_name': {'type': 'string'},
                    'meaning': {'type': 'string'},
                    'sentiment_valence': {'type': 'number', 'minimum': -1, 'maximum': 1},
                    'emotional_category': {'type': 'string', 'enum': ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'neutral', 'love', 'humor']},
                    'usage_context': {'type': 'array', 'items': {'type': 'string'}},
                    'cultural_notes': {'type': 'string'},
                    'platform_variations': {'type': 'object', 'additionalProperties': {'type': 'string'}},
                }
            },
            'EmojiIntelligenceData': {
                'type': 'object', 'required': ['overall_sentiment'],
                'properties': {
                    'overall_sentiment': {'type': 'string', 'enum': ['positive', 'negative', 'neutral', 'mixed']},
                    'sentiment_score': {'type': 'number'},
                    'analysis': {'$ref': '#/components/schemas/EmojiAnalyzeData'},
                    'suggestions': {'$ref': '#/components/schemas/EmojiSuggestData'},
                    'emotional_profile': {'type': 'object', 'additionalProperties': {'type': 'number'}},
                }
            },
        },
        'endpoint_map': {'analyze': 'EmojiAnalyzeData', 'suggest': 'EmojiSuggestData', 'decode': 'EmojiDecodeData', 'emoji-intelligence': 'EmojiIntelligenceData'},
    },

    'hashtag-generator': {
        'schemas': {
            'HashtagGenerateData': {
                'type': 'object', 'required': ['topic', 'hashtags'],
                'properties': {
                    'topic': {'type': 'string'},
                    'hashtags': {'type': 'array', 'items': {'type': 'object', 'required': ['hashtag', 'category'], 'properties': {'hashtag': {'type': 'string'}, 'category': {'type': 'string', 'enum': ['primary', 'secondary', 'niche', 'trending', 'broad']}, 'estimated_reach': {'type': 'string'}, 'competition_level': {'type': 'string', 'enum': ['high', 'medium', 'low']}, 'relevance_score': {'type': 'number'}}}},
                    'recommended_count': {'type': 'integer'},
                    'platform_recommendation': {'type': 'object', 'additionalProperties': {'type': 'array', 'items': {'type': 'string'}}},
                }
            },
            'HashtagAnalyzeData': {
                'type': 'object', 'required': ['hashtag'],
                'properties': {
                    'hashtag': {'type': 'string'},
                    'estimated_reach': {'type': 'string'},
                    'post_count': {'type': 'string'},
                    'competition_level': {'type': 'string', 'enum': ['high', 'medium', 'low']},
                    'trending_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'peak_usage_time': {'type': 'string'},
                    'related_hashtags': {'type': 'array', 'items': {'type': 'string'}},
                }
            },
            'HashtagTrendingData': {
                'type': 'object', 'required': ['trending_hashtags'],
                'properties': {
                    'category': {'type': 'string'},
                    'trending_hashtags': {'type': 'array', 'items': {'type': 'object', 'required': ['hashtag', 'momentum'], 'properties': {'hashtag': {'type': 'string'}, 'momentum': {'type': 'string', 'enum': ['rising', 'stable', 'declining']}, 'post_count': {'type': 'string'}, 'peak_hour': {'type': 'string'}}}},
                    'updated_at': {'type': 'string', 'format': 'date-time'},
                }
            },
            'HashtagIntelligenceData': {
                'type': 'object', 'required': ['topic', 'strategy'],
                'properties': {
                    'topic': {'type': 'string'},
                    'strategy': {'type': 'string', 'enum': ['broad_reach', 'niche_targeting', 'trending_boost', 'balanced']},
                    'generated': {'$ref': '#/components/schemas/HashtagGenerateData'},
                    'trending_overlap': {'type': 'array', 'items': {'type': 'string'}},
                    'estimated_reach_multiplier': {'type': 'number'},
                    'optimal_count': {'type': 'integer'},
                }
            },
        },
        'endpoint_map': {'generate': 'HashtagGenerateData', 'analyze': 'HashtagAnalyzeData', 'trending': 'HashtagTrendingData', 'hashtag-intelligence': 'HashtagIntelligenceData'},
    },

    'caption-generator': {
        'schemas': {
            'CaptionGenerateData': {
                'type': 'object', 'required': ['topic', 'captions'],
                'properties': {
                    'topic': {'type': 'string'},
                    'captions': {'type': 'array', 'items': {'type': 'object', 'required': ['text', 'platform', 'tone'], 'properties': {'text': {'type': 'string'}, 'platform': {'type': 'string', 'enum': ['instagram', 'linkedin', 'twitter', 'tiktok', 'facebook', 'generic']}, 'tone': {'type': 'string', 'enum': ['professional', 'casual', 'humorous', 'inspirational', 'educational']}, 'char_count': {'type': 'integer'}, 'includes_cta': {'type': 'boolean'}, 'engagement_score': {'type': 'number'}}}},
                    'recommended_caption_index': {'type': 'integer'},
                }
            },
            'CaptionOptimizeData': {
                'type': 'object', 'required': ['original', 'optimized'],
                'properties': {
                    'original': {'type': 'string'}, 'optimized': {'type': 'string'},
                    'changes': {'type': 'array', 'items': {'type': 'object', 'properties': {'type': {'type': 'string'}, 'description': {'type': 'string'}}}},
                    'engagement_lift_estimate': {'type': 'number'},
                    'cta_added': {'type': 'boolean'},
                    'emoji_enhanced': {'type': 'boolean'},
                }
            },
            'CaptionBatchData': {
                'type': 'object', 'required': ['results'],
                'properties': {
                    'results': {'type': 'array', 'items': {'type': 'object', 'properties': {'topic': {'type': 'string'}, 'caption': {'type': 'string'}, 'platform': {'type': 'string'}, 'error': {'type': 'string', 'nullable': True}}}},
                    'total': {'type': 'integer'},
                }
            },
            'CaptionIntelligenceData': {
                'type': 'object', 'required': ['topic', 'top_caption'],
                'properties': {
                    'topic': {'type': 'string'},
                    'top_caption': {'type': 'string'},
                    'platform_variants': {'type': 'object', 'additionalProperties': {'type': 'string'}},
                    'hashtags': {'type': 'array', 'items': {'type': 'string'}},
                    'ctas': {'type': 'array', 'items': {'type': 'string'}},
                    'engagement_score': {'type': 'number'},
                    'best_posting_time': {'type': 'string'},
                }
            },
        },
        'endpoint_map': {'generate': 'CaptionGenerateData', 'optimize': 'CaptionOptimizeData', 'batch': 'CaptionBatchData', 'caption-intelligence': 'CaptionIntelligenceData'},
    },

    'cta-generator': {
        'schemas': {
            'CTAGenerateData': {
                'type': 'object', 'required': ['use_case', 'ctas'],
                'properties': {
                    'use_case': {'type': 'string'},
                    'ctas': {'type': 'array', 'items': {'type': 'object', 'required': ['text', 'type'], 'properties': {'text': {'type': 'string'}, 'type': {'type': 'string', 'enum': ['button', 'headline', 'link', 'banner', 'email']}, 'placement': {'type': 'string', 'enum': ['above_fold', 'inline', 'footer', 'popup', 'email']}, 'urgency_level': {'type': 'string', 'enum': ['high', 'medium', 'low']}, 'conversion_score': {'type': 'number'}}}},
                    'recommended_cta_index': {'type': 'integer'},
                    'goal': {'type': 'string'},
                }
            },
            'CTAScoreData': {
                'type': 'object', 'required': ['cta', 'conversion_score'],
                'properties': {
                    'cta': {'type': 'string'},
                    'conversion_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'urgency_level': {'type': 'string', 'enum': ['high', 'medium', 'low']},
                    'clarity_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'specificity_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'issues': {'type': 'array', 'items': issue_item()},
                    'power_words_used': {'type': 'array', 'items': {'type': 'string'}},
                    'missing_elements': {'type': 'array', 'items': {'type': 'string'}},
                }
            },
            'CTAVariantsData': {
                'type': 'object', 'required': ['original_cta', 'variants'],
                'properties': {
                    'original_cta': {'type': 'string'},
                    'variants': {'type': 'array', 'items': {'type': 'object', 'required': ['text', 'hypothesis'], 'properties': {'text': {'type': 'string'}, 'hypothesis': {'type': 'string'}, 'variable_changed': {'type': 'string', 'enum': ['urgency', 'specificity', 'benefit', 'action_verb', 'length', 'personalization']}, 'predicted_lift': {'type': 'string'}}}},
                    'test_hypothesis': {'type': 'string'},
                    'recommended_winner': {'type': 'integer'},
                }
            },
            'CTAIntelligenceData': {
                'type': 'object', 'required': ['use_case', 'top_cta', 'conversion_score'],
                'properties': {
                    'use_case': {'type': 'string'},
                    'top_cta': {'type': 'string'},
                    'conversion_score': {'type': 'number'},
                    'cta_options': {'$ref': '#/components/schemas/CTAGenerateData'},
                    'score_detail': {'$ref': '#/components/schemas/CTAScoreData'},
                    'ab_variants': {'$ref': '#/components/schemas/CTAVariantsData'},
                }
            },
        },
        'endpoint_map': {'generate': 'CTAGenerateData', 'score': 'CTAScoreData', 'ab-variants': 'CTAVariantsData', 'cta-intelligence': 'CTAIntelligenceData'},
    },

    'subject-line-scorer': {
        'schemas': {
            'SubjectScoreData': {
                'type': 'object', 'required': ['subject', 'open_rate_score'],
                'properties': {
                    'subject': {'type': 'string'},
                    'open_rate_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'spam_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'sentiment': {'type': 'string', 'enum': ['positive', 'negative', 'neutral', 'urgent']},
                    'urgency_level': {'type': 'string', 'enum': ['high', 'medium', 'low', 'none']},
                    'personalization_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'length_score': {'type': 'number', 'minimum': 0, 'maximum': 100},
                    'word_count': {'type': 'integer'},
                    'char_count': {'type': 'integer'},
                    'spam_triggers': {'type': 'array', 'items': {'type': 'string'}},
                    'power_words': {'type': 'array', 'items': {'type': 'string'}},
                    'emoji_used': {'type': 'boolean'},
                    'overall_grade': {'type': 'string', 'enum': ['A+', 'A', 'B', 'C', 'D', 'F']},
                }
            },
            'SubjectOptimizeData': {
                'type': 'object', 'required': ['original', 'optimized'],
                'properties': {
                    'original': {'type': 'string'}, 'optimized': {'type': 'string'},
                    'score_improvement': {'type': 'number'},
                    'changes': {'type': 'array', 'items': {'type': 'object', 'properties': {'type': {'type': 'string', 'enum': ['added_urgency', 'removed_spam_trigger', 'added_personalization', 'shortened', 'added_emoji', 'reworded']}, 'description': {'type': 'string'}}}},
                    'spam_triggers_removed': {'type': 'array', 'items': {'type': 'string'}},
                    'power_words_added': {'type': 'array', 'items': {'type': 'string'}},
                }
            },
            'SubjectGenerateData': {
                'type': 'object', 'required': ['topic', 'subject_lines'],
                'properties': {
                    'topic': {'type': 'string'},
                    'subject_lines': {'type': 'array', 'items': {'type': 'object', 'required': ['text', 'open_rate_score'], 'properties': {'text': {'type': 'string'}, 'open_rate_score': {'type': 'number'}, 'tone': {'type': 'string', 'enum': ['curious', 'urgent', 'benefit_driven', 'personalized', 'direct', 'question']}, 'spam_score': {'type': 'number'}}}},
                    'recommended_index': {'type': 'integer'},
                }
            },
            'SubjectIntelligenceData': {
                'type': 'object', 'required': ['subject', 'open_rate_score', 'overall_grade'],
                'properties': {
                    'subject': {'type': 'string'},
                    'open_rate_score': {'type': 'number'},
                    'overall_grade': {'type': 'string', 'enum': ['A+', 'A', 'B', 'C', 'D', 'F']},
                    'score_detail': {'$ref': '#/components/schemas/SubjectScoreData'},
                    'optimized': {'$ref': '#/components/schemas/SubjectOptimizeData'},
                    'alternatives': {'$ref': '#/components/schemas/SubjectGenerateData'},
                    'spam_risk': {'type': 'string', 'enum': ['high', 'medium', 'low', 'safe']},
                }
            },
        },
        'endpoint_map': {'score': 'SubjectScoreData', 'optimize': 'SubjectOptimizeData', 'generate': 'SubjectGenerateData', 'subject-intelligence': 'SubjectIntelligenceData'},
    },
}

# ── Metadata for each API (needed for info/pricing blocks) ─────────────────────
API_META = {
    'meta-tags-extractor': {'name': 'Meta Tags Extractor API', 'desc': 'Extract, validate, and analyze HTML meta tags including title, description, keywords, Open Graph, Twitter Card, and canonical tags from any URL.', 'pricing': {'extract': '$0.002', 'validate': '$0.002', 'batch': '$0.015', 'execution-gate': '$0.001', 'meta-intelligence': '$0.006'}, 'free': 500, 'chain_next': 'open-graph-preview'},
    'open-graph-preview': {'name': 'Open Graph Preview API', 'desc': 'Preview, validate, and optimize Open Graph and Twitter Card tags to maximize click-through rates on social media shares.', 'pricing': {'preview': '$0.003', 'validate': '$0.002', 'generate': '$0.004', 'execution-gate': '$0.001', 'og-intelligence': '$0.008'}, 'free': 300, 'chain_next': 'app-store-lookup'},
    'app-store-lookup': {'name': 'App Store Lookup API', 'desc': 'Look up iOS and Android app metadata, ratings, reviews, and competitor analysis.', 'pricing': {'lookup': '$0.003', 'reviews': '$0.005', 'similar': '$0.004', 'execution-gate': '$0.001', 'app-intelligence': '$0.010'}, 'free': 200, 'chain_next': 'chrome-extension-lookup'},
    'chrome-extension-lookup': {'name': 'Chrome Extension Lookup API', 'desc': 'Retrieve Chrome Web Store extension metadata, permissions, and security analysis.', 'pricing': {'lookup': '$0.002', 'analyze': '$0.004', 'similar': '$0.003', 'execution-gate': '$0.001', 'extension-intelligence': '$0.008'}, 'free': 300, 'chain_next': 'browser-compatibility'},
    'browser-compatibility': {'name': 'Browser Compatibility API', 'desc': 'Check CSS, JavaScript, and HTML feature compatibility across browsers. Get polyfill recommendations.', 'pricing': {'check': '$0.001', 'polyfills': '$0.003', 'report': '$0.005', 'execution-gate': '$0.001', 'compat-intelligence': '$0.006'}, 'free': 1000, 'chain_next': 'dns-propagation'},
    'dns-propagation': {'name': 'DNS Propagation API', 'desc': 'Check DNS propagation status across global nameservers and track record update completion.', 'pricing': {'check': '$0.002', 'status': '$0.002', 'trace': '$0.003', 'execution-gate': '$0.001', 'propagation-intelligence': '$0.006'}, 'free': 500, 'chain_next': 'ssl-expiry-monitor'},
    'ssl-expiry-monitor': {'name': 'SSL Expiry Monitor API', 'desc': 'Monitor SSL certificate expiry, get renewal alerts, and track certificate health across domains.', 'pricing': {'check': '$0.001', 'monitor': '$0.005', 'alert': '$0.003', 'execution-gate': '$0.001', 'ssl-expiry-intelligence': '$0.005'}, 'free': 500, 'chain_next': 'tls-configuration'},
    'tls-configuration': {'name': 'TLS Configuration API', 'desc': 'Analyze TLS/SSL configuration for cipher suites, protocol versions, vulnerabilities, and compliance.', 'pricing': {'analyze': '$0.003', 'grade': '$0.003', 'recommendations': '$0.004', 'execution-gate': '$0.001', 'tls-intelligence': '$0.008'}, 'free': 300, 'chain_next': 'website-carbon-footprint'},
    'website-carbon-footprint': {'name': 'Website Carbon Footprint API', 'desc': 'Estimate the carbon footprint of any webpage and get optimization recommendations.', 'pricing': {'estimate': '$0.002', 'benchmark': '$0.003', 'optimize': '$0.004', 'execution-gate': '$0.001', 'carbon-intelligence': '$0.007'}, 'free': 300, 'chain_next': 'accessibility-audit-lite'},
    'accessibility-audit-lite': {'name': 'Accessibility Audit Lite API', 'desc': 'Run WCAG 2.1 accessibility checks on any URL. Identify issues, score compliance, and get fix suggestions.', 'pricing': {'audit': '$0.005', 'score': '$0.002', 'fix-suggestions': '$0.004', 'execution-gate': '$0.001', 'accessibility-intelligence': '$0.010'}, 'free': 200, 'chain_next': 'keyword-density'},
    'keyword-density': {'name': 'Keyword Density API', 'desc': 'Analyze keyword frequency, density, and distribution in text or web pages with SEO recommendations.', 'pricing': {'analyze': '$0.002', 'optimize': '$0.003', 'compare': '$0.005', 'execution-gate': '$0.001', 'keyword-intelligence': '$0.007'}, 'free': 500, 'chain_next': 'serp-snippet-preview'},
    'serp-snippet-preview': {'name': 'SERP Snippet Preview API', 'desc': 'Preview and optimize how a URL appears in Google search results with CTR scoring.', 'pricing': {'preview': '$0.002', 'optimize': '$0.004', 'score': '$0.002', 'execution-gate': '$0.001', 'serp-intelligence': '$0.007'}, 'free': 500, 'chain_next': 'slug-generator'},
    'slug-generator': {'name': 'Slug Generator API', 'desc': 'Generate SEO-friendly URL slugs from titles. Handle transliteration, stop words, and batch generation.', 'pricing': {'generate': '$0.001', 'validate': '$0.001', 'batch': '$0.005', 'execution-gate': '$0.001', 'slug-intelligence': '$0.003'}, 'free': 2000, 'chain_next': 'text-readability-score'},
    'text-readability-score': {'name': 'Text Readability Score API', 'desc': 'Score text readability with Flesch-Kincaid, Gunning Fog, SMOG, and Coleman-Liau indices.', 'pricing': {'score': '$0.001', 'analyze': '$0.003', 'simplify': '$0.004', 'execution-gate': '$0.001', 'readability-intelligence': '$0.006'}, 'free': 1000, 'chain_next': 'grammar-check-lite'},
    'grammar-check-lite': {'name': 'Grammar Check Lite API', 'desc': 'Lightweight grammar, spelling, and style checking for text with error scoring.', 'pricing': {'check': '$0.002', 'fix': '$0.003', 'analyze': '$0.003', 'execution-gate': '$0.001', 'grammar-intelligence': '$0.007'}, 'free': 500, 'chain_next': 'emoji-sentiment'},
    'emoji-sentiment': {'name': 'Emoji Sentiment API', 'desc': 'Analyze emotional sentiment of emoji usage, decode meanings, and suggest contextually appropriate emojis.', 'pricing': {'analyze': '$0.002', 'suggest': '$0.002', 'decode': '$0.001', 'execution-gate': '$0.001', 'emoji-intelligence': '$0.005'}, 'free': 1000, 'chain_next': 'hashtag-generator'},
    'hashtag-generator': {'name': 'Hashtag Generator API', 'desc': 'Generate high-performing hashtags, analyze trending hashtags, and estimate reach for social media.', 'pricing': {'generate': '$0.002', 'analyze': '$0.003', 'trending': '$0.003', 'execution-gate': '$0.001', 'hashtag-intelligence': '$0.007'}, 'free': 500, 'chain_next': 'caption-generator'},
    'caption-generator': {'name': 'Caption Generator API', 'desc': 'Generate engaging social media captions optimized for Instagram, LinkedIn, Twitter, and TikTok.', 'pricing': {'generate': '$0.003', 'optimize': '$0.003', 'batch': '$0.020', 'execution-gate': '$0.001', 'caption-intelligence': '$0.008'}, 'free': 300, 'chain_next': 'cta-generator'},
    'cta-generator': {'name': 'CTA Generator API', 'desc': 'Generate high-converting call-to-action copy, score CTAs, and generate A/B test variants.', 'pricing': {'generate': '$0.003', 'score': '$0.002', 'ab-variants': '$0.005', 'execution-gate': '$0.001', 'cta-intelligence': '$0.008'}, 'free': 300, 'chain_next': 'subject-line-scorer'},
    'subject-line-scorer': {'name': 'Subject Line Scorer API', 'desc': 'Score email subject lines for open rate potential with spam detection and optimization.', 'pricing': {'score': '$0.001', 'optimize': '$0.003', 'generate': '$0.003', 'execution-gate': '$0.001', 'subject-intelligence': '$0.006'}, 'free': 500, 'chain_next': None},
}

# ── Generators ─────────────────────────────────────────────────────────────────

def to_js(obj, indent=0):
    """Convert Python dict/list to compact JS object literal string."""
    return json.dumps(obj, separators=(', ', ': ')).replace('"', "'")

def generate_openapi_ts(slug):
    api = APIS[slug]
    meta = API_META[slug]
    schemas = api['schemas']
    ep_map = api['endpoint_map']

    all_schemas = {**SHARED, **schemas}

    # Build paths dict
    paths = {}
    for ep_slug, schema_name in ep_map.items():
        if ep_slug == list(ep_map.keys())[-1]:  # last = one-call
            summary = f"ONE-CALL: full {meta['name'].replace(' API', '')} intelligence"
            xoc = True
        elif 'intelligence' in ep_slug:
            summary = f"ONE-CALL: full {meta['name'].replace(' API', '')} intelligence"
            xoc = True
        else:
            xoc = False
            summary = f"{ep_slug.replace('-', ' ').title()} — {schema_name}"

        # request body: execution-gate has different required field
        if ep_slug == 'execution-gate':
            req_schema = {'type': 'object', 'required': ['input'], 'properties': {'input': {'type': 'string'}, 'objective': {'type': 'string'}}}
            resp_schema = gate_env()
        else:
            req_schema = {'type': 'object', 'required': ['input'], 'properties': {'input': {'type': 'string'}, 'options': {'type': 'object'}}}
            resp_schema = env(schema_name)

        path_obj = {'post': {
            'operationId': ep_slug.replace('-', '_'),
            'summary': summary,
            'requestBody': {'required': True, 'content': {'application/json': {'schema': req_schema}}},
            'responses': {
                '200': {'description': summary, 'content': {'application/json': {'schema': resp_schema}}},
                '400': {'description': 'Bad request', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Error'}}}},
                '401': {'description': 'Unauthorized', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Error'}}}},
                '429': {'description': 'Rate limit exceeded', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Error'}}}},
                '500': {'description': 'Server error', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Error'}}}},
            }
        }}
        if xoc:
            path_obj['post']['x-one-call'] = True
        paths[f'/{ep_slug}'] = path_obj

    spec = {
        'openapi': '3.1.0',
        'info': {
            'title': meta['name'],
            'version': '2.0.0',
            'description': meta['desc'],
            'x-agent-callable': True,
            'x-mcp-compatible': True,
            'x-pricing': {'free_tier': {'requests_per_day': meta['free']}, 'pay_per_call': meta['pricing']},
        },
        'servers': [{'url': f'https://orbis-apis.onrender.com/{slug}'}],
        'security': [{'ApiKeyAuth': []}],
        'paths': paths,
        'components': {
            'securitySchemes': {'ApiKeyAuth': {'type': 'apiKey', 'in': 'header', 'name': 'X-API-Key'}},
            'schemas': all_schemas,
        }
    }

    spec_json = json.dumps(spec, indent=2)

    return f"""import {{ Router, Request, Response }} from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {{
  res.json({spec_json});
}});
export default router;
"""

def generate_intelligence_ts(slug):
    api = APIS[slug]
    meta = API_META[slug]
    ep_map = api['endpoint_map']
    eps = list(ep_map.keys())
    ep1, ep2, ep3 = eps[0], eps[1], eps[2]
    one_call = eps[-1]

    name = meta['name']
    chain_next = meta['chain_next'] or 'autopilot'

    PROMPT_SUFFIX = (
        'Return ONLY a valid JSON object with these exact top-level keys — no markdown, no prose: '
        'success (boolean true), request_id (uuid v4 string), data (object with typed API-specific fields), '
        'confidence (object: score 0-1 number, reason string, per_section object), '
        'provenance (object: provider string, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), '
        'cache (object: recommended_ttl_seconds integer, retryable boolean, cache_recommended boolean), '
        'recommended_next_api (array of objects: api string, endpoint string, reason string), '
        'recommended_actions_priority_order (array of objects: priority enum high|medium|low, action string, reason string), '
        'execution_metadata (object: latency_ms integer, model string, automation_safe boolean). '
        'Use enums strictly. Return only the JSON object.'
    )

    return f"""import {{ Router, Request, Response }} from 'express';
import axios from 'axios';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string): Promise<string> {{
  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {{ model: MODEL, messages: [{{ role: 'user', content: prompt }}] }},
    {{ headers: {{ Authorization: `Bearer ${{OPENROUTER_API_KEY}}`, 'Content-Type': 'application/json' }} }}
  );
  return res.data.choices[0].message.content;
}}

function parseJSON(raw: string) {{
  try {{ return JSON.parse(raw.replace(/```json|```/g, '').trim()); }}
  catch {{ return {{ success: false, error: 'parse_error', raw: raw.slice(0, 200) }}; }}
}}

router.get('/', (_req: Request, res: Response) => {{
  res.json({{ name: '{name}', info: '/{slug}/info', openapi: '/{slug}/openapi.json', health: 'ok' }});
}});

router.post('/{ep1}', async (req: Request, res: Response) => {{
  const {{ input, options }} = req.body;
  if (!input) return res.status(400).json({{ error: 'input is required', code: 'MISSING_INPUT', retryable: false }});
  try {{
    const raw = await callClaude(`You are an expert {name} engine performing: {ep1}.
Input: "${{input}}"
Options: ${{JSON.stringify(options || {{}})}}
{PROMPT_SUFFIX}
The data object must include all typed fields relevant to {ep1} for this API. Be specific and deterministic.`);
    res.json(parseJSON(raw));
  }} catch (e: any) {{ res.status(500).json({{ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }}); }}
}});

router.post('/{ep2}', async (req: Request, res: Response) => {{
  const {{ input, options }} = req.body;
  if (!input) return res.status(400).json({{ error: 'input is required', code: 'MISSING_INPUT', retryable: false }});
  try {{
    const raw = await callClaude(`You are an expert {name} engine performing: {ep2}.
Input: "${{input}}"
Options: ${{JSON.stringify(options || {{}})}}
{PROMPT_SUFFIX}
The data object must include all typed fields relevant to {ep2} for this API. Use enums where applicable. Be specific and deterministic.`);
    res.json(parseJSON(raw));
  }} catch (e: any) {{ res.status(500).json({{ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }}); }}
}});

router.post('/{ep3}', async (req: Request, res: Response) => {{
  const {{ input, options }} = req.body;
  if (!input) return res.status(400).json({{ error: 'input is required', code: 'MISSING_INPUT', retryable: false }});
  try {{
    const raw = await callClaude(`You are an expert {name} engine performing: {ep3}.
Input: "${{input}}"
Options: ${{JSON.stringify(options || {{}})}}
{PROMPT_SUFFIX}
The data object must include all typed fields relevant to {ep3} for this API. Use enums where applicable. Be specific and deterministic.`);
    res.json(parseJSON(raw));
  }} catch (e: any) {{ res.status(500).json({{ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }}); }}
}});

router.post('/execution-gate', async (req: Request, res: Response) => {{
  const {{ input, objective }} = req.body;
  if (!input) return res.status(400).json({{ error: 'input is required', code: 'MISSING_INPUT', retryable: false }});
  const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {{ const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }});
  res.json({{
    success: true, request_id: rid(),
    execution_ready: true, input, objective: objective || '{ep1}',
    next_api: '{slug}', next_endpoint: '/{one_call}',
    blocking_flags: [],
    confidence: {{ score: 0.98, reason: 'Input present and valid', per_section: {{ execution_ready: 0.98 }} }},
    provenance: {{ provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' }},
    recommended_next_api: [{{ api: '{slug}', endpoint: '/{one_call}', reason: 'One-call endpoint for full {name} intelligence' }}, {{ api: '{chain_next}', endpoint: '/{chain_next}', reason: 'Next step in the pipeline' }}],
    recommended_actions_priority_order: [{{ priority: 'high', action: 'Call /{one_call} for full intelligence', reason: 'One-call delivers all outputs in a single request' }}],
    execution_metadata: {{ latency_ms: 1, model: 'system', automation_safe: true }},
  }});
}});

router.post('/{one_call}', async (req: Request, res: Response) => {{
  const {{ input, options }} = req.body;
  if (!input) return res.status(400).json({{ error: 'input is required', code: 'MISSING_INPUT', retryable: false }});
  try {{
    const raw = await callClaude(`You are a complete {name} intelligence engine. Perform full analysis combining {ep1}, {ep2}, and {ep3} in a single response.
Input: "${{input}}"
Options: ${{JSON.stringify(options || {{}})}}
{PROMPT_SUFFIX}
The data object MUST include: all fields from {ep1}, {ep2}, and {ep3} sub-analyses, plus an overall_score (0-100 number), key_findings (array of strings), and summary (string). Use enums where applicable. Recommended_next_api should point to relevant downstream APIs with specific reasons based on what was found.`);
    res.json(parseJSON(raw));
  }} catch (e: any) {{ res.status(500).json({{ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }}); }}
}});

export default router;
"""

# ── Write all files ────────────────────────────────────────────────────────────
for slug in APIS:
    route_dir = f'{BASE}/src/routes/{slug}-api/routes'
    os.makedirs(route_dir, exist_ok=True)

    with open(f'{route_dir}/openapi.ts', 'w') as f:
        f.write(generate_openapi_ts(slug))

    with open(f'{route_dir}/intelligence.ts', 'w') as f:
        f.write(generate_intelligence_ts(slug))

    # Root openapi.json (the one served and uploaded to marketplaces)
    api = APIS[slug]
    meta = API_META[slug]
    all_schemas = {**SHARED, **api['schemas']}
    paths = {}
    for ep_slug, schema_name in api['endpoint_map'].items():
        is_oc = ep_slug == list(api['endpoint_map'].keys())[-1]
        if ep_slug == 'execution-gate':
            resp_s = gate_env()
            req_s = {'type': 'object', 'required': ['input'], 'properties': {'input': {'type': 'string'}, 'objective': {'type': 'string'}}}
        else:
            resp_s = env(schema_name)
            req_s = {'type': 'object', 'required': ['input'], 'properties': {'input': {'type': 'string'}, 'options': {'type': 'object'}}}
        p = {'post': {'operationId': ep_slug.replace('-', '_'), 'summary': ep_slug, 'requestBody': {'required': True, 'content': {'application/json': {'schema': req_s}}}, 'responses': {'200': {'description': ep_slug, 'content': {'application/json': {'schema': resp_s}}}, '400': {'description': 'Bad request', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Error'}}}}, '500': {'description': 'Server error', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Error'}}}}}}}
        if is_oc: p['post']['x-one-call'] = True
        paths[f'/{ep_slug}'] = p

    root_spec = {'openapi': '3.1.0', 'info': {'title': meta['name'], 'version': '2.0.0', 'description': meta['desc'], 'x-agent-callable': True, 'x-mcp-compatible': True, 'x-pricing': {'free_tier': {'requests_per_day': meta['free']}, 'pay_per_call': meta['pricing']}}, 'servers': [{'url': f'https://orbis-apis.onrender.com/{slug}'}], 'security': [{'ApiKeyAuth': []}], 'paths': paths, 'components': {'securitySchemes': {'ApiKeyAuth': {'type': 'apiKey', 'in': 'header', 'name': 'X-API-Key'}}, 'schemas': all_schemas}}
    with open(f'{BASE}/{slug}-openapi.json', 'w') as f:
        json.dump(root_spec, f, indent=2)

    print(f'✅ {slug}')

print(f'\n✅ All {len(APIS)} APIs polished')
