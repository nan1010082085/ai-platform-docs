---
title: Model Architecture
---

# Model Architecture

Schema Platform uses a **Provider/Model two-tier structure** for flexible LLM management.

## Provider Layer

A Provider represents an LLM service endpoint:
- **Name**: Display name (e.g., "DeepSeek", "OpenAI")
- **Type**: Provider type (deepseek, openai, anthropic, custom)
- **Base URL**: API endpoint
- **API Key**: Authentication key

## Model Layer

Models belong to a Provider:
- **Model ID**: API model identifier (e.g., `deepseek-chat`)
- **Capabilities**: chat, vision, embedding
- **Parameters**: temperature, maxTokens, topP

## Priority Resolution

When the system needs an LLM:

1. **User config** (highest priority) — User's preferred model
2. **DB Provider+Model** — Stored in MongoDB
3. **LLMManager** — Built-in provider registry
4. **Environment variables** (lowest priority) — `DEEPSEEK_API_KEY`, etc.

## BYOK (Bring Your Own Key)

Users can configure their own API keys in **Settings → Models**. Keys are stored encrypted in MongoDB and scoped to the user's tenant.

## OpenAI-Compatible Providers

Any provider with an OpenAI-compatible API can be added as `type: custom`:

```
Base URL: https://your-provider.com/v1
API Key: your-key
Model ID: your-model-id
```

This covers Ollama, vLLM, DeepSeek, Moonshot, and many others.
