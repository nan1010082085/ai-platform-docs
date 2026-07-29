# Security Best Practices

This guide covers security best practices for developers working with Schema Platform AI.

---

## 🔐 API Key & Secret Management

### ❌ NEVER Do This

```bash
# NEVER commit real API keys to version control
git add .env  # This file should be in .gitignore!

# NEVER hardcode secrets in source code
const API_KEY = "sk-1234567890abcdef"  # NEVER!

# NEVER share secrets in chat, email, or documentation
"Here's my API key: sk-..."  # NEVER!
```

### ✅ ALWAYS Do This

```bash
# ALWAYS use environment variables
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}

# ALWAYS use .env files (and add them to .gitignore)
echo ".env" >> .gitignore

# ALWAYS use placeholder examples in documentation
DEEPSEEK_API_KEY=<your-deepseek-api-key>
```

---

## 📝 Documentation Guidelines

### When Writing Documentation

**❌ Wrong:**
```env
DEEPSEEK_API_KEY=sk-1234567890abcdef
JWT_SECRET=my-super-secret-key-123
MONGODB_URI=mongodb://admin:password123@localhost:27017/db
```

**✅ Correct:**
```env
DEEPSEEK_API_KEY=<your-deepseek-api-key>
JWT_SECRET=<generate-a-random-32-byte-hex-string>
MONGODB_URI=mongodb://<username>:<password>@<host>:27017/<database>
```

### Placeholder Format

Use this format for placeholders:
- `<your-api-key>` - For API keys
- `<generate-a-random-string>` - For secrets that need to be generated
- `<your-value>` - For other configuration values

Always add a security warning after code blocks containing sensitive configurations:

```env
DEEPSEEK_API_KEY=<your-api-key>
```

> ⚠️ **Security Warning**: Never commit real API keys to version control.

---

## 🛡️ Environment Variables

### Development

```bash
# .env.development (local only, in .gitignore)
DEEPSEEK_API_KEY=sk-dev-key-here
JWT_SECRET=dev-secret-key
MONGODB_URI=mongodb://localhost:27017/dev
```

### Production

```bash
# Use secrets management tools
# - Docker Secrets
# - Kubernetes Secrets
# - AWS Secrets Manager
# - HashiCorp Vault

# Or environment variables (injected at runtime)
export DEEPSEEK_API_KEY="sk-prod-key-here"
export JWT_SECRET="prod-secret-key"
```

### .gitignore Rules

Always include these in your `.gitignore`:

```gitignore
# Environment variables
.env
.env.local
.env.*.local

# Secrets
*.pem
*.key
*.cert
credentials.json
```

---

## 🔍 Code Review Checklist

When reviewing code, check for:

- [ ] No hardcoded API keys or secrets
- [ ] No credentials in comments
- [ ] No secrets in log statements
- [ ] Environment variables used for all sensitive config
- [ ] `.env` files not committed to version control
- [ ] Placeholder format used in documentation
- [ ] Security warnings added where appropriate

---

## 🚨 If You Accidentally Commit a Secret

### Immediate Actions

1. **Rotate the secret immediately**
   - Generate a new API key
   - Revoke the compromised one
   - Update all systems using the old key

2. **Remove from Git history**
   ```bash
   # Using BFG Repo-Cleaner (recommended)
   bfg --delete-files .env
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   
   # Or using git filter-branch (slower)
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch .env' \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **Force push to remote**
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```

4. **Notify your team**
   - Inform all team members
   - Document the incident
   - Review access logs

---

## 📚 Resources

### Tools for Secret Detection

- **git-secrets** - Prevents committing secrets
  ```bash
  # Install
  brew install git-secrets
  
  # Setup for repo
  git secrets --install
  git secrets --register-aws  # If using AWS
  ```

- **truffleHog** - Scans git history for secrets
  ```bash
  pip install trufflehog
  trufflehog git file://.
  ```

- **detect-secrets** - Yelp's secret detection tool
  ```bash
  pip install detect-secrets
  detect-secrets scan > .secrets.baseline
  ```

### Pre-commit Hooks

Add to `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

---

## 🎯 Quick Reference

| Scenario | Action |
|----------|--------|
| Writing docs | Use `<placeholder>` format |
| Sharing examples | Use dummy values like `sk-your-key-here` |
| Storing secrets | Use `.env` files (in `.gitignore`) |
| Production | Use secrets management tools |
| Code review | Check for hardcoded secrets |
| Accidentally committed | Rotate immediately + clean history |

---

**Remember**: When in doubt, ask the security team. It's better to be safe than sorry!

---

**Last Updated**: 2026-07-23
