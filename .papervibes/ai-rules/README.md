# papervibes-ai-rules

Platform AI rules and skills for Papervibes apps, maintained by the platform team.

This repo serves two purposes simultaneously:

1. **Claude plugin** — installable in Claude Code and Claude Cowork via the plugin system
2. **Git Subtree source** — embedded at `.papervibes/ai-rules/` in every business app repo

---

## Structure

```
.claude/
  settings.json            ← Claude Code project hooks (auto-syncs subtree on session start)
  settings.local.json      ← local overrides (not committed in app repos)
.claude-plugin/
  plugin.json              ← plugin manifest (Claude Code + Cowork install)
skills/
  code-review/
    SKILL.md               ← triggered by Claude Code, Cursor, and Cowork
  security-audit/
    SKILL.md
  refactor/
    SKILL.md
.github/workflows/
  check-ai-rules-freshness.yml   ← reusable workflow (called by app repos)
  update-ai-rules.yml            ← reusable workflow (called by app repos)
AGENTS.md                  ← platform context (Cursor, Windsurf, Copilot — auto-loaded)
CLAUDE.md                  ← platform context for Claude Code (@imports AGENTS.md)
```

---

## Setting Up a New App Repo

> The Papervibes Next.js template already has all of this pre-configured.
> Only follow these steps if you are wiring up a repo from scratch.

### Prerequisites — Windows only

Symlinks are not enabled by default on Windows. Before cloning or running any command below:

1. Enable **Developer Mode** in Windows Settings → System → For developers
2. Run once in your terminal:
```bash
git config --global core.symlinks true
```

If you skip this, symlinks will be created as plain text files and skills will not load.

### 1. Embed the subtree

```bash
git subtree add \
  --prefix=.papervibes/ai-rules \
  git@github.com:papernest/papervibes-ai-rules.git \
  main --squash
```

### 2. Create the root CLAUDE.md

```bash
echo "@.papervibes/ai-rules/CLAUDE.md" > CLAUDE.md
```

This single line tells Claude Code to load the platform context from the subtree.

### 3. Create the symlinks and copy the Claude Code settings

```bash
# Claude Code — project-level skill discovery
mkdir -p .claude
ln -s ../.papervibes/ai-rules/skills .claude/skills

# Claude Code — project hooks (auto-sync subtree on session start)
ln -s ../.papervibes/ai-rules/.claude/settings.json .claude/settings.json

# Cursor — AGENTS framework skill discovery
mkdir -p .agents
ln -s ../.papervibes/ai-rules/skills .agents/skills
```

The `.claude/settings.json` symlink registers a `SessionStart` hook that automatically pulls the latest `papervibes-ai-rules` subtree whenever Claude Code starts or resumes a session in this repo. This ensures the platform rules stay fresh without any manual intervention.

### 4. Add the GitHub Actions workflows

Create two caller files in your app repo. The logic stays centralized in `papervibes-ai-rules` and updates automatically.

**`.github/workflows/check-ai-rules-freshness.yml`**
```yaml
name: Check AI Rules Freshness

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  check-freshness:
    uses: papernest/papervibes-ai-rules/.github/workflows/check-ai-rules-freshness.yml@main
    secrets: inherit
```

**`.github/workflows/update-ai-rules.yml`**
```yaml
name: Update AI Rules

on:
  schedule:
    - cron: '0 8 * * 1'
  workflow_dispatch:

jobs:
  update-ai-rules:
    uses: papernest/papervibes-ai-rules/.github/workflows/update-ai-rules.yml@main
    secrets: inherit
```

- `update-ai-rules` — runs every Monday, pulls the latest subtree, opens a PR
- `check-ai-rules-freshness` — fails the build if the subtree is more than 30 days old

### 5. Commit everything

```bash
git add CLAUDE.md .claude/skills .claude/settings.json .agents/ .github/
git commit -m "chore: integrate papervibes-ai-rules subtree"
```

---

## Pulling Updates (App Repos)

From your app repo root:

```bash
git subtree pull \
  --prefix=.papervibes/ai-rules \
  git@github.com:papernest/ba-papervibes-ai-rules.git \
  main --squash
```

Commit the result on your branch.

---

## Installing the Plugin (Claude Code & Cowork)

The subtree covers skills at the project level. The plugin makes skills available globally across all repos on your machine, and is the only way to load skills in Cowork.

```bash
# Claude Code — machine-level, cross-repo
claude plugin install papernest/papervibes-ai-rules

# Cowork — via UI: Browse Plugins → point to papernest/papervibes-ai-rules
```

---

## Adding a New Skill

1. Create `skills/<skill-name>/SKILL.md`
2. Fill in the frontmatter (`name`, `description`) and write the skill instructions
3. Commit and push — the weekly GitHub Action will propagate it to all app repos automatically
