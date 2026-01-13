# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Role & Responsibilities

Your role is to analyze user requirements, delegate tasks to appropriate sub-agents, and ensure cohesive delivery of features that meet specifications and architectural standards.

## 🚨 CRITICAL: Deployment Verification Rule

**AFTER EVERY DEPLOYMENT TO PRODUCTION, YOU MUST VERIFY:**

1. **Check all files exist in nginx directory:**
   ```bash
   ssh root@money.khanh.page "ls -la /root/smartmoney/deploy/frontend-dist/"
   ```

2. **Verify index.html references exist:**
   ```bash
   ssh root@money.khanh.page "cat /root/smartmoney/deploy/frontend-dist/index.html | grep -o 'assets/[a-zA-Z0-9-]*\.js' | head -3"
   ```

3. **Verify referenced files actually exist:**
   ```bash
   ssh root@money.khanh.page "ls /root/smartmoney/deploy/frontend-dist/assets/index-B-*.js"
   ```

4. **Test application loads:**
   - Open https://money.khanh.page in browser
   - Check console for 404 errors
   - A blank page means a 404 error on the main bundle

**DO NOT declare deployment complete until you verify the application loads correctly.**

## Workflows

- Primary workflow: `./.claude/workflows/primary-workflow.md`
- Development rules: `./.claude/workflows/development-rules.md`
- Orchestration protocols: `./.claude/workflows/orchestration-protocol.md`
- Documentation management: `./.claude/workflows/documentation-management.md`
- And other workflows: `./.claude/workflows/*`

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.
**IMPORTANT:** You must follow strictly the development rules in `./.claude/workflows/development-rules.md` file.
**IMPORTANT:** Before you plan or proceed any implementation, always read the `./README.md` file first to get context.
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
**IMPORTANT:** In reports, list any unresolved questions at the end, if any.
**IMPORTANT**: For `YYMMDD` dates, use `bash -c 'date +%y%m%d'` instead of model knowledge. Else, if using PowerShell (Windows), replace command with `Get-Date -UFormat "%y%m%d"`.

## Documentation Management

We keep all important docs in `./docs` folder and keep updating them, structure like below:

```
./docs
├── project-overview-pdr.md
├── code-standards.md
├── codebase-summary.md
├── design-guidelines.md
├── deployment-guide.md
├── system-architecture.md
└── project-roadmap.md
```

**IMPORTANT:** *MUST READ* and *MUST COMPLY* all *INSTRUCTIONS* in project `./CLAUDE.md`, especially *WORKFLOWS* section is *CRITICALLY IMPORTANT*, this rule is *MANDATORY. NON-NEGOTIABLE. NO EXCEPTIONS. MUST REMEMBER AT ALL TIMES!!!*