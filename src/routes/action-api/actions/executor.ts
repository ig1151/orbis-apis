import { v4 as uuidv4 } from 'uuid';
import { callClaude, callClaudeJSON } from './claude';
import { search } from './tavily';

export interface ActionResult {
  id: string;
  action: string;
  status: 'success' | 'failed';
  output: unknown;
  execution_time_ms: number;
  timestamp: string;
}

export async function executeAction(
  action: string,
  input: Record<string, unknown>
): Promise<ActionResult> {
  const start = Date.now();
  const id = uuidv4();

  try {
    let output: unknown = null;

    if (action === 'send_outreach') {
      const company = input.company as string ?? (input.lead as Record<string, unknown>)?.company as string ?? 'Unknown';
      const role = input.contact_role as string ?? (input.lead as Record<string, unknown>)?.role as string ?? 'Decision Maker';
      const goal = input.goal as string ?? 'introduce our product';
      const senderName = input.sender_name as string ?? '';
      const senderCompany = input.sender_company as string ?? '';
      const tone = input.tone as string ?? 'professional';

      const prompt = `Write a personalized cold outreach email.

Target company: ${company}
Target role: ${role}
Goal: ${goal}
${senderName ? `Sender: ${senderName}` : ''}
${senderCompany ? `Sender company: ${senderCompany}` : ''}
Tone: ${tone}

Return JSON:
{
  "subject": "email subject",
  "body": "email body under 100 words, no generic openers",
  "cta": "call to action",
  "ready_to_send": true,
  "word_count": number
}`;

      output = await callClaudeJSON(prompt);

    } else if (action === 'enrich_lead') {
      const company = input.company as string ?? '';
      const name = input.name as string ?? '';
      const email = input.email as string ?? '';

      const searchResults = await search(`${company} ${name} company overview`, 3);
      const content = searchResults.map(r => r.title + ' ' + r.content).join(' ').slice(0, 6000);

      output = await callClaudeJSON(`Enrich this lead with available information.

Known info: company=${company}, name=${name}, email=${email}
Web content: ${content}

Return JSON:
{
  "name": "full name or null",
  "email": "${email}",
  "company": "${company}",
  "role": "likely role or null",
  "industry": "industry",
  "company_size": "size range or null",
  "location": "city, country or null",
  "linkedin_hint": "linkedin.com/in/... pattern or null",
  "enrichment_confidence": 0.0-1.0,
  "enriched_fields": ["list of fields that were enriched"]
}`);

    } else if (action === 'research_company') {
      const company = input.company as string ?? '';
      const focus = input.focus as string ?? '';

      const results = await search(`${company} company ${focus} overview products news`, 6);
      const content = results.map(r => r.title + ' ' + r.content).join(' ').slice(0, 10000);

      output = await callClaudeJSON(`Research ${company} and return structured intelligence.
${focus ? `Focus on: ${focus}` : ''}

Return JSON:
{
  "company": "${company}",
  "summary": "2-3 sentence overview",
  "industry": "industry",
  "founded": "year or null",
  "headquarters": "city, country or null",
  "size": "employee range or null",
  "key_people": [{"name": "string", "role": "string"}],
  "products": ["product name"],
  "recent_news": [{"title": "string", "summary": "string"}],
  "tech_stack": ["technology"],
  "competitors": ["competitor"],
  "strengths": ["strength"],
  "weaknesses": ["weakness"]
}

Content: ${content}`);

    } else if (action === 'find_contacts') {
      const company = input.company as string ?? '';
      const goal = input.goal as string ?? 'general outreach';

      const prompt = `Identify the best contacts to reach at ${company} for this goal: "${goal}"

Return JSON:
{
  "primary_contact": {
    "role": "exact title",
    "department": "department",
    "reason": "why they own this decision"
  },
  "secondary_contacts": [{"role": "title", "reason": "why relevant"}],
  "avoid": ["roles to skip"],
  "outreach_strategy": "one sentence approach",
  "confidence": 0.0-1.0
}`;

      output = await callClaudeJSON(prompt);

    } else if (action === 'score_lead') {
      const lead = input.lead as Record<string, unknown> ?? input;
      const criteria = input.criteria as string ?? 'general B2B sales qualification';

      const prompt = `Score this lead for: "${criteria}"

Lead data: ${JSON.stringify(lead)}

Return JSON:
{
  "score": 0-100,
  "grade": "A, B, C, D, or F",
  "qualification": "qualified, unqualified, or needs_more_info",
  "strengths": ["why this is a good lead"],
  "weaknesses": ["concerns or gaps"],
  "recommended_action": "one of: reach_out_now, nurture, deprioritize, disqualify",
  "next_step": "specific next action to take",
  "confidence": 0.0-1.0
}`;

      output = await callClaudeJSON(prompt);

    } else if (action === 'draft_proposal') {
      const company = input.company as string ?? '';
      const goal = input.goal as string ?? '';
      const senderCompany = input.sender_company as string ?? '';
      const budget = input.budget as string ?? '';

      const prompt = `Draft a concise business proposal.

For company: ${company}
Goal: ${goal}
${senderCompany ? `From: ${senderCompany}` : ''}
${budget ? `Budget range: ${budget}` : ''}

Return JSON:
{
  "title": "proposal title",
  "executive_summary": "2-3 sentence summary",
  "problem_statement": "the problem being solved",
  "proposed_solution": "the solution offered",
  "key_benefits": ["benefit 1", "benefit 2", "benefit 3"],
  "deliverables": ["deliverable 1", "deliverable 2"],
  "timeline": "suggested timeline",
  "pricing_hint": "pricing approach or null",
  "call_to_action": "next step"
}`;

      output = await callClaudeJSON(prompt);

    } else {
      throw new Error(`Unknown action: ${action}. Available: send_outreach, enrich_lead, research_company, find_contacts, score_lead, draft_proposal`);
    }

    return {
      id,
      action,
      status: 'success',
      output,
      execution_time_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    };

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Action failed';
    return {
      id,
      action,
      status: 'failed',
      output: { error: message },
      execution_time_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  }
}
