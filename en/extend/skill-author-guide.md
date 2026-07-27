---
title: Skill Author Guide
---

# Skill Author Guide

Skills are reusable prompt fragments that enhance agent behavior.

## What is a Skill?

A Skill is a JSON configuration that defines:
- **Name**: Unique identifier
- **Prompt**: System prompt fragment
- **Tools**: Required tools
- **Routing**: When to activate this skill

## Creating a Skill

### 1. Define the Skill

```json
{
  "name": "contract-analyst",
  "description": "Analyze contracts for key terms and risks",
  "prompt": "You are a contract analyst. Extract key terms, dates, and risk factors.",
  "tools": ["document-parse"],
  "routing": {
    "keywords": ["contract", "agreement", "terms"],
    "priority": 5
  }
}
```

### 2. Register the Skill

Place the JSON file in `server/config/plugins/local/skills/` and restart the server, or use the Plugin Center UI.

### 3. Test the Skill

Use the **Routing Debug** page (`/debug/routing`) to test if your skill activates for specific messages.

## Skill Assembly

Skills are assembled in priority order. The highest priority skill that matches the routing keywords is used.

## Localization

Skills support multiple languages:

```json
{
  "name": "contract-analyst",
  "locale": "zh-CN",
  "prompt": "你是合同分析专家..."
}
```

Create separate files for each locale.
