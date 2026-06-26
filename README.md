# Leads AI Calling Panel

A React web panel to upload a list of leads (CSV or Excel), validate the data,
and run **outbound AI phone calls** through [Vapi.ai](https://vapi.ai).

## What it does

1. **Settings** — Connect your Vapi private API key (stored in your browser).
2. **Assistant** — Create or pick the AI voice agent that speaks on calls.
3. **Phone Number** — Provision a free US number (or use an imported one).
4. **Leads** — Upload a CSV/Excel file in the required format. Rows are parsed,
   phone numbers normalized to E.164, and validated. Fix bad rows inline.
5. **Campaign** — Place calls to all valid leads with adjustable concurrency and
   pacing, then watch live status (queued → ringing → in-progress → ended),
   outcomes, and cost.

## ⚠️ Security note

This is a **frontend-only** app, so your private Vapi API key lives in the
browser (localStorage) and is visible to anyone with access to the page or its
dev tools. This was an accepted tradeoff for an internal/demo tool. **Do not
deploy this publicly with a real key.** For production, move call creation
(`POST /call`) behind a small backend that holds the key.

## Required leads file format

Headers are matched case-insensitively. Download a ready-made template from the
**Leads** page.

| Column    | Required | Description                                   | Example          |
| --------- | -------- | --------------------------------------------- | ---------------- |
| `name`    | yes      | Person to call. Used as `{{name}}` in prompt. | `Jane Cooper`    |
| `phone`   | yes      | Best in E.164, e.g. `+14155552671`.           | `+14155552671`   |
| `email`   | no       | Optional. Available as `{{email}}`.           | `jane@acme.com`  |
| `company` | no       | Optional. Available as `{{company}}`.         | `Acme Inc`       |

Any **extra columns** (e.g. `city`, `plan`) are preserved and passed to the
assistant as variables you can reference in the prompt with `{{column_name}}`.

> Tip: If your numbers don't start with `+`, set a **default country code** in
> Settings (e.g. `+1`, `+44`, `+91`) and it will be applied automatically.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

### Build for production

```bash
npm run build
npm run preview
```

## Where to get your Vapi credentials

- **API key:** Vapi Dashboard → Organization → API Keys (use the *private* key).
- **Assistant & phone number:** This panel can create both for you, or you can
  create them in the [Vapi Dashboard](https://dashboard.vapi.ai) and they'll
  appear in the lists here.

## Tech stack

- React 18 + Vite
- React Router
- Zustand (state, persisted to localStorage)
- PapaParse (CSV) + SheetJS/xlsx (Excel)
- Tailwind CSS
- Vapi REST API (`https://api.vapi.ai`)

## Project structure

```
src/
  lib/
    schema.js      # lead column definitions + template
    phone.js       # E.164 normalization/validation
    parseFile.js   # CSV/Excel parsing -> validated lead rows
    vapi.js        # Vapi REST client
    useVapi.js     # hook returning a client bound to the stored key
  store/
    useStore.js    # global zustand store (persisted)
  components/       # Layout, FileDropzone, StatusBadge, shared UI
  pages/            # Dashboard, Settings, Assistants, PhoneNumbers, Leads, Campaign
```
