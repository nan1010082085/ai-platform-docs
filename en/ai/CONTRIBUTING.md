# Documentation Maintenance Procedure

> **Version**: v1 (2026-07-16)
> **Goal**: ensure docs stay in sync with code and maintain consistency.

---

## 1. Doc Update Triggers

| Change type | Docs to update | Owner |
|----------|-------------|--------|
| **New feature** | README.md, the feature doc, CHANGELOG | Developer |
| **API change** | api-reference.md, sdk.md | Developer |
| **Architecture adjustment** | architecture.md, related design docs | Architect |
| **Config change** | environment-variables.md, plugin.md | Developer |
| **Bug fix** | CHANGELOG (if user-facing) | Developer |
| **Dependency upgrade** | README.md (if it affects install) | Developer |

---

## 2. Doc Directory Structure

```
ai/docs/
├── README.md                    # doc index & quick start
├── architecture.md              # architecture overview
├── agent.md                     # Chat Agent system
├── agent-workflow.md            # workflow orchestration
├── tool.md                      # tool system
├── mcp.md                       # MCP protocol
├── events.md                    # event protocol
├── ai-shared.md                 # shared package API
├── plugin.md                    # plugin center
├── sdk.md                       # SDK & integration
├── environment-variables.md     # env var list
├── platform.md                  # platform positioning
├── design/                      # design docs
│   ├── README.md
│   ├── chat.md
│   ├── workflows.md
│   ├── rag.md
│   └── runtime.md
├── product/                     # product planning (internal)
│   ├── backlog.md
│   └── workflow-terminology.md
└── extend/                      # extension guides
    ├── skill-author-guide.md
    ├── workflow-template-rfc.md
    └── workflow-variables.md
```

---

## 3. Update Flow

### 3.1 Developer

1. **On code change**: update the corresponding docs in sync
2. **During PR review**: check whether docs were updated
3. **Before merge**: ensure docs match code

### 3.2 Architect

1. **On architecture change**: update architecture.md and related design docs
2. **Periodic review**: review doc completeness quarterly
3. **Technical decisions**: record in ADRs (Architecture Decision Records)

### 3.3 Product Manager

1. **On feature planning**: update planning docs under product/
2. **On requirement change**: update the corresponding feature docs
3. **Before release**: review user-facing docs

---

## 4. Doc Quality Standards

### 4.1 Format

- Use Markdown
- Clear heading hierarchy (H1 -> H2 -> H3)
- Syntax-highlighted code blocks
- Aligned tables
- Accessible links

### 4.2 Content

- **Accuracy**: consistent with code
- **Completeness**: cover all features
- **Clarity**: concise language
- **Examples**: provide code examples
- **Timeliness**: mark the last-updated time

### 4.3 Naming

- File names: lowercase + hyphens (`agent-workflow.md`)
- Headings: title case (`## Agent Workflow`)
- Code: use backticks (`pluginExpert`)

---

## 5. Doc Review Checklist

### During PR Review

- [ ] New features have corresponding docs
- [ ] API changes update api-reference
- [ ] Config changes update environment-variables
- [ ] Example code is runnable
- [ ] Links are valid

### Before Release

- [ ] README.md version updated
- [ ] CHANGELOG records all changes
- [ ] Quick start is executable
- [ ] Doc directory is complete

---

## 6. Doc Tools

### 6.1 Link Check

```bash
# Check Markdown links
find ai/docs -name "*.md" -exec grep -H "\[.*\](.*)" {} \;
```

### 6.2 Spell Check

```bash
# Using cspell
npx cspell "ai/docs/**/*.md"
```

### 6.3 Format Check

```bash
# Using markdownlint
npx markdownlint "ai/docs/**/*.md"
```

---

## 7. Doc Version Management

### 7.1 Version Numbers

- **Major**: major architecture changes
- **Minor**: new features
- **Patch**: bug fixes, doc corrections

### 7.2 Change Records

Add version info at the top of the doc:

```markdown
> **Version**: v2.1 (2026-07-16)
> **Change**: Added MCP Server config description
```

---

## 8. FAQ

### Q: What if docs are inconsistent with code?

A: Code is the source of truth; update the docs. If the code is wrong, fix the code first, then update the docs.

### Q: How to handle deprecated features?

A: Mark them `**Deprecated**` in the docs, explain the alternative, and record in CHANGELOG.

### Q: How to split external docs (README.md) and internal docs (docs/)?

A: README.md is user-facing (quick start and basic usage); docs/ is developer-facing (detailed technical docs).

---

## 9. Doc Maintenance Checklist

### Monthly

- [ ] Link validity
- [ ] Example code runnability
- [ ] Env var completeness
- [ ] API doc accuracy

### Quarterly

- [ ] Architecture doc vs code consistency
- [ ] Deprecated feature cleanup
- [ ] Doc directory structure reasonableness
- [ ] Doc coverage

---

## 10. Contact

- **Doc issues**: GitHub Issues
- **Technical discussion**: GitHub Discussions
- **Urgent issues**: contact maintainers

---

**Last updated**: 2026-07-16
