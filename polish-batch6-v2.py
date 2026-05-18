#!/usr/bin/env python3
"""
Polish batch 6 v2: fix execution-gate disappearance, add GET / discovery,
typed request schemas, examples, and version sync across all 20 APIs.
"""
import os, json

BASE = '/workspaces/orbis-apis'

# ── Re-use canonical components from v1 ────────────────────────────────────────
SHARED = {
    'Confidence': {
        'type': 'object', 'required': ['score'],
        'properties': {
            'score': {'type': 'number', 'minimum': 0, 'maximum': 1, 'example': 0.94},
            'reason': {'type': 'string', 'example': 'Live API response'},
            'per_section': {'type': 'object', 'additionalProperties': {'type': 'number'}}
        }
    },
    'Provenance': {
        'type': 'object', 'required': ['provider', 'retrieved_at'],
        'properties': {
            'provider': {'type': 'string', 'example': 'orbis-intelligence'},
            'retrieved_at': {'type': 'string', 'format': 'date-time'},
            'source_type': {'type': 'string', 'enum': ['live_scan', 'cached', 'ai_generated', 'api_call']}
        }
    },
    'Cache': {
        'type': 'object',
        'properties': {
            'recommended_ttl_seconds': {'type': 'integer', 'example': 3600},
            'retryable': {'type': 'boolean', 'example': False},
            'cache_recommended': {'type': 'boolean', 'example': True}
        }
    },
    'NextApi': {
        'type': 'array',
        'items': {
            'type': 'object', 'required': ['api', 'reason'],
            'properties': {
                'api': {'type': 'string', 'example': 'tls-configuration'},
                'endpoint': {'type': 'string', 'example': '/analyze'},
                'reason': {'type': 'string', 'example': 'Analyze TLS after DNS is resolved'}
            }
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
            'latency_ms': {'type': 'integer', 'example': 312},
            'model': {'type': 'string', 'example': 'claude-sonnet-4-5'},
            'automation_safe': {'type': 'boolean', 'example': True}
        }
    },
    'Error': {
        'type': 'object', 'required': ['error', 'code'],
        'properties': {
            'error': {'type': 'string', 'example': 'domain is required'},
            'code': {'type': 'string', 'example': 'MISSING_INPUT'},
            'retryable': {'type': 'boolean', 'example': False},
            'details': {'type': 'string'}
        }
    },
    'DiscoveryResponse': {
        'type': 'object', 'required': ['name', 'version', 'base_url', 'endpoints'],
        'properties': {
            'name': {'type': 'string'},
            'version': {'type': 'string'},
            'description': {'type': 'string'},
            'base_url': {'type': 'string', 'format': 'uri'},
            'docs_url': {'type': 'string', 'format': 'uri'},
            'mcp_compatible': {'type': 'boolean'},
            'agent_callable': {'type': 'boolean'},
            'pricing': {'type': 'object'},
            'endpoints': {
                'type': 'array',
                'items': {
                    'type': 'object',
                    'properties': {
                        'method': {'type': 'string'},
                        'path': {'type': 'string'},
                        'summary': {'type': 'string'},
                        'price_usd': {'type': 'number'}
                    }
                }
            }
        }
    }
}

def issue_item():
    return {
        'type': 'object', 'required': ['severity', 'message'],
        'properties': {
            'field': {'type': 'string'},
            'severity': {'type': 'string', 'enum': ['critical', 'warning', 'info']},
            'message': {'type': 'string'},
            'fix': {'type': 'string'}
        }
    }

def env(data_ref):
    return {
        'type': 'object',
        'required': ['success', 'request_id', 'data', 'confidence', 'provenance'],
        'properties': {
            'success': {'type': 'boolean', 'example': True},
            'request_id': {'type': 'string', 'format': 'uuid', 'example': 'a1b2c3d4-e5f6-4789-abcd-ef1234567890'},
            'data': {'$ref': f'#/components/schemas/{data_ref}'},
            'confidence': {'$ref': '#/components/schemas/Confidence'},
            'provenance': {'$ref': '#/components/schemas/Provenance'},
            'cache': {'$ref': '#/components/schemas/Cache'},
            'recommended_next_api': {'$ref': '#/components/schemas/NextApi'},
            'recommended_actions_priority_order': {'$ref': '#/components/schemas/Recommendation'},
            'execution_metadata': {'$ref': '#/components/schemas/ExecMeta'}
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
            'recommended_next_api': {'$ref': '#/components/schemas/NextApi'},
            'execution_metadata': {'$ref': '#/components/schemas/ExecMeta'}
        }
    }

# ── Typed request schemas per API per endpoint ─────────────────────────────────
REQ = {
    'meta-tags-extractor': {
        'extract':           {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri', 'example': 'https://example.com'}, 'include_og': {'type': 'boolean', 'default': True}, 'include_twitter': {'type': 'boolean', 'default': True}}},
        'validate':          {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri'}, 'seo_rules': {'type': 'array', 'items': {'type': 'string'}, 'example': ['title_length', 'description_length', 'og_required']}}},
        'batch':             {'required': ['urls'], 'properties': {'urls': {'type': 'array', 'items': {'type': 'string', 'format': 'uri'}, 'maxItems': 20, 'example': ['https://example.com', 'https://another.com']}}},
        'meta-intelligence': {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri'}, 'competitor_urls': {'type': 'array', 'items': {'type': 'string', 'format': 'uri'}, 'maxItems': 5}}},
    },
    'open-graph-preview': {
        'preview':       {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri'}, 'platform': {'type': 'string', 'enum': ['facebook', 'twitter', 'linkedin', 'whatsapp', 'generic'], 'default': 'generic'}}},
        'validate':      {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri'}, 'required_tags': {'type': 'array', 'items': {'type': 'string'}}}},
        'generate':      {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri'}, 'title': {'type': 'string'}, 'description': {'type': 'string'}, 'image_url': {'type': 'string', 'format': 'uri'}}},
        'og-intelligence': {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri'}, 'target_platform': {'type': 'string', 'enum': ['facebook', 'twitter', 'linkedin', 'generic']}}},
    },
    'app-store-lookup': {
        'lookup':          {'required': ['app_name_or_id'], 'properties': {'app_name_or_id': {'type': 'string', 'example': 'com.spotify.music'}, 'platform': {'type': 'string', 'enum': ['ios', 'android', 'both'], 'default': 'both'}, 'country': {'type': 'string', 'example': 'US'}}},
        'reviews':         {'required': ['app_id'], 'properties': {'app_id': {'type': 'string'}, 'platform': {'type': 'string', 'enum': ['ios', 'android']}, 'limit': {'type': 'integer', 'minimum': 1, 'maximum': 100, 'default': 20}, 'sort': {'type': 'string', 'enum': ['recent', 'helpful', 'critical']}}},
        'similar':         {'required': ['app_id'], 'properties': {'app_id': {'type': 'string'}, 'platform': {'type': 'string', 'enum': ['ios', 'android']}, 'limit': {'type': 'integer', 'default': 10}}},
        'app-intelligence': {'required': ['app_name_or_id'], 'properties': {'app_name_or_id': {'type': 'string'}, 'platform': {'type': 'string', 'enum': ['ios', 'android', 'both']}, 'country': {'type': 'string', 'default': 'US'}}},
    },
    'chrome-extension-lookup': {
        'lookup':               {'required': ['extension_id_or_name'], 'properties': {'extension_id_or_name': {'type': 'string', 'example': 'uBlock Origin'}}},
        'analyze':              {'required': ['extension_id'], 'properties': {'extension_id': {'type': 'string', 'example': 'cjpalhdlnbpafiamejdnhcphjbkeiagm'}, 'deep_scan': {'type': 'boolean', 'default': False}}},
        'similar':              {'required': ['extension_id'], 'properties': {'extension_id': {'type': 'string'}, 'limit': {'type': 'integer', 'default': 5}}},
        'extension-intelligence': {'required': ['extension_id_or_name'], 'properties': {'extension_id_or_name': {'type': 'string'}}},
    },
    'browser-compatibility': {
        'check':             {'required': ['feature'], 'properties': {'feature': {'type': 'string', 'example': 'css-grid'}, 'browsers': {'type': 'array', 'items': {'type': 'string'}, 'example': ['chrome', 'firefox', 'safari', 'edge']}, 'min_global_usage_percent': {'type': 'number', 'default': 0.5}}},
        'polyfills':         {'required': ['features'], 'properties': {'features': {'type': 'array', 'items': {'type': 'string'}, 'example': ['css-grid', 'fetch', 'promise']}, 'target_browsers': {'type': 'array', 'items': {'type': 'string'}}}},
        'report':            {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri'}, 'target_browsers': {'type': 'array', 'items': {'type': 'string'}, 'example': ['chrome >= 80', 'firefox >= 75', 'safari >= 13']}}},
        'compat-intelligence': {'required': ['feature_or_url'], 'properties': {'feature_or_url': {'type': 'string'}, 'target_browsers': {'type': 'array', 'items': {'type': 'string'}}}},
    },
    'dns-propagation': {
        'check':                   {'required': ['domain', 'record_type'], 'properties': {'domain': {'type': 'string', 'example': 'example.com'}, 'record_type': {'type': 'string', 'enum': ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR']}, 'regions': {'type': 'array', 'items': {'type': 'string', 'enum': ['us-east', 'us-west', 'eu-west', 'eu-central', 'ap-southeast', 'ap-northeast', 'sa-east']}}}},
        'status':                  {'required': ['domain'], 'properties': {'domain': {'type': 'string'}, 'record_type': {'type': 'string', 'enum': ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR']}, 'expected_value': {'type': 'string', 'example': '93.184.216.34'}}},
        'trace':                   {'required': ['domain'], 'properties': {'domain': {'type': 'string'}, 'record_type': {'type': 'string', 'enum': ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR'], 'default': 'A'}}},
        'propagation-intelligence': {'required': ['domain'], 'properties': {'domain': {'type': 'string'}, 'record_type': {'type': 'string', 'enum': ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR']}}},
    },
    'ssl-expiry-monitor': {
        'check':                  {'required': ['domain'], 'properties': {'domain': {'type': 'string', 'example': 'example.com'}, 'port': {'type': 'integer', 'default': 443}}},
        'monitor':                {'required': ['domains'], 'properties': {'domains': {'type': 'array', 'items': {'type': 'string'}, 'maxItems': 50, 'example': ['example.com', 'api.example.com']}, 'alert_days_threshold': {'type': 'integer', 'default': 30}}},
        'alert':                  {'required': ['domain'], 'properties': {'domain': {'type': 'string'}, 'days_threshold': {'type': 'integer', 'default': 30}}},
        'ssl-expiry-intelligence': {'required': ['domain'], 'properties': {'domain': {'type': 'string'}}},
    },
    'tls-configuration': {
        'analyze':          {'required': ['domain'], 'properties': {'domain': {'type': 'string', 'example': 'example.com'}, 'port': {'type': 'integer', 'default': 443}, 'include_cert_chain': {'type': 'boolean', 'default': True}}},
        'grade':            {'required': ['domain'], 'properties': {'domain': {'type': 'string'}, 'port': {'type': 'integer', 'default': 443}}},
        'recommendations':  {'required': ['domain'], 'properties': {'domain': {'type': 'string'}, 'compliance_frameworks': {'type': 'array', 'items': {'type': 'string', 'enum': ['PCI-DSS', 'NIST', 'SOC2', 'HIPAA', 'GDPR']}}}},
        'tls-intelligence': {'required': ['domain'], 'properties': {'domain': {'type': 'string'}, 'port': {'type': 'integer', 'default': 443}, 'compliance_frameworks': {'type': 'array', 'items': {'type': 'string'}}}},
    },
    'website-carbon-footprint': {
        'estimate':          {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri', 'example': 'https://example.com'}, 'include_third_party': {'type': 'boolean', 'default': True}}},
        'benchmark':         {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri'}, 'industry': {'type': 'string', 'example': 'technology'}}},
        'optimize':          {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri'}, 'max_suggestions': {'type': 'integer', 'default': 10}}},
        'carbon-intelligence': {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri'}, 'industry': {'type': 'string'}}},
    },
    'accessibility-audit-lite': {
        'audit':                    {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri', 'example': 'https://example.com'}, 'wcag_level': {'type': 'string', 'enum': ['A', 'AA', 'AAA'], 'default': 'AA'}}},
        'score':                    {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri'}}},
        'fix-suggestions':          {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri'}, 'max_suggestions': {'type': 'integer', 'default': 20}}},
        'accessibility-intelligence': {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri'}, 'wcag_level': {'type': 'string', 'enum': ['A', 'AA', 'AAA']}}},
    },
    'keyword-density': {
        'analyze':            {'required': ['text'], 'properties': {'text': {'type': 'string', 'example': 'Your article text goes here...'}, 'language': {'type': 'string', 'default': 'en'}, 'min_word_length': {'type': 'integer', 'default': 3}}},
        'optimize':           {'required': ['text', 'target_keywords'], 'properties': {'text': {'type': 'string'}, 'target_keywords': {'type': 'array', 'items': {'type': 'string'}, 'example': ['seo', 'optimization']}, 'target_density': {'type': 'number', 'default': 0.02}}},
        'compare':            {'required': ['url1', 'url2'], 'properties': {'url1': {'type': 'string', 'format': 'uri'}, 'url2': {'type': 'string', 'format': 'uri'}}},
        'keyword-intelligence': {'required': ['text'], 'properties': {'text': {'type': 'string'}, 'target_keywords': {'type': 'array', 'items': {'type': 'string'}}, 'language': {'type': 'string', 'default': 'en'}}},
    },
    'serp-snippet-preview': {
        'preview':         {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri', 'example': 'https://example.com/page'}}},
        'optimize':        {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri'}, 'target_keyword': {'type': 'string', 'example': 'best seo tools'}}},
        'score':           {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri'}, 'target_keyword': {'type': 'string'}}},
        'serp-intelligence': {'required': ['url'], 'properties': {'url': {'type': 'string', 'format': 'uri'}, 'target_keyword': {'type': 'string'}}},
    },
    'slug-generator': {
        'generate':         {'required': ['title'], 'properties': {'title': {'type': 'string', 'example': 'How to Build a REST API with Node.js'}, 'locale': {'type': 'string', 'default': 'en'}, 'max_length': {'type': 'integer', 'default': 60}, 'separator': {'type': 'string', 'enum': ['hyphen', 'underscore'], 'default': 'hyphen'}}},
        'validate':         {'required': ['slug'], 'properties': {'slug': {'type': 'string', 'example': 'how-to-build-a-rest-api'}}},
        'batch':            {'required': ['titles'], 'properties': {'titles': {'type': 'array', 'items': {'type': 'string'}, 'maxItems': 50}, 'locale': {'type': 'string', 'default': 'en'}}},
        'slug-intelligence': {'required': ['title'], 'properties': {'title': {'type': 'string'}, 'locale': {'type': 'string', 'default': 'en'}, 'max_length': {'type': 'integer', 'default': 60}}},
    },
    'text-readability-score': {
        'score':                  {'required': ['text'], 'properties': {'text': {'type': 'string', 'example': 'Your text to analyze for readability.'}}},
        'analyze':                {'required': ['text'], 'properties': {'text': {'type': 'string'}, 'highlight_complex': {'type': 'boolean', 'default': True}}},
        'simplify':               {'required': ['text'], 'properties': {'text': {'type': 'string'}, 'target_grade': {'type': 'number', 'default': 8, 'description': 'Target US grade level'}}},
        'readability-intelligence': {'required': ['text'], 'properties': {'text': {'type': 'string'}, 'target_audience': {'type': 'string', 'enum': ['general', 'academic', 'children', 'professional'], 'default': 'general'}}},
    },
    'grammar-check-lite': {
        'check':              {'required': ['text'], 'properties': {'text': {'type': 'string', 'example': 'Their going to the store tommorow.'}, 'language': {'type': 'string', 'default': 'en-US'}, 'check_style': {'type': 'boolean', 'default': True}}},
        'fix':                {'required': ['text'], 'properties': {'text': {'type': 'string'}, 'language': {'type': 'string', 'default': 'en-US'}}},
        'analyze':            {'required': ['text'], 'properties': {'text': {'type': 'string'}, 'language': {'type': 'string', 'default': 'en-US'}}},
        'grammar-intelligence': {'required': ['text'], 'properties': {'text': {'type': 'string'}, 'language': {'type': 'string', 'default': 'en-US'}, 'formality': {'type': 'string', 'enum': ['formal', 'neutral', 'casual'], 'default': 'neutral'}}},
    },
    'emoji-sentiment': {
        'analyze':          {'required': ['text'], 'properties': {'text': {'type': 'string', 'example': 'So excited for this! 🚀🎉 Can\'t wait 😍'}}},
        'suggest':          {'required': ['topic'], 'properties': {'topic': {'type': 'string', 'example': 'product launch'}, 'platform': {'type': 'string', 'enum': ['instagram', 'twitter', 'linkedin', 'tiktok', 'generic'], 'default': 'generic'}, 'limit': {'type': 'integer', 'default': 10}}},
        'decode':           {'required': ['emoji'], 'properties': {'emoji': {'type': 'string', 'example': '🚀'}}},
        'emoji-intelligence': {'required': ['text'], 'properties': {'text': {'type': 'string'}, 'topic': {'type': 'string'}}},
    },
    'hashtag-generator': {
        'generate':           {'required': ['topic'], 'properties': {'topic': {'type': 'string', 'example': 'sustainable fashion'}, 'platform': {'type': 'string', 'enum': ['instagram', 'twitter', 'linkedin', 'tiktok', 'generic'], 'default': 'instagram'}, 'count': {'type': 'integer', 'default': 30}}},
        'analyze':            {'required': ['hashtag'], 'properties': {'hashtag': {'type': 'string', 'example': '#sustainablefashion'}, 'platform': {'type': 'string', 'enum': ['instagram', 'twitter', 'linkedin', 'tiktok']}}},
        'trending':           {'required': [], 'properties': {'category': {'type': 'string', 'example': 'technology'}, 'platform': {'type': 'string', 'enum': ['instagram', 'twitter', 'linkedin', 'tiktok'], 'default': 'instagram'}, 'limit': {'type': 'integer', 'default': 20}}},
        'hashtag-intelligence': {'required': ['topic'], 'properties': {'topic': {'type': 'string'}, 'platform': {'type': 'string', 'enum': ['instagram', 'twitter', 'linkedin', 'tiktok', 'generic']}, 'brand': {'type': 'string'}}},
    },
    'caption-generator': {
        'generate':           {'required': ['topic'], 'properties': {'topic': {'type': 'string', 'example': 'new product launch'}, 'platform': {'type': 'string', 'enum': ['instagram', 'linkedin', 'twitter', 'tiktok', 'facebook', 'generic'], 'default': 'instagram'}, 'tone': {'type': 'string', 'enum': ['professional', 'casual', 'humorous', 'inspirational', 'educational'], 'default': 'casual'}, 'include_cta': {'type': 'boolean', 'default': True}}},
        'optimize':           {'required': ['caption'], 'properties': {'caption': {'type': 'string'}, 'platform': {'type': 'string', 'enum': ['instagram', 'linkedin', 'twitter', 'tiktok', 'facebook', 'generic']}, 'target_engagement': {'type': 'string', 'enum': ['likes', 'shares', 'comments', 'clicks'], 'default': 'likes'}}},
        'batch':              {'required': ['items'], 'properties': {'items': {'type': 'array', 'items': {'type': 'object', 'required': ['topic'], 'properties': {'topic': {'type': 'string'}, 'platform': {'type': 'string'}, 'tone': {'type': 'string'}}}, 'maxItems': 10}}},
        'caption-intelligence': {'required': ['topic'], 'properties': {'topic': {'type': 'string'}, 'platform': {'type': 'string', 'enum': ['instagram', 'linkedin', 'twitter', 'tiktok', 'generic']}, 'brand_voice': {'type': 'string', 'example': 'friendly and approachable'}}},
    },
    'cta-generator': {
        'generate':       {'required': ['use_case', 'goal'], 'properties': {'use_case': {'type': 'string', 'example': 'SaaS landing page'}, 'goal': {'type': 'string', 'enum': ['sign_up', 'purchase', 'download', 'contact', 'learn_more', 'subscribe']}, 'placement': {'type': 'string', 'enum': ['above_fold', 'inline', 'footer', 'popup', 'email']}, 'urgency': {'type': 'string', 'enum': ['high', 'medium', 'low']}}},
        'score':          {'required': ['cta', 'goal'], 'properties': {'cta': {'type': 'string', 'example': 'Start Free Trial'}, 'goal': {'type': 'string', 'enum': ['sign_up', 'purchase', 'download', 'contact', 'learn_more', 'subscribe']}}},
        'ab-variants':    {'required': ['cta', 'goal'], 'properties': {'cta': {'type': 'string'}, 'goal': {'type': 'string', 'enum': ['sign_up', 'purchase', 'download', 'contact', 'learn_more', 'subscribe']}, 'count': {'type': 'integer', 'default': 3, 'maximum': 5}}},
        'cta-intelligence': {'required': ['use_case', 'goal'], 'properties': {'use_case': {'type': 'string'}, 'goal': {'type': 'string', 'enum': ['sign_up', 'purchase', 'download', 'contact', 'learn_more', 'subscribe']}, 'landing_page_url': {'type': 'string', 'format': 'uri'}}},
    },
    'subject-line-scorer': {
        'score':               {'required': ['subject'], 'properties': {'subject': {'type': 'string', 'example': 'Your exclusive offer expires tonight 🔥'}, 'audience': {'type': 'string', 'example': 'B2B SaaS decision makers'}}},
        'optimize':            {'required': ['subject'], 'properties': {'subject': {'type': 'string'}, 'goal': {'type': 'string', 'enum': ['maximize_opens', 'avoid_spam', 'increase_urgency', 'increase_personalization']}}},
        'generate':            {'required': ['topic'], 'properties': {'topic': {'type': 'string', 'example': 'weekly newsletter'}, 'tone': {'type': 'string', 'enum': ['curious', 'urgent', 'benefit_driven', 'personalized', 'direct', 'question'], 'default': 'benefit_driven'}, 'count': {'type': 'integer', 'default': 5}}},
        'subject-intelligence': {'required': ['topic'], 'properties': {'topic': {'type': 'string'}, 'audience': {'type': 'string'}, 'brand': {'type': 'string'}}},
    },
}

# ── Examples per API (request + 200 response stub) ────────────────────────────
# Concise examples — one per first main endpoint + one-call endpoint
EXAMPLES = {
    'dns-propagation': {
        'check': {
            'req': {'domain': 'example.com', 'record_type': 'A', 'regions': ['us-east', 'eu-west']},
            'resp': {'success': True, 'request_id': 'a1b2c3d4-e5f6-4789-abcd-ef1234567890', 'data': {'domain': 'example.com', 'record_type': 'A', 'propagation_percentage': 87.5, 'propagation_status': 'partial', 'nodes': [{'region': 'us-east', 'nameserver': '8.8.8.8', 'ip': '93.184.216.34', 'status': 'propagated', 'latency_ms': 12, 'resolved_value': '93.184.216.34'}, {'region': 'eu-west', 'nameserver': '1.1.1.1', 'ip': None, 'status': 'pending', 'latency_ms': 0, 'resolved_value': None}], 'estimated_completion_minutes': 15}, 'confidence': {'score': 0.94, 'reason': 'Live DNS resolver responses', 'per_section': {'nodes': 0.94}}, 'provenance': {'provider': 'dns-resolver-network', 'retrieved_at': '2026-05-18T12:00:00Z', 'source_type': 'live_scan'}, 'cache': {'recommended_ttl_seconds': 300, 'retryable': True, 'cache_recommended': False}, 'recommended_next_api': [{'api': 'ssl-expiry-monitor', 'endpoint': '/check', 'reason': 'Verify SSL certificate after DNS propagation completes'}], 'recommended_actions_priority_order': [{'priority': 'high', 'action': 'Wait 15 minutes and recheck propagation', 'reason': '87.5% propagated — eu-west node still pending'}], 'execution_metadata': {'latency_ms': 234, 'model': 'claude-sonnet-4-5', 'automation_safe': True}}
        },
    },
    'tls-configuration': {
        'grade': {
            'req': {'domain': 'example.com', 'port': 443},
            'resp': {'success': True, 'request_id': 'b2c3d4e5-f6a7-4890-bcde-f12345678901', 'data': {'domain': 'example.com', 'grade': 'B', 'score': 72, 'breakdown': {'protocol_support': 80, 'key_exchange': 70, 'cipher_strength': 75, 'certificate': 63}, 'vulnerabilities_count': 2}, 'confidence': {'score': 0.96, 'reason': 'Direct TLS handshake scan'}, 'provenance': {'provider': 'tls-scanner', 'retrieved_at': '2026-05-18T12:00:00Z', 'source_type': 'live_scan'}, 'cache': {'recommended_ttl_seconds': 86400, 'retryable': False, 'cache_recommended': True}, 'recommended_next_api': [{'api': 'tls-configuration', 'endpoint': '/recommendations', 'reason': 'Get specific hardening steps to reach A+'}], 'recommended_actions_priority_order': [{'priority': 'high', 'action': 'Disable TLS 1.0 and 1.1', 'reason': 'Deprecated protocols detected — PCI-DSS non-compliant'}, {'priority': 'medium', 'action': 'Enable TLS 1.3', 'reason': 'TLS 1.3 not enabled — required for A grade'}], 'execution_metadata': {'latency_ms': 412, 'model': 'claude-sonnet-4-5', 'automation_safe': True}}
        },
    },
    'subject-line-scorer': {
        'score': {
            'req': {'subject': 'Your exclusive offer expires tonight 🔥', 'audience': 'B2B SaaS decision makers'},
            'resp': {'success': True, 'request_id': 'c3d4e5f6-a7b8-4901-cdef-123456789012', 'data': {'subject': 'Your exclusive offer expires tonight 🔥', 'open_rate_score': 82, 'spam_score': 18, 'sentiment': 'urgent', 'urgency_level': 'high', 'personalization_score': 20, 'length_score': 90, 'word_count': 6, 'char_count': 40, 'spam_triggers': ['exclusive', 'tonight'], 'power_words': ['exclusive', 'expires'], 'emoji_used': True, 'overall_grade': 'B'}, 'confidence': {'score': 0.91, 'reason': 'Subject line pattern analysis'}, 'provenance': {'provider': 'subject-line-ai', 'retrieved_at': '2026-05-18T12:00:00Z', 'source_type': 'ai_generated'}, 'cache': {'recommended_ttl_seconds': 3600, 'retryable': False, 'cache_recommended': True}, 'recommended_next_api': [{'api': 'subject-line-scorer', 'endpoint': '/optimize', 'reason': 'Optimize to reduce spam triggers and add personalization'}], 'recommended_actions_priority_order': [{'priority': 'high', 'action': 'Replace "exclusive" with specific benefit', 'reason': '"exclusive" is a common spam trigger'}, {'priority': 'medium', 'action': 'Add personalization token e.g. first name', 'reason': 'Personalization score is low at 20/100'}], 'execution_metadata': {'latency_ms': 187, 'model': 'claude-sonnet-4-5', 'automation_safe': True}}
        },
    },
    'accessibility-audit-lite': {
        'audit': {
            'req': {'url': 'https://example.com', 'wcag_level': 'AA'},
            'resp': {'success': True, 'request_id': 'd4e5f6a7-b8c9-4012-defa-234567890123', 'data': {'url': 'https://example.com', 'violations': [{'id': 'color-contrast', 'impact': 'serious', 'wcag_criterion': '1.4.3', 'description': 'Elements must have sufficient color contrast', 'affected_elements': ['button.cta', 'p.footer-text'], 'fix': 'Increase contrast ratio to at least 4.5:1'}], 'passes': 47, 'violations_count': 3, 'warnings': 5, 'wcag_level': 'AA'}, 'confidence': {'score': 0.89, 'reason': 'Static analysis of page DOM'}, 'provenance': {'provider': 'wcag-scanner', 'retrieved_at': '2026-05-18T12:00:00Z', 'source_type': 'live_scan'}, 'cache': {'recommended_ttl_seconds': 86400, 'retryable': False, 'cache_recommended': True}, 'recommended_next_api': [{'api': 'accessibility-audit-lite', 'endpoint': '/fix-suggestions', 'reason': 'Get prioritized fix list for 3 violations found'}], 'recommended_actions_priority_order': [{'priority': 'high', 'action': 'Fix color contrast on .cta and .footer-text', 'reason': 'WCAG 1.4.3 violation — serious impact, affects all users'}], 'execution_metadata': {'latency_ms': 521, 'model': 'claude-sonnet-4-5', 'automation_safe': True}}
        },
    },
}

# ── API metadata (v2: version bumped to 2.0.0) ─────────────────────────────────
API_META = {
    'meta-tags-extractor':      {'name': 'Meta Tags Extractor API',      'version': '2.0.0', 'desc': 'Extract, validate, and analyze HTML meta tags including title, description, Open Graph, Twitter Card, and canonical tags from any URL.', 'pricing': {'extract': '$0.002', 'validate': '$0.002', 'batch': '$0.015', 'execution-gate': '$0.001', 'meta-intelligence': '$0.006'}, 'free': 500,  'chain_next': 'open-graph-preview'},
    'open-graph-preview':       {'name': 'Open Graph Preview API',        'version': '2.0.0', 'desc': 'Preview, validate, and optimize Open Graph and Twitter Card tags to maximize click-through rates on social media shares.', 'pricing': {'preview': '$0.003', 'validate': '$0.002', 'generate': '$0.004', 'execution-gate': '$0.001', 'og-intelligence': '$0.008'}, 'free': 300,  'chain_next': 'app-store-lookup'},
    'app-store-lookup':         {'name': 'App Store Lookup API',          'version': '2.0.0', 'desc': 'Look up iOS and Android app metadata, ratings, reviews, and competitor analysis.', 'pricing': {'lookup': '$0.003', 'reviews': '$0.005', 'similar': '$0.004', 'execution-gate': '$0.001', 'app-intelligence': '$0.010'}, 'free': 200,  'chain_next': 'chrome-extension-lookup'},
    'chrome-extension-lookup':  {'name': 'Chrome Extension Lookup API',   'version': '2.0.0', 'desc': 'Retrieve Chrome Web Store extension metadata, permissions, and security risk analysis.', 'pricing': {'lookup': '$0.002', 'analyze': '$0.004', 'similar': '$0.003', 'execution-gate': '$0.001', 'extension-intelligence': '$0.008'}, 'free': 300,  'chain_next': 'browser-compatibility'},
    'browser-compatibility':    {'name': 'Browser Compatibility API',     'version': '2.0.0', 'desc': 'Check CSS, JavaScript, and HTML feature compatibility across browsers using Can I Use data. Get polyfill recommendations.', 'pricing': {'check': '$0.001', 'polyfills': '$0.003', 'report': '$0.005', 'execution-gate': '$0.001', 'compat-intelligence': '$0.006'}, 'free': 1000, 'chain_next': 'dns-propagation'},
    'dns-propagation':          {'name': 'DNS Propagation API',           'version': '2.0.0', 'desc': 'Check DNS propagation status across global nameservers, trace resolution paths, and verify completion after DNS changes.', 'pricing': {'check': '$0.002', 'status': '$0.002', 'trace': '$0.003', 'execution-gate': '$0.001', 'propagation-intelligence': '$0.006'}, 'free': 500,  'chain_next': 'ssl-expiry-monitor'},
    'ssl-expiry-monitor':       {'name': 'SSL Expiry Monitor API',        'version': '2.0.0', 'desc': 'Monitor SSL certificate expiry, receive actionable renewal alerts, and track health across multiple domains.', 'pricing': {'check': '$0.001', 'monitor': '$0.005', 'alert': '$0.003', 'execution-gate': '$0.001', 'ssl-expiry-intelligence': '$0.005'}, 'free': 500,  'chain_next': 'tls-configuration'},
    'tls-configuration':        {'name': 'TLS Configuration API',         'version': '2.0.0', 'desc': 'Analyze TLS/SSL configuration for cipher suites, protocol versions, vulnerabilities, and compliance. Grade server security posture.', 'pricing': {'analyze': '$0.003', 'grade': '$0.003', 'recommendations': '$0.004', 'execution-gate': '$0.001', 'tls-intelligence': '$0.008'}, 'free': 300,  'chain_next': 'website-carbon-footprint'},
    'website-carbon-footprint': {'name': 'Website Carbon Footprint API',  'version': '2.0.0', 'desc': 'Estimate the carbon footprint of any webpage, benchmark against industry averages, and get actionable optimization recommendations.', 'pricing': {'estimate': '$0.002', 'benchmark': '$0.003', 'optimize': '$0.004', 'execution-gate': '$0.001', 'carbon-intelligence': '$0.007'}, 'free': 300,  'chain_next': 'accessibility-audit-lite'},
    'accessibility-audit-lite': {'name': 'Accessibility Audit Lite API',  'version': '2.0.0', 'desc': 'Run WCAG 2.1 accessibility checks on any URL. Identify violations, score compliance level, and get fix suggestions.', 'pricing': {'audit': '$0.005', 'score': '$0.002', 'fix-suggestions': '$0.004', 'execution-gate': '$0.001', 'accessibility-intelligence': '$0.010'}, 'free': 200,  'chain_next': 'keyword-density'},
    'keyword-density':          {'name': 'Keyword Density API',           'version': '2.0.0', 'desc': 'Analyze keyword frequency, density, and distribution. Compare against competitor pages and get SEO optimization recommendations.', 'pricing': {'analyze': '$0.002', 'optimize': '$0.003', 'compare': '$0.005', 'execution-gate': '$0.001', 'keyword-intelligence': '$0.007'}, 'free': 500,  'chain_next': 'serp-snippet-preview'},
    'serp-snippet-preview':     {'name': 'SERP Snippet Preview API',      'version': '2.0.0', 'desc': 'Preview and optimize how a URL appears in Google search results. Check title truncation, meta description length, and CTR potential.', 'pricing': {'preview': '$0.002', 'optimize': '$0.004', 'score': '$0.002', 'execution-gate': '$0.001', 'serp-intelligence': '$0.007'}, 'free': 500,  'chain_next': 'slug-generator'},
    'slug-generator':           {'name': 'Slug Generator API',            'version': '2.0.0', 'desc': 'Generate SEO-friendly URL slugs from titles. Handle transliteration, stop-word removal, validation, and batch generation.', 'pricing': {'generate': '$0.001', 'validate': '$0.001', 'batch': '$0.005', 'execution-gate': '$0.001', 'slug-intelligence': '$0.003'}, 'free': 2000, 'chain_next': 'text-readability-score'},
    'text-readability-score':   {'name': 'Text Readability Score API',    'version': '2.0.0', 'desc': 'Score text readability using Flesch-Kincaid, Gunning Fog, SMOG, and Coleman-Liau indices. Identify complex sentences and suggest simplifications.', 'pricing': {'score': '$0.001', 'analyze': '$0.003', 'simplify': '$0.004', 'execution-gate': '$0.001', 'readability-intelligence': '$0.006'}, 'free': 1000, 'chain_next': 'grammar-check-lite'},
    'grammar-check-lite':       {'name': 'Grammar Check Lite API',        'version': '2.0.0', 'desc': 'Lightweight grammar, spelling, and style checking. Detect errors, auto-fix, and score writing quality.', 'pricing': {'check': '$0.002', 'fix': '$0.003', 'analyze': '$0.003', 'execution-gate': '$0.001', 'grammar-intelligence': '$0.007'}, 'free': 500,  'chain_next': 'emoji-sentiment'},
    'emoji-sentiment':          {'name': 'Emoji Sentiment API',           'version': '2.0.0', 'desc': 'Analyze emotional sentiment of emoji usage in text, decode emoji meanings, and suggest contextually appropriate emojis.', 'pricing': {'analyze': '$0.002', 'suggest': '$0.002', 'decode': '$0.001', 'execution-gate': '$0.001', 'emoji-intelligence': '$0.005'}, 'free': 1000, 'chain_next': 'hashtag-generator'},
    'hashtag-generator':        {'name': 'Hashtag Generator API',         'version': '2.0.0', 'desc': 'Generate high-performing hashtags for social media. Analyze trending hashtags, estimate reach, and optimize per platform.', 'pricing': {'generate': '$0.002', 'analyze': '$0.003', 'trending': '$0.003', 'execution-gate': '$0.001', 'hashtag-intelligence': '$0.007'}, 'free': 500,  'chain_next': 'caption-generator'},
    'caption-generator':        {'name': 'Caption Generator API',         'version': '2.0.0', 'desc': 'Generate engaging social media captions for posts, images, and videos. Optimize for Instagram, LinkedIn, Twitter, and TikTok.', 'pricing': {'generate': '$0.003', 'optimize': '$0.003', 'batch': '$0.020', 'execution-gate': '$0.001', 'caption-intelligence': '$0.008'}, 'free': 300,  'chain_next': 'cta-generator'},
    'cta-generator':            {'name': 'CTA Generator API',             'version': '2.0.0', 'desc': 'Generate high-converting call-to-action copy for landing pages, emails, and ads. Score CTAs and generate A/B test variants.', 'pricing': {'generate': '$0.003', 'score': '$0.002', 'ab-variants': '$0.005', 'execution-gate': '$0.001', 'cta-intelligence': '$0.008'}, 'free': 300,  'chain_next': 'subject-line-scorer'},
    'subject-line-scorer':      {'name': 'Subject Line Scorer API',       'version': '2.0.0', 'desc': 'Score email subject lines for open rate potential using sentiment, urgency, personalization, and spam trigger analysis.', 'pricing': {'score': '$0.001', 'optimize': '$0.003', 'generate': '$0.003', 'execution-gate': '$0.001', 'subject-intelligence': '$0.006'}, 'free': 500,  'chain_next': None},
}

# ── Re-import data schemas from v1 (abbreviated — reuse what we have) ──────────
# Pull in the APIS dict from the previous script by exec'ing it
import importlib.util, sys, types

# Save v2 API_META before exec() overwrites it with the v1 version (no 'version' key)
_API_META_V2 = API_META

# Load the v1 APIS dict by importing just what we need
exec(open(f'{BASE}/polish-batch6.py').read().split('# ── Generators')[0])

# Restore v2 API_META (has 'version' key needed for discovery endpoint)
API_META = _API_META_V2

# ── Generator functions ────────────────────────────────────────────────────────

def make_req_schema(slug, ep_slug):
    """Return typed request schema for this endpoint."""
    req = REQ.get(slug, {}).get(ep_slug, {})
    if not req:
        return {'type': 'object', 'required': ['input'], 'properties': {'input': {'type': 'string'}}}
    return {'type': 'object', 'required': req.get('required', []), 'properties': req['properties']}

def get_example(slug, ep_slug):
    """Return example dict for this slug/endpoint, or None."""
    return EXAMPLES.get(slug, {}).get(ep_slug)

def make_gate_req(slug):
    req_props = REQ.get(slug, {})
    # Use first endpoint's first required field as the gate input field
    first_ep = list(req_props.keys())[0] if req_props else None
    first_req = req_props.get(first_ep, {}).get('required', [])
    input_field = first_req[0] if first_req else 'input'
    return {
        'type': 'object',
        'required': [input_field],
        'properties': {
            input_field: {'type': 'string'},
            'objective': {'type': 'string', 'description': 'What the agent is trying to accomplish'}
        }
    }

def generate_openapi_ts(slug):
    api = APIS[slug]
    meta = API_META[slug]
    schemas = api['schemas']
    ep_map = api['endpoint_map']
    all_schemas = {**SHARED, **schemas}
    eps = list(ep_map.keys())
    one_call_ep = eps[-1]

    # Build discovery GET /
    pricing_list = [
        {'method': 'POST', 'path': f'/{ep}', 'summary': ep.replace('-', ' ').title(),
         'price_usd': float(meta['pricing'].get(ep, '$0.003').replace('$', ''))}
        for ep in list(ep_map.keys()) + ['execution-gate']
    ]
    discovery_example = {
        'name': meta['name'], 'version': meta['version'],
        'description': meta['desc'],
        'base_url': f'https://orbis-apis.onrender.com/{slug}',
        'docs_url': f'https://orbis-apis.onrender.com/{slug}/openapi.json',
        'mcp_compatible': True, 'agent_callable': True,
        'pricing': {'free_tier': {'requests_per_day': meta['free']}, 'pay_per_call': meta['pricing']},
        'endpoints': pricing_list
    }

    paths = {}

    # GET /
    paths['/'] = {'get': {
        'operationId': 'discover',
        'summary': f'Discovery — endpoints, pricing, rate limits',
        'tags': ['Discovery'],
        'security': [],
        'responses': {
            '200': {
                'description': 'API metadata',
                'content': {'application/json': {
                    'schema': {'$ref': '#/components/schemas/DiscoveryResponse'},
                    'example': discovery_example
                }}
            }
        }
    }}

    # POST endpoints from ep_map
    for ep_slug, schema_name in ep_map.items():
        is_oc = (ep_slug == one_call_ep)
        summary = (f'ONE-CALL: {meta["name"].replace(" API", "")} — full intelligence in one request'
                   if is_oc else ep_slug.replace('-', ' ').title())
        req_schema = make_req_schema(slug, ep_slug)
        resp_schema = env(schema_name)
        ex = get_example(slug, ep_slug)

        req_content = {'schema': req_schema}
        resp_content = {'schema': resp_schema}
        if ex:
            req_content['example'] = ex['req']
            resp_content['example'] = ex['resp']

        path_obj = {'post': {
            'operationId': ep_slug.replace('-', '_').replace('/', '_'),
            'summary': summary,
            'tags': ['Intelligence'],
            'requestBody': {'required': True, 'content': {'application/json': req_content}},
            'responses': {
                '200': {'description': summary, 'content': {'application/json': resp_content}},
                '400': {'description': 'Bad request', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Error'}, 'example': {'error': 'domain is required', 'code': 'MISSING_INPUT', 'retryable': False}}}},
                '401': {'description': 'Unauthorized', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Error'}}}},
                '429': {'description': 'Rate limit exceeded', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Error'}}}},
                '500': {'description': 'Server error', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Error'}, 'example': {'error': 'Upstream model error', 'code': 'UPSTREAM_ERROR', 'retryable': True}}}},
            }
        }}
        if is_oc:
            path_obj['post']['x-one-call'] = True
        paths[f'/{ep_slug}'] = path_obj

    # POST /execution-gate (always present)
    gate_req = make_gate_req(slug)
    paths['/execution-gate'] = {'post': {
        'operationId': 'execution_gate',
        'summary': 'Execution readiness check — validate input and get next-step routing',
        'tags': ['Execution'],
        'requestBody': {'required': True, 'content': {'application/json': {
            'schema': gate_req,
            'example': {list(gate_req['properties'].keys())[0]: 'example.com', 'objective': f'run {one_call_ep}'}
        }}},
        'responses': {
            '200': {'description': 'Execution gate result', 'content': {'application/json': {
                'schema': gate_env(),
                'example': {'success': True, 'request_id': 'a1b2c3d4-e5f6-4789-abcd-ef1234567890', 'execution_ready': True, 'next_api': slug, 'next_endpoint': f'/{one_call_ep}', 'blocking_flags': [], 'confidence': {'score': 0.98, 'reason': 'Input valid'}}
            }}},
            '400': {'description': 'Bad request', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Error'}}}},
        }
    }}

    spec = {
        'openapi': '3.1.0',
        'info': {
            'title': meta['name'], 'version': meta['version'], 'description': meta['desc'],
            'x-agent-callable': True, 'x-mcp-compatible': True,
            'x-pricing': {'free_tier': {'requests_per_day': meta['free']}, 'pay_per_call': meta['pricing']},
        },
        'servers': [{'url': f'https://orbis-apis.onrender.com/{slug}', 'description': 'Production'}],
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

# ── Write all files ────────────────────────────────────────────────────────────
for slug in APIS:
    route_dir = f'{BASE}/src/routes/{slug}-api/routes'

    # openapi.ts
    with open(f'{route_dir}/openapi.ts', 'w') as f:
        f.write(generate_openapi_ts(slug))

    # Root openapi.json — same spec, written to disk
    api = APIS[slug]
    meta = API_META[slug]
    all_schemas = {**SHARED, **api['schemas']}
    ep_map = api['endpoint_map']
    eps = list(ep_map.keys())
    one_call_ep = eps[-1]

    paths = {}
    pricing_list = [{'method': 'POST', 'path': f'/{ep}', 'summary': ep, 'price_usd': float(meta['pricing'].get(ep, '$0.003').replace('$', ''))} for ep in list(ep_map.keys()) + ['execution-gate']]
    paths['/'] = {'get': {'operationId': 'discover', 'summary': 'API discovery', 'security': [], 'responses': {'200': {'description': 'API metadata', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/DiscoveryResponse'}}}}}}}

    for ep_slug, schema_name in ep_map.items():
        is_oc = (ep_slug == one_call_ep)
        req_schema = make_req_schema(slug, ep_slug)
        ex = get_example(slug, ep_slug)
        req_content = {'schema': req_schema}
        resp_content = {'schema': env(schema_name)}
        if ex:
            req_content['example'] = ex['req']
            resp_content['example'] = ex['resp']
        p = {'post': {'operationId': ep_slug.replace('-', '_'), 'summary': ep_slug, 'requestBody': {'required': True, 'content': {'application/json': req_content}}, 'responses': {'200': {'description': ep_slug, 'content': {'application/json': resp_content}}, '400': {'description': 'Bad request', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Error'}}}}, '500': {'description': 'Server error', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Error'}}}}}}}
        if is_oc: p['post']['x-one-call'] = True
        paths[f'/{ep_slug}'] = p

    gate_req = make_gate_req(slug)
    paths['/execution-gate'] = {'post': {'operationId': 'execution_gate', 'summary': 'Execution readiness check', 'requestBody': {'required': True, 'content': {'application/json': {'schema': gate_req}}}, 'responses': {'200': {'description': 'Gate result', 'content': {'application/json': {'schema': gate_env()}}}, '400': {'description': 'Bad request', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Error'}}}}}}}

    root_spec = {
        'openapi': '3.1.0',
        'info': {'title': meta['name'], 'version': meta['version'], 'description': meta['desc'], 'x-agent-callable': True, 'x-mcp-compatible': True, 'x-pricing': {'free_tier': {'requests_per_day': meta['free']}, 'pay_per_call': meta['pricing']}},
        'servers': [{'url': f'https://orbis-apis.onrender.com/{slug}', 'description': 'Production'}],
        'security': [{'ApiKeyAuth': []}],
        'paths': paths,
        'components': {'securitySchemes': {'ApiKeyAuth': {'type': 'apiKey', 'in': 'header', 'name': 'X-API-Key'}}, 'schemas': all_schemas}
    }
    with open(f'{BASE}/{slug}-openapi.json', 'w') as f:
        json.dump(root_spec, f, indent=2)

    # info.json — bump version to 2.0.0
    info_path = f'{BASE}/{slug}-info.json'
    info = json.load(open(info_path))
    info['version'] = '2.0.0'
    with open(info_path, 'w') as f:
        json.dump(info, f, indent=2)

    print(f'✅ {slug}')

print(f'\n✅ All {len(APIS)} APIs fixed (v2)')
