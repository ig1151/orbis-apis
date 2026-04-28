import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { analyzeEmail } from '../utils/email.utils';
import { analyzePhone } from '../utils/phone.utils';
import { scrapeWebsite } from '../utils/scraper';
import type { ScoreRequest, LeadScoreResponse, LeadQuality, CompanySize } from '../types/index';



function getQuality(score: number): LeadQuality {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

export async function scoreLead(req: ScoreRequest): Promise<LeadScoreResponse> {
  const id = `lead_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const t0 = Date.now();
  const checksPerformed: string[] = [];

  logger.info({ id, email: req.email, domain: req.domain }, 'Starting lead scoring');

  let emailData = { valid: false, disposable: false, free_provider: false, role_based: false, domain: '', is_business: false };
  let phoneData = { valid: false, line_type: 'unknown', is_voip: false };
  let websiteContent = '';
  let companyDomain = req.domain ?? '';

  if (req.email) {
    checksPerformed.push('email');
    emailData = await analyzeEmail(req.email);
    if (!companyDomain && emailData.domain && !emailData.free_provider) {
      companyDomain = emailData.domain;
    }
  }

  if (req.phone) {
    checksPerformed.push('phone');
    phoneData = analyzePhone(req.phone);
  }

  if (companyDomain) {
    checksPerformed.push('domain');
    websiteContent = await scrapeWebsite(companyDomain);
  }

  const isB2b = emailData.is_business || (!emailData.free_provider && emailData.valid);

  let companyData = undefined;
  let positiveSignals: string[] = [];
  let negativeSignals: string[] = [];
  let conversionScore = 50;

  if (companyDomain || req.company_name) {
    checksPerformed.push('company');
    try {
      const prompt = `Analyze this company and score lead quality for B2B sales.
Company: ${req.company_name ?? companyDomain}
Website content: ${websiteContent}

Return ONLY valid JSON:
{
  "name": "<company name>",
  "domain": "${companyDomain}",
  "description": "<1-2 sentence description>",
  "industry": "<industry>",
  "company_size": "<solo|small|medium|large|enterprise>",
  "is_b2b": <boolean>,
  "has_website": <boolean>,
  "technologies": ["<tech1>", "<tech2>"],
  "positive_signals": ["<signal1>", "<signal2>"],
  "negative_signals": ["<signal1>"],
  "conversion_score": <integer 0-100>
}`;

      const response = await client.messages.create({
        model: config.anthropic.model,
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = response.content.find(b => b.type === 'text')?.text ?? '{}';
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

      companyData = {
        name: parsed.name,
        domain: companyDomain,
        description: parsed.description,
        industry: parsed.industry,
        company_size: (parsed.company_size ?? 'unknown') as CompanySize,
        is_b2b: parsed.is_b2b ?? isB2b,
        has_website: parsed.has_website ?? !!companyDomain,
        technologies: parsed.technologies ?? [],
      };

      positiveSignals = parsed.positive_signals ?? [];
      negativeSignals = parsed.negative_signals ?? [];
      conversionScore = parsed.conversion_score ?? 50;

    } catch (err) {
      logger.warn({ id, err }, 'Company enrichment failed — using defaults');
    }
  }

  if (emailData.valid && !emailData.disposable && !emailData.free_provider) { positiveSignals.push('Business email address'); conversionScore += 10; }
  if (emailData.disposable) { negativeSignals.push('Disposable email detected'); conversionScore -= 30; }
  if (emailData.free_provider) { negativeSignals.push('Free email provider (not business)'); conversionScore -= 10; }
  if (emailData.role_based) { negativeSignals.push('Role-based email address'); conversionScore -= 5; }
  if (phoneData.valid && !phoneData.is_voip) { positiveSignals.push('Valid direct phone number'); conversionScore += 10; }
  if (phoneData.is_voip) { negativeSignals.push('VoIP phone number'); conversionScore -= 10; }
  if (!phoneData.valid && req.phone) { negativeSignals.push('Invalid phone number'); conversionScore -= 15; }

  const leadScore = Math.min(100, Math.max(0, conversionScore));
  const quality = getQuality(leadScore);
  const likelyToConvert = leadScore >= 60;
  const confidence = Math.min(1, Math.max(0, leadScore / 100));

  logger.info({ id, leadScore, quality, likelyToConvert }, 'Lead scoring complete');

  return {
    id,
    lead_score: leadScore,
    quality,
    is_b2b: companyData?.is_b2b ?? isB2b,
    likely_to_convert: likelyToConvert,
    conversion_confidence: parseFloat(confidence.toFixed(2)),
    contact: {
      email_valid: emailData.valid,
      email_disposable: emailData.disposable,
      email_free_provider: emailData.free_provider,
      email_role_based: emailData.role_based,
      phone_valid: phoneData.valid,
      phone_line_type: phoneData.line_type,
    },
    ...(companyData && { company: companyData }),
    conversion_signals: {
      likely_to_convert: likelyToConvert,
      confidence: parseFloat(confidence.toFixed(2)),
      positive_signals: [...new Set(positiveSignals)],
      negative_signals: [...new Set(negativeSignals)],
    },
    checks_performed: checksPerformed,
    latency_ms: Date.now() - t0,
    created_at: new Date().toISOString(),
  };
}
