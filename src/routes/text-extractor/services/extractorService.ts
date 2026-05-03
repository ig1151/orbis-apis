import axios from 'axios';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

export async function extractStructuredData(text: string, schema: string) {
  const prompt = `You are a data extraction expert. Extract structured data from the following text according to the requested schema.

Text:
${text}

Requested extraction schema: ${schema}

Return ONLY valid JSON with the extracted data matching the schema. If a field cannot be found, use null.`;

  const aiRes = await axios.post(`${OPENROUTER_BASE}/chat/completions`, {
    model: 'anthropic/claude-sonnet-4-5',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  }, {
    headers: { Authorization: `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  const raw = aiRes.data.choices?.[0]?.message?.content || '{}';
  const cleaned = raw.replace(/```json|```/g, '').trim();
  let extracted = {};
  try { extracted = JSON.parse(cleaned); } catch { extracted = { error: 'Failed to parse', raw }; }

  return {
    schema,
    extracted,
    char_count: text.length,
    processed_at: new Date().toISOString(),
  };
}

export async function extractEntities(text: string) {
  const prompt = `Extract all named entities from the following text.

Text:
${text}

Return ONLY valid JSON with this exact structure:
{
  "people": ["<name1>", "<name2>"],
  "organizations": ["<org1>", "<org2>"],
  "locations": ["<loc1>", "<loc2>"],
  "dates": ["<date1>", "<date2>"],
  "amounts": ["<amount1>", "<amount2>"],
  "other": ["<entity1>", "<entity2>"]
}`;

  const aiRes = await axios.post(`${OPENROUTER_BASE}/chat/completions`, {
    model: 'anthropic/claude-sonnet-4-5',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  }, {
    headers: { Authorization: `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  const raw = aiRes.data.choices?.[0]?.message?.content || '{}';
  const cleaned = raw.replace(/```json|```/g, '').trim();
  let entities = {};
  try { entities = JSON.parse(cleaned); } catch { entities = { error: 'Failed to parse', raw }; }

  return {
    entities,
    char_count: text.length,
    processed_at: new Date().toISOString(),
  };
}
