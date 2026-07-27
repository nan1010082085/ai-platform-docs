---
title: Custom Models
---

# Custom Models

Connect any OpenAI-compatible LLM provider to Schema Platform.

## Adding a Provider

1. Go to **Settings → Models** in the AI interface
2. Click **Add Provider**
3. Fill in:
   - **Name**: Display name (e.g., "My Ollama")
   - **Type**: `custom` for OpenAI-compatible APIs
   - **Base URL**: Your API endpoint (e.g., `http://localhost:11434/v1`)
   - **API Key**: Your API key (or any string for local models)

## Supported Providers

| Provider | Base URL | Notes |
|----------|----------|-------|
| Ollama | `http://localhost:11434/v1` | Local, no API key needed |
| vLLM | `http://localhost:8000/v1` | Local inference |
| DeepSeek | `https://api.deepseek.com/v1` | Cloud API |
| OpenAI | `https://api.openai.com/v1` | Cloud API |
| Anthropic | Via proxy | Needs OpenAI-compatible proxy |

## Environment Variables

```env
# DeepSeek
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# OpenAI
OPENAI_API_KEY=sk-xxx

# Custom
DEFAULT_LLM=my-provider
```

## Model Capabilities

Each model can declare capabilities:
- **chat**: Text generation (default)
- **vision**: Image understanding
- **embedding**: Text embedding

Configure in **Settings → Models → Edit → Capabilities**.
