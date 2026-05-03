import axios from 'axios';

const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY || '';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

export async function analyzeContract(address: string) {
  const [sourceRes, abiRes, txRes] = await Promise.all([
    axios.get(ETHERSCAN_BASE, {
      params: { chainid: 1, module: 'contract', action: 'getsourcecode', address, apikey: ETHERSCAN_KEY },
      timeout: 10000,
    }),
    axios.get(ETHERSCAN_BASE, {
      params: { chainid: 1, module: 'contract', action: 'getabi', address, apikey: ETHERSCAN_KEY },
      timeout: 10000,
    }),
    axios.get(ETHERSCAN_BASE, {
      params: { chainid: 1, module: 'account', action: 'txlist', address, startblock: 0, endblock: 99999999, sort: 'desc', page: 1, offset: 10, apikey: ETHERSCAN_KEY },
      timeout: 10000,
    }),
  ]);

  const source = sourceRes.data.result?.[0] || {};
  const isVerified = source.SourceCode && source.SourceCode !== '';
  const contractName = source.ContractName || 'Unknown';
  const compiler = source.CompilerVersion || 'Unknown';
  const isProxy = source.Proxy === '1';
  const recentTxs = Array.isArray(txRes.data.result) ? txRes.data.result.length : 0;

  const sourceCode = isVerified ? source.SourceCode.slice(0, 8000) : 'Not verified';

  const prompt = `You are a smart contract security auditor. Analyze this Ethereum smart contract and return a JSON risk assessment.

Contract Address: ${address}
Contract Name: ${contractName}
Verified: ${isVerified}
Compiler: ${compiler}
Is Proxy: ${isProxy}
Recent Transactions: ${recentTxs}
Source Code (truncated): ${sourceCode}

Return ONLY valid JSON with this exact structure:
{
  "risk_level": "low|medium|high|critical",
  "risk_score": <0-100>,
  "summary": "<2-3 sentence summary>",
  "flags": ["<flag1>", "<flag2>"],
  "recommendations": ["<rec1>", "<rec2>"],
  "contract_type": "<token|defi|nft|dao|unknown>"
}`;

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
  let analysis = {};
  try { analysis = JSON.parse(cleaned); } catch { analysis = { error: 'Failed to parse AI response', raw }; }

  return {
    address,
    contract_name: contractName,
    verified: isVerified,
    compiler,
    is_proxy: isProxy,
    recent_transactions: recentTxs,
    analysis,
  };
}
