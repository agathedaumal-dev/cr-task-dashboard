# 🚀 Papernest BA Vibe Next.js Template

![Next.js](https://img.shields.io/badge/Next.js-15+-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)
![Node](https://img.shields.io/badge/Node-v22-green?style=flat&logo=node.js)
![Docker](https://img.shields.io/badge/Docker-Standalone-blue?style=flat&logo=docker)

A secure, production-ready boilerplate optimized for rapid deployment of internal B2B tools at Papernest. It strictly enforces "Security by Design," leveraging Edge authorization, Server Actions, and a highly optimized Docker standalone build for AWS ECS.

**Target Audience:** Internal stakeholders and developers building B2B tooling.

---

## 🛠 Tech Stack

* **Framework:** Next.js (App Router)
* **Language:** TypeScript
* **Authentication:** Clerk (Edge Proxy + Server Components)
* **Styling & UI:** Tailwind CSS v4, Shadcn/UI, Lucide React
* **Validation:** Zod (Strict schema validation for all Server Actions)
* **Infrastructure:** Docker (Multi-stage standalone), GitHub Actions CI/CD for AWS ECS

---

## 🤖 AI Rules & Skills

This template is pre-configured with the Papervibes platform AI rules at `.papervibes/ai-rules/`.
Platform context and skills load automatically in Claude Code, Cursor, Windsurf, and Copilot.

**Install the plugin** to use skills globally across repos and in Claude Cowork (via CLI or Cowork's Browse Plugins UI):
```bash
claude plugin install papernest/papervibes-ai-rules
```

> ⚠️ **Windows:** Symlinks require setup before cloning.
> 1. Go to **Settings → System → For developers** and enable **Developer Mode**
> 2. Run `git config --global core.symlinks true`

---

## 🚦 Getting Started (Under 5 Minutes)

### 1. Prerequisites
Ensure you are using **Node.js v22**. We use `.nvmrc` to enforce this.
```bash
nvm use

```

### 2. Installation

Clone the template and install dependencies.

```bash
npm install

```

### 3. Environment Configuration

Copy the environment template. **Do not commit `.env.local` to version control.**

```bash
cp .env.example .env.local

```

#### Key Configuration Variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Publishable Key from the shared papernest Clerk instance. |
| `CLERK_JWT_KEY` | Public RSA key for local JWT verification (no Backend API call). Request from the platform team. |
| `CLERK_SECRET_KEY` | **Must be kept as the placeholder value `INTENTIONALLY_INVALID_DO_NOT_REPLACE`.** See security note below. |
| `APP_IDENTIFIER` | Unique internal app string (e.g., `B2B_ops_dashboard`). |

*🔒 **Security Note:** The `proxy.ts` edge boundary checks if the authenticated user's `sessionClaims.metadata` contains this specific `APP_IDENTIFIER`. If missing, they are redirected to `/unauthorized`.*

### 4. Application Identity (Public Metadata)

Update `lib/app-config.ts` with your specific application details (App Name, Support Email, Owner Team). This file drives the UI text, headers, and metadata. *Do not put infrastructure secrets here.*

### 5. Run Locally

**Standard Development:**

```bash
npm run dev

```

**Production Docker Simulation:**
Test the exact `standalone` build that will run in AWS ECS.

```bash
docker-compose up --build

```

---

## 🐳 Deployment Architecture (AWS ECS)

This template is configured for highly secure, containerized deployments on AWS Elastic Container Service (ECS).

### 1. Activating the CI/CD Pipeline

By default, the automated GitHub Actions pipeline is **disabled** to prevent accidental pushes. To activate:

1. Navigate to `.github/workflows/` and rename `deploy_template.yml` to `deploy.yml`.
2. Open `deploy.yml` and update the `env` block at the top for your specific app:
```yaml
env:
  AWS_DEFAULT_REGION: eu-west-3
  CI_BUILD_IMAGE:
  APP_NAME: your-app-name          # <-- UPDATE THIS
  ECR_REPOSITORY: cicd-your-app    # <-- UPDATE THIS
  PROD_ECR_REPOSITORY: your-app-prod # <-- UPDATE THIS
  ECS_CLUSTER: your-app-prod       # <-- UPDATE THIS
  ECS_CONTAINER_NAME: web          # <-- UPDATE THIS

```


### 2. Secret Management (Security by Design)

We enforce a strict boundary between build-time injection and runtime secrets:

* **Build-Time Variables (`NEXT_PUBLIC_*`)**: Add these to your GitHub Repository Secrets. They are injected safely as `build-args` during the `docker build` phase.
* **Runtime Secrets (`CLERK_JWT_KEY`, Database URIs)**: **NEVER** inject these via GitHub Actions or Docker build args. Store them in AWS Secrets Manager and map them directly to your ECS Task Definition. The container will securely load them at startup. Note: `CLERK_SECRET_KEY` stays as the invalid placeholder — it should never be stored as a real secret.

---

## 🏗 Project Architecture & Rules

### 📂 Directory Structure

| Path | Purpose | Strict Rule |
| --- | --- | --- |
| `app/` | Routing logic | **NEVER** define UI components here. Import from `components/`. |
| `app/actions/` | Server Actions | Must use **Zod** validation and return standardized objects. |
| `app/api/` | Route Handlers | Use **ONLY** for Webhooks or external-facing APIs. |
| `components/ui/` | Primitive UI | Reusable atoms (Buttons, Inputs) from Shadcn. |
| `components/features/` | Business Logic | Domain-specific components (e.g., `ClaimsTable`). |
| `proxy.ts` | Edge Security | **DO NOT** create a `middleware.ts` file. |

### ⚠️ Critical Rule: Proxy over Middleware

**Next.js Middleware is deprecated in this template.** We utilize `proxy.ts` at the root to handle request interception and Clerk security boundaries.

* **Why:** "Proxy" correctly defines the network boundary behavior.
* **Rule:** Do not delete or rename `proxy.ts`. All global routing security logic must live here.

### 📜 Coding Standards

1. **No `<img>` Tags:** Always use Next.js `<Image />` for performance. Whitelist external URLs in `next.config.js`.
2. **Named Exports Only:** Use `export function ComponentName() {}`. Default exports are banned in `components/` and `lib/` to facilitate refactoring. *Exceptions: Next.js routing files (`page.tsx`, `layout.tsx`).*
3. **Icons & Toasts:** Use `lucide-react` for iconography and `sonner` (`toast.success()`) for user notifications.

### Managing Role-Based Access Control (RBAC) 
[Notion doc](https://www.notion.so/papernest/How-to-use-RBAC-template-3251fb6f60ef800e95e1eb6431017319)

---

## 🤝 Contribution Guidelines

1. **Branching:** Use `feature/[feature-name]` or `fix/[bug-name]`.
2. **Quality Gates:** Run `npm run lint` and `npx tsc --noEmit` before opening a PR.
3. **Security:** All PRs modifying `proxy.ts`, Clerk configurations, or Server Action validation schemas require a dedicated security review.