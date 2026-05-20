# Unified Multi-Provider Agent Completion API

One endpoint. Premium frontier models. Orbis A+.

## Live endpoint
POST https://orbis-apis.onrender.com/api/unified-ai/v1/chat/completions

## Model aliases
| Alias           | Resolves to               | Cost tier |
|-----------------|---------------------------|-----------|
| auto            | gemini-flash              | low       |
| cheapest        | lowest-cost healthy model | low       |
| fastest         | gemini-flash              | low       |
| highest_quality | claude-opus or grok       | premium   |
| claude-opus     | claude-opus-4.7           | premium   |
| claude-sonnet   | claude-4.5-sonnet         | high      |
| gemini-pro      | gemini-2.5-pro            | high      |
| gemini-flash    | gemini-2.5-flash          | low       |
| gpt-premium     | gpt-4.1                   | high      |
| gpt-mini        | gpt-4o-mini               | low       |
| grok-premium    | grok-4.1-fast             | premium   |
| deepseek        | deepseek-chat             | low       |
| mistral-large   | mistral-large             | medium    |

## Setup
cp .env.example .env
# Add OPENROUTER_API_KEY — that's all you need
npm run dev

## Curl examples

# Auto routing
curl -X POST https://orbis-apis.onrender.com/api/unified-ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"auto","messages":[{"role":"user","content":"Hello!"}]}'

# Claude Opus (premium)
curl -X POST https://orbis-apis.onrender.com/api/unified-ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-opus","messages":[{"role":"user","content":"Explain quantum entanglement."}]}'

# Gemini Pro
curl -X POST https://orbis-apis.onrender.com/api/unified-ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini-pro","messages":[{"role":"user","content":"Write a business plan outline."}]}'

# GPT-4.1 with JSON mode
curl -X POST https://orbis-apis.onrender.com/api/unified-ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-premium","messages":[{"role":"user","content":"Return capital of France as JSON key city"}],"json_mode":true}'

# Grok premium
curl -X POST https://orbis-apis.onrender.com/api/unified-ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"grok-premium","messages":[{"role":"user","content":"What is 99*99?"}]}'

# Cheapest routing
curl -X POST https://orbis-apis.onrender.com/api/unified-ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"routing_strategy":"cheapest","messages":[{"role":"user","content":"Summarize AI in 2 sentences."}]}'

# Highest quality routing
curl -X POST https://orbis-apis.onrender.com/api/unified-ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"routing_strategy":"highest_quality","messages":[{"role":"user","content":"Analyze this for logical fallacies: All cats are animals. Fluffy is an animal. Therefore Fluffy is a cat."}]}'
