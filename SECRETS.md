# Managing secrets for your ba-vibe app

> **Status: rolling out (DEVOPS-5488).** If anything here doesn't work yet, the platform piece
> may still be landing — ask DevOps. Never put a real secret value anywhere except via the
> commands below.

Your app receives two sets of environment variables at runtime. **You only manage one of them.**

| Secret | Who owns it | What's in it | Can you read it? |
|--------|-------------|--------------|------------------|
| **platform** | DevOps | `DATABASE_URL`, RDS creds, platform-injected values | ❌ No — you can't see or change it |
| **app** | **You** | your own keys: Clerk, Stripe, API keys, … | ✏️ You can **add/update/remove**, but not read stored values |

Both arrive in your app as environment variables automatically.

---

## Add, update, or remove a secret

From your app repo:

```bash
./secret set STRIPE_SECRET_KEY      # add or update (asks for the value, typed hidden)
./secret remove STRIPE_SECRET_KEY   # delete it
./secret list                       # see which secrets are set (names only)
```

**Or just ask your AI assistant** — e.g. *"set a secret `STRIPE_SECRET_KEY`"* or *"remove the
Stripe secret"* — and it runs the same commands. That's the whole thing.

You never handle an encryption key, and **no secret is ever stored in plain text**. Your app
picks up the change automatically in ~1–2 minutes.

> First run may auto-install one small tool (`age`) via Homebrew. Nothing else to set up.

### What happens under the hood

Each secret is encrypted on its own — with a **public** key you already have — into
`infra_platform/secrets/<KEY>.age`, and committed. Adding/updating/removing never needs to
*decrypt* anything, so **you never need a private key or AWS access**. On push:

```
./secret (or the AI)  →  encrypts infra_platform/secrets/<KEY>.age  →  push
   →  the PLATFORM (the only holder of the private key) decrypts in CI
   →  AWS Secrets Manager (ba-vibe/<app>/app)
   →  External Secrets Operator (~1 min)  →  your pods restart with the new env var
```

---

## Can I read my secrets back?

**No — and that's on purpose.** You hold only the *public* (write) key, so you can add or
replace a value but not read what's stored. `./secret list` shows the **names**, not values.
If you've lost a value, set it again. (Your *running app* can of course read its own env vars —
that's how it uses them — but nobody can pull the stored values out of the platform.)

You also can't see or touch **other apps'** secrets, or the **platform** secret (DB creds).

---

## Rules & tips

- **Only `./secret` (or the AI) writes secrets.** Never paste a secret value into source code,
  `platform.yaml`, logs, Slack, or a ticket.
- **Names are env var names.** `./secret set STRIPE_SECRET_KEY` → your app sees
  `process.env.STRIPE_SECRET_KEY`. Match what your code expects (see your `.env.example`).
- **Non-secret config** (ports, feature flags, public URLs) → `infra_platform/platform.yaml`,
  not here.
- **You can't set `DATABASE_URL`/DB creds** — the platform injects those automatically when your
  app has a database.
- **Rotating a key?** `./secret set KEY` again with the new value.
- **Really stuck** (no terminal at all)? As a last resort ask DevOps — hand the value over
  securely (never in Slack).

## Troubleshooting

- *"Missing .secret-recipient"* → it's created automatically on your app's **first deploy** (CI
  generates the key and commits it). If you haven't deployed yet, push once and `git pull`.
- *Pushed but the value didn't take* → check your app's CI ran; give it ~1–2 minutes; confirm the
  key name matches what your code reads with `./secret list`.
- *App still errors on a missing var* → it isn't set (`./secret list`), or it's non-secret config
  that belongs in `platform.yaml`.
