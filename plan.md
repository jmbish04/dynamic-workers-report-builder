# Demo App Build Plan
## Dynamic Workers Developer AI Report Builder

A demo app for the "Run Code That Writes Itself" YouTube video. The app lets a user
type a natural language prompt, uses Workers AI to generate a JavaScript Worker,
runs it as a Dynamic Worker with a controlled data binding, renders a styled HTML
report, and lets the user save, browse, and kill live report Workers.

---

## Agent Skills

When building this app with an AI coding agent, install the Cloudflare skills from
**https://github.com/cloudflare/skills** first. These skills give the agent up-to-date
knowledge of Cloudflare APIs, config shapes, and best practices — critical for a project
using several cutting-edge primitives at once.

### Install (OpenCode)

```bash
npx skills add https://github.com/cloudflare/skills
```

Or clone and copy manually into `~/.config/opencode/skills/`.

### Relevant Skills for This Build

| Skill | Why it matters here |
|---|---|
| `cloudflare` | Core platform skill — Workers, KV, Workers AI, Durable Objects, wrangler config. Load first for any task. |
| `durable-objects` | `LogSession` DO for real-time log bridging between Tail Worker and fetch handler. Covers SQLite storage, RPC methods, `blockConcurrencyWhile`. |
| `wrangler` | Up-to-date `wrangler.jsonc` config syntax for `worker_loaders`, `ai`, `durable_objects`, `kv_namespaces`, `observability`. Run `wrangler types` after any config change. |
| `sandbox-sdk` | Conceptual reference — Dynamic Workers and the Sandbox SDK solve adjacent problems (secure code execution). Understanding both helps clarify when to use which primitive. |

### Key Things the Skills Prevent Getting Wrong

- `worker_loaders` binding config syntax (not in older pre-training data)
- `new_sqlite_classes` vs `new_classes` in Durable Object migrations
- `compatibility_date` — wrangler skill enforces using a recent date
- `ctx.exports.ClassName()` pattern for referencing exported WorkerEntrypoints
- `wrangler types` requirement after changing bindings

---

## What the Demo Needs to Show (from the script)

1. Type a prompt → Workers AI writes JS code → Dynamic Worker runs it → HTML report appears
2. Run without a binding → fails with a clear error
3. Attach a `getAIData` binding → re-run → report renders with real data
4. Save the report → it gets a URL and appears in an "Active Reports" list
5. Kill a report → it disappears from the list, Worker is torn down
6. Show cold vs. warm start timing

---

## Architecture

```
Browser UI (React + Vite)
    │
    ▼
Loader Worker  ←─── wrangler.jsonc entry point
    │
    ├── Workers AI binding (AI)           → generates JS code from prompt
    ├── Dynamic Worker Loader binding     → LOADER (worker_loaders)
    ├── Durable Object binding            → LogSession (real-time log capture)
    ├── KV binding                        → REPORTS (stores saved report metadata)
    └── DataService WorkerEntrypoint      → wraps AI survey dataset, exposed as RPC binding
            │
            └── getAIData(filters?)      → returns developer AI survey records
                                           (credentials never cross to Dynamic Worker)

Dynamic Worker  (composed at runtime)
    ├── receives: getAIData RPC stub as DATA binding
    ├── globalOutbound: null              → no network access
    ├── tails: [DynamicWorkerTail]        → log capture
    └── returns: HTML response (styled report)

DynamicWorkerTail WorkerEntrypoint
    └── tail(events) → writes to LogSession Durable Object

LogSession Durable Object
    └── buffers logs → loader Worker reads and streams back to browser
```

---

## Cloudflare Primitives Used

| Primitive | Purpose |
|---|---|
| **Dynamic Workers** (`worker_loaders`) | Run AI-generated code at runtime |
| **Workers AI** (`@cf/meta/llama-3.1-8b-instruct` or similar) | Generate JS report code from prompt |
| **Workers RPC / WorkerEntrypoint** | `DataService` binding — wraps AI survey data safely |
| **Durable Objects** | `LogSession` — bridge between Tail Worker and response |
| **KV** | Store saved report metadata (worker ID, prompt, URL, created date) |
| **Tail Workers** | `DynamicWorkerTail` — capture Dynamic Worker logs in real time |

---

## Data

Real data from the **Stack Overflow Developer Survey** (2024 and 2025), licensed
under the Open Database License (ODbL). Country-level AI adoption and sentiment
data extracted from 65,437 responses (2024) and ~49,000 responses (2025) across
185 countries. Only countries with n ≥ 100 respondents are included.

**Source:** https://survey.stackoverflow.co/
**License:** ODbL — https://opendatacommons.org/licenses/odbl/

```typescript
type DeveloperAIRecord = {
  country: string;
  region: string;        // "Americas" | "Europe" | "Asia-Pacific" | "Africa & Middle East"
  respondents: number;   // survey sample size for this country/year
  aiUsagePct: number;    // % currently using AI tools
  favorablePct: number;  // % favorable or very favorable toward AI tools
  skepticalPct: number;  // % unfavorable or very unfavorable
  trustPct: number;      // % who trust AI output accuracy (somewhat or highly)
  year: 2024 | 2025;
};
```

`DataService` exposes one method:

```typescript
export class DataService extends WorkerEntrypoint {
  async getAIData(filters?: {
    region?: string;
    year?: 2024 | 2025;
    minRespondents?: number;
  }): Promise<DeveloperAIRecord[]>
}
```

The Dynamic Worker calls `this.env.DATA.getAIData()`. That's the only key it has.

**Full dataset (41 countries × 2 years = 82 records):**

```typescript
export const AI_SURVEY_DATA: DeveloperAIRecord[] = [
  // Africa & Middle East
  { country: "Nigeria", region: "Africa & Middle East", respondents: 305, aiUsagePct: 75.1, favorablePct: 74.1, skepticalPct: 1.6, trustPct: 52.1, year: 2024 },
  { country: "Nigeria", region: "Africa & Middle East", respondents: 199, aiUsagePct: 78.4, favorablePct: 71.4, skepticalPct: 3.5, trustPct: 68.2, year: 2025 },
  { country: "South Africa", region: "Africa & Middle East", respondents: 358, aiUsagePct: 68.2, favorablePct: 60.1, skepticalPct: 4.2, trustPct: 34.6, year: 2024 },
  { country: "South Africa", region: "Africa & Middle East", respondents: 253, aiUsagePct: 73.9, favorablePct: 60.5, skepticalPct: 18.2, trustPct: 40.2, year: 2025 },
  // Americas
  { country: "Argentina", region: "Americas", respondents: 345, aiUsagePct: 61.7, favorablePct: 61.4, skepticalPct: 2.9, trustPct: 30.1, year: 2024 },
  { country: "Argentina", region: "Americas", respondents: 222, aiUsagePct: 82.0, favorablePct: 73.0, skepticalPct: 7.2, trustPct: 42.9, year: 2025 },
  { country: "Brazil", region: "Americas", respondents: 1375, aiUsagePct: 65.6, favorablePct: 64.6, skepticalPct: 2.7, trustPct: 30.0, year: 2024 },
  { country: "Brazil", region: "Americas", respondents: 825, aiUsagePct: 82.3, favorablePct: 67.3, skepticalPct: 12.6, trustPct: 39.2, year: 2025 },
  { country: "Canada", region: "Americas", respondents: 2104, aiUsagePct: 57.7, favorablePct: 51.0, skepticalPct: 5.1, trustPct: 21.6, year: 2024 },
  { country: "Canada", region: "Americas", respondents: 1305, aiUsagePct: 70.0, favorablePct: 50.1, skepticalPct: 26.4, trustPct: 24.7, year: 2025 },
  { country: "Colombia", region: "Americas", respondents: 217, aiUsagePct: 73.7, favorablePct: 71.4, skepticalPct: 3.2, trustPct: 42.9, year: 2024 },
  { country: "Colombia", region: "Americas", respondents: 202, aiUsagePct: 86.6, favorablePct: 79.7, skepticalPct: 5.4, trustPct: 56.5, year: 2025 },
  { country: "Mexico", region: "Americas", respondents: 402, aiUsagePct: 63.9, favorablePct: 63.2, skepticalPct: 3.0, trustPct: 32.3, year: 2024 },
  { country: "Mexico", region: "Americas", respondents: 286, aiUsagePct: 76.9, favorablePct: 67.5, skepticalPct: 7.3, trustPct: 50.0, year: 2025 },
  { country: "United States", region: "Americas", respondents: 11095, aiUsagePct: 53.8, favorablePct: 45.9, skepticalPct: 5.8, trustPct: 21.6, year: 2024 },
  { country: "United States", region: "Americas", respondents: 7233, aiUsagePct: 69.4, favorablePct: 50.2, skepticalPct: 26.3, trustPct: 27.5, year: 2025 },
  // Asia-Pacific
  { country: "Australia", region: "Asia-Pacific", respondents: 1260, aiUsagePct: 54.5, favorablePct: 44.7, skepticalPct: 5.5, trustPct: 21.5, year: 2024 },
  { country: "Australia", region: "Asia-Pacific", respondents: 804, aiUsagePct: 70.1, favorablePct: 49.5, skepticalPct: 25.2, trustPct: 24.8, year: 2025 },
  { country: "Bangladesh", region: "Asia-Pacific", respondents: 327, aiUsagePct: 71.3, favorablePct: 72.2, skepticalPct: 1.5, trustPct: 39.4, year: 2024 },
  { country: "Bangladesh", region: "Asia-Pacific", respondents: 220, aiUsagePct: 77.7, favorablePct: 70.0, skepticalPct: 6.8, trustPct: 51.4, year: 2025 },
  { country: "China", region: "Asia-Pacific", respondents: 406, aiUsagePct: 77.3, favorablePct: 71.9, skepticalPct: 2.7, trustPct: 45.6, year: 2024 },
  { country: "China", region: "Asia-Pacific", respondents: 255, aiUsagePct: 82.7, favorablePct: 72.5, skepticalPct: 6.7, trustPct: 57.4, year: 2025 },
  { country: "India", region: "Asia-Pacific", respondents: 4231, aiUsagePct: 66.8, favorablePct: 68.7, skepticalPct: 3.1, trustPct: 39.1, year: 2024 },
  { country: "India", region: "Asia-Pacific", respondents: 2547, aiUsagePct: 77.5, favorablePct: 66.9, skepticalPct: 5.7, trustPct: 57.0, year: 2025 },
  { country: "Indonesia", region: "Asia-Pacific", respondents: 354, aiUsagePct: 68.1, favorablePct: 62.7, skepticalPct: 2.8, trustPct: 38.7, year: 2024 },
  { country: "Indonesia", region: "Asia-Pacific", respondents: 181, aiUsagePct: 77.9, favorablePct: 66.9, skepticalPct: 3.3, trustPct: 55.2, year: 2025 },
  { country: "Iran", region: "Asia-Pacific", respondents: 411, aiUsagePct: 68.9, favorablePct: 62.8, skepticalPct: 5.4, trustPct: 30.7, year: 2024 },
  { country: "Iran", region: "Asia-Pacific", respondents: 149, aiUsagePct: 87.9, favorablePct: 75.2, skepticalPct: 5.4, trustPct: 45.7, year: 2025 },
  { country: "Israel", region: "Asia-Pacific", respondents: 604, aiUsagePct: 72.0, favorablePct: 60.8, skepticalPct: 5.5, trustPct: 29.8, year: 2024 },
  { country: "Israel", region: "Asia-Pacific", respondents: 297, aiUsagePct: 82.8, favorablePct: 66.3, skepticalPct: 13.1, trustPct: 41.5, year: 2025 },
  { country: "New Zealand", region: "Asia-Pacific", respondents: 396, aiUsagePct: 53.3, favorablePct: 46.7, skepticalPct: 5.1, trustPct: 20.7, year: 2024 },
  { country: "New Zealand", region: "Asia-Pacific", respondents: 255, aiUsagePct: 71.0, favorablePct: 51.4, skepticalPct: 25.1, trustPct: 25.7, year: 2025 },
  { country: "Pakistan", region: "Asia-Pacific", respondents: 415, aiUsagePct: 77.6, favorablePct: 76.6, skepticalPct: 3.4, trustPct: 48.2, year: 2024 },
  { country: "Pakistan", region: "Asia-Pacific", respondents: 239, aiUsagePct: 82.0, favorablePct: 69.0, skepticalPct: 4.2, trustPct: 60.2, year: 2025 },
  { country: "Turkey", region: "Asia-Pacific", respondents: 546, aiUsagePct: 68.1, favorablePct: 63.6, skepticalPct: 3.7, trustPct: 31.7, year: 2024 },
  { country: "Turkey", region: "Asia-Pacific", respondents: 295, aiUsagePct: 77.6, favorablePct: 59.3, skepticalPct: 12.9, trustPct: 44.9, year: 2025 },
  { country: "Vietnam", region: "Asia-Pacific", respondents: 296, aiUsagePct: 73.0, favorablePct: 62.5, skepticalPct: 2.7, trustPct: 40.5, year: 2024 },
  { country: "Vietnam", region: "Asia-Pacific", respondents: 145, aiUsagePct: 80.7, favorablePct: 61.4, skepticalPct: 8.3, trustPct: 55.2, year: 2025 },
  // Europe
  { country: "Austria", region: "Europe", respondents: 791, aiUsagePct: 61.2, favorablePct: 49.1, skepticalPct: 5.9, trustPct: 18.2, year: 2024 },
  { country: "Austria", region: "Europe", respondents: 410, aiUsagePct: 76.8, favorablePct: 48.3, skepticalPct: 23.9, trustPct: 22.4, year: 2025 },
  { country: "Belgium", region: "Europe", respondents: 526, aiUsagePct: 62.0, favorablePct: 54.2, skepticalPct: 4.8, trustPct: 24.5, year: 2024 },
  { country: "Belgium", region: "Europe", respondents: 321, aiUsagePct: 75.7, favorablePct: 57.3, skepticalPct: 19.6, trustPct: 26.6, year: 2025 },
  { country: "Bulgaria", region: "Europe", respondents: 319, aiUsagePct: 61.4, favorablePct: 50.2, skepticalPct: 6.0, trustPct: 21.9, year: 2024 },
  { country: "Bulgaria", region: "Europe", respondents: 244, aiUsagePct: 79.1, favorablePct: 60.7, skepticalPct: 11.9, trustPct: 34.3, year: 2025 },
  { country: "Czech Republic", region: "Europe", respondents: 714, aiUsagePct: 61.9, favorablePct: 51.1, skepticalPct: 4.2, trustPct: 21.6, year: 2024 },
  { country: "Czech Republic", region: "Europe", respondents: 520, aiUsagePct: 77.9, favorablePct: 56.2, skepticalPct: 19.0, trustPct: 26.6, year: 2025 },
  { country: "Denmark", region: "Europe", respondents: 504, aiUsagePct: 59.5, favorablePct: 47.2, skepticalPct: 8.3, trustPct: 18.3, year: 2024 },
  { country: "Denmark", region: "Europe", respondents: 316, aiUsagePct: 73.7, favorablePct: 56.3, skepticalPct: 23.1, trustPct: 25.5, year: 2025 },
  { country: "Finland", region: "Europe", respondents: 386, aiUsagePct: 61.9, favorablePct: 48.4, skepticalPct: 7.5, trustPct: 19.2, year: 2024 },
  { country: "Finland", region: "Europe", respondents: 254, aiUsagePct: 76.4, favorablePct: 47.6, skepticalPct: 24.4, trustPct: 16.6, year: 2025 },
  { country: "France", region: "Europe", respondents: 2110, aiUsagePct: 53.8, favorablePct: 48.3, skepticalPct: 4.3, trustPct: 19.1, year: 2024 },
  { country: "France", region: "Europe", respondents: 1409, aiUsagePct: 69.6, favorablePct: 50.3, skepticalPct: 26.1, trustPct: 24.2, year: 2025 },
  { country: "Germany", region: "Europe", respondents: 4947, aiUsagePct: 56.7, favorablePct: 44.4, skepticalPct: 6.0, trustPct: 18.6, year: 2024 },
  { country: "Germany", region: "Europe", respondents: 3025, aiUsagePct: 73.7, favorablePct: 48.0, skepticalPct: 25.3, trustPct: 22.2, year: 2025 },
  { country: "Greece", region: "Europe", respondents: 389, aiUsagePct: 63.8, favorablePct: 57.1, skepticalPct: 3.9, trustPct: 27.2, year: 2024 },
  { country: "Greece", region: "Europe", respondents: 252, aiUsagePct: 82.1, favorablePct: 66.7, skepticalPct: 9.9, trustPct: 38.1, year: 2025 },
  { country: "Hungary", region: "Europe", respondents: 396, aiUsagePct: 56.6, favorablePct: 45.2, skepticalPct: 5.1, trustPct: 17.2, year: 2024 },
  { country: "Hungary", region: "Europe", respondents: 236, aiUsagePct: 73.7, favorablePct: 50.0, skepticalPct: 21.6, trustPct: 31.1, year: 2025 },
  { country: "Italy", region: "Europe", respondents: 1341, aiUsagePct: 56.7, favorablePct: 57.4, skepticalPct: 4.0, trustPct: 23.4, year: 2024 },
  { country: "Italy", region: "Europe", respondents: 835, aiUsagePct: 78.0, favorablePct: 64.2, skepticalPct: 13.8, trustPct: 31.3, year: 2025 },
  { country: "Netherlands", region: "Europe", respondents: 1449, aiUsagePct: 59.9, favorablePct: 49.5, skepticalPct: 5.4, trustPct: 22.8, year: 2024 },
  { country: "Netherlands", region: "Europe", respondents: 867, aiUsagePct: 76.9, favorablePct: 55.4, skepticalPct: 22.4, trustPct: 28.3, year: 2025 },
  { country: "Norway", region: "Europe", respondents: 450, aiUsagePct: 64.2, favorablePct: 55.3, skepticalPct: 5.8, trustPct: 19.8, year: 2024 },
  { country: "Norway", region: "Europe", respondents: 237, aiUsagePct: 75.1, favorablePct: 52.3, skepticalPct: 25.7, trustPct: 23.2, year: 2025 },
  { country: "Poland", region: "Europe", respondents: 1534, aiUsagePct: 62.5, favorablePct: 45.6, skepticalPct: 7.4, trustPct: 18.6, year: 2024 },
  { country: "Poland", region: "Europe", respondents: 888, aiUsagePct: 77.3, favorablePct: 53.9, skepticalPct: 21.2, trustPct: 27.0, year: 2025 },
  { country: "Portugal", region: "Europe", respondents: 470, aiUsagePct: 65.3, favorablePct: 62.8, skepticalPct: 3.4, trustPct: 26.2, year: 2024 },
  { country: "Portugal", region: "Europe", respondents: 280, aiUsagePct: 82.1, favorablePct: 69.6, skepticalPct: 15.7, trustPct: 38.0, year: 2025 },
  { country: "Romania", region: "Europe", respondents: 439, aiUsagePct: 63.1, favorablePct: 55.8, skepticalPct: 6.2, trustPct: 27.6, year: 2024 },
  { country: "Romania", region: "Europe", respondents: 323, aiUsagePct: 78.6, favorablePct: 60.7, skepticalPct: 16.1, trustPct: 34.3, year: 2025 },
  { country: "Russia", region: "Europe", respondents: 925, aiUsagePct: 47.1, favorablePct: 37.7, skepticalPct: 5.1, trustPct: 18.1, year: 2024 },
  { country: "Russia", region: "Europe", respondents: 200, aiUsagePct: 73.0, favorablePct: 51.0, skepticalPct: 16.5, trustPct: 23.2, year: 2025 },
  { country: "Spain", region: "Europe", respondents: 1123, aiUsagePct: 64.8, favorablePct: 61.3, skepticalPct: 4.6, trustPct: 28.5, year: 2024 },
  { country: "Spain", region: "Europe", respondents: 717, aiUsagePct: 80.3, favorablePct: 63.5, skepticalPct: 17.4, trustPct: 33.4, year: 2025 },
  { country: "Sweden", region: "Europe", respondents: 1016, aiUsagePct: 61.5, favorablePct: 52.1, skepticalPct: 5.5, trustPct: 20.3, year: 2024 },
  { country: "Sweden", region: "Europe", respondents: 616, aiUsagePct: 75.6, favorablePct: 53.7, skepticalPct: 21.8, trustPct: 20.0, year: 2025 },
  { country: "Switzerland", region: "Europe", respondents: 876, aiUsagePct: 58.6, favorablePct: 45.7, skepticalPct: 5.5, trustPct: 17.4, year: 2024 },
  { country: "Switzerland", region: "Europe", respondents: 546, aiUsagePct: 77.5, favorablePct: 58.4, skepticalPct: 21.8, trustPct: 24.2, year: 2025 },
  { country: "Ukraine", region: "Europe", respondents: 2672, aiUsagePct: 72.2, favorablePct: 56.2, skepticalPct: 3.5, trustPct: 31.3, year: 2024 },
  { country: "Ukraine", region: "Europe", respondents: 964, aiUsagePct: 85.4, favorablePct: 61.8, skepticalPct: 8.1, trustPct: 40.9, year: 2025 },
  { country: "United Kingdom", region: "Europe", respondents: 3224, aiUsagePct: 50.5, favorablePct: 42.6, skepticalPct: 5.8, trustPct: 19.2, year: 2024 },
  { country: "United Kingdom", region: "Europe", respondents: 2042, aiUsagePct: 64.7, favorablePct: 47.1, skepticalPct: 28.8, trustPct: 23.4, year: 2025 },
];
```

**Notable stories in the data (good for demo prompts):**
- Ukraine leads Europe on usage in both years (72% → 85%)
- Germany has the lowest trust score in Europe (18.6% in 2024, 22.2% in 2025)
- Colombia leads Americas on usage in 2025 (86.6%)
- US skepticism tripled 2024→2025 (5.8% → 26.3%) — same trend in UK, Canada, Australia
- Iran leads all countries on usage in 2025 (87.9%)
- Nigeria leads on trust in 2025 (68.2%)

---

## npm Modules in Dynamic Workers

`@cloudflare/worker-bundler` resolves and fetches npm packages at bundle time
directly from the npm registry. You include a `package.json` in the `files` map
alongside the generated code and `createWorker` handles the rest — no
pre-installation, no pre-bundling in the loader Worker.

```typescript
const { mainModule, modules } = await createWorker({
  files: {
    "src/index.ts": generatedCode,         // AI-generated, imports vega-lite + vega
    "package.json": JSON.stringify({
      dependencies: {
        "vega-lite": "^5",
        "vega": "^5"
      }
    })
  }
});
```

**Cold start implications:** On first run, `worker-bundler` downloads and bundles
`vega` (~3.4MB) + `vega-lite` (~7.1MB) from npm. This adds meaningful cold start
latency (~2–4s). On warm starts (same worker ID), the cached Worker responds in
milliseconds. **This is a feature for the demo** — the cold/warm contrast is more
dramatic with a heavier dep, and it makes the caching story land harder.

**Known limitation from the docs:** `worker-bundler` uses a flat node_modules
layout, so conflicting transitive dependency versions may collapse to one. vega's
dep tree is stable enough that this shouldn't be an issue in practice.

---

## Workers AI Prompt

The loader Worker constructs two things to pass to `createWorker`:

1. **The generated JS** — Workers AI output
2. **A `package.json`** — injected by the loader, not generated by the AI

The loader always injects `vega-lite` and `vega` into the `package.json`
dependencies regardless of what the AI generates. The AI only needs to know
how to use them.

**System prompt sent to Workers AI:**

```
You are a code generator for Cloudflare Workers. Output only valid TypeScript.
The Worker must export a default fetch handler that returns an HTML Response.

You have access to one binding: env.DATA
Call env.DATA.getAIData(filters?) to fetch data.
filters is optional: { region?: string, year?: 2024 | 2025, minRespondents?: number }
It returns an array of records with these fields:
  country: string
  region: string        // "Americas" | "Europe" | "Asia-Pacific" | "Africa & Middle East"
  respondents: number
  aiUsagePct: number    // % currently using AI tools
  favorablePct: number  // % favorable toward AI
  skepticalPct: number  // % unfavorable toward AI
  trustPct: number      // % who trust AI output accuracy
  year: 2024 | 2025

You have access to vega-lite and vega for charting. Use them to produce SVG charts.
Always use this exact pattern for SVG rendering (it works without a DOM):

  import { compile } from 'vega-lite';
  import { View, parse } from 'vega';

  async function renderChart(spec) {
    const vegaSpec = compile(spec).spec;
    const view = new View(parse(vegaSpec), { renderer: 'none' });
    await view.runAsync();
    return view.toSVG();
  }

Every report must include:
- A bold title and one-line summary stat at the top
- At least one vega-lite bar chart rendered as inline SVG
- A summary data table with alternating row colors (#f9f9f9 / white)
- A footer: "Source: Stack Overflow Developer Survey 2024/2025 (ODbL)"
- All styling inline — no external stylesheets, no CDN links, no <script> tags

Output only the TypeScript/JavaScript code. No explanation. No markdown fences.
```

**Append the user's prompt**, e.g.:
`"Rank countries by AI usage in 2025, show the top 10 as a bar chart."`

**Three pre-scripted demo prompts** (produce visually distinct reports):

1. Cold open:
   `"Show the top 10 countries by AI usage in 2025 as a ranked bar chart."`

2. Binding demo (intentional failure then success):
   `"Show countries with the biggest trust gap — high usage but low trust — for 2025."`

3. Pre-saved report already in list when recording starts:
   `"Compare average AI usage by region for 2024 vs 2025 as a grouped bar chart."`

---

## File Structure

```
/
├── wrangler.jsonc
  ├── src/
│   ├── index.ts              # Loader Worker — main fetch handler
│   ├── data-service.ts       # DataService WorkerEntrypoint + AI survey dataset
│   ├── tail.ts               # DynamicWorkerTail WorkerEntrypoint
│   └── log-session.ts        # LogSession Durable Object
├── public/
│   └── index.html            # Static shell (Vite serves this)
├── src/ui/
│   ├── App.tsx               # Root component
│   ├── PromptPanel.tsx        # Left: prompt input + binding toggle + run button
│   ├── OutputPanel.tsx        # Right: HTML report iframe + log stream + timing
│   └── ReportList.tsx         # Bottom/sidebar: saved reports list
└── package.json
```

---

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│  Dynamic Workers Report Builder                      │
├──────────────────────┬──────────────────────────────┤
│  PROMPT              │  OUTPUT                       │
│                      │                               │
│  [text area]         │  [HTML report iframe]         │
│                      │                               │
│  Binding:            │  ───────────────────────      │
│  [ ] Attach DATA     │  LOGS                         │
│                      │  > cold start: 312ms          │
│  [Run]  [Save]       │  > build: 98ms  run: 47ms     │
│                      │                               │
├──────────────────────┴──────────────────────────────┤
│  ACTIVE REPORTS                                      │
│  [Top 10 by Usage] [Europe Trust Gap] [2024 vs 2025]  │
│   ↗ open   🗑 kill    ↗ open   🗑 kill   ↗ open  🗑 kill │
└─────────────────────────────────────────────────────┘
```

---

## Key Implementation Notes

### Dynamic Worker composition

`@cloudflare/worker-bundler` resolves npm imports in the generated code by
fetching packages from the npm registry at bundle time. Include a `package.json`
in the `files` map — the loader always injects `vega-lite` and `vega` here
regardless of what the AI generates.

```typescript
// src/index.ts (simplified)
import { createWorker } from '@cloudflare/worker-bundler';
import { exports as runtimeExports } from 'cloudflare:workers';

const worker = env.LOADER.get(workerId, async () => {
  const { mainModule, modules, wranglerConfig } = await createWorker({
    files: {
      "src/index.ts": generatedCode,
      "package.json": JSON.stringify({
        dependencies: {
          "vega-lite": "^5",
          "vega": "^5"
        }
      })
    }
  });

  const dataService = withBinding
    ? runtimeExports.DataService({ props: {} })
    : undefined;

  return {
    mainModule,
    modules,
    compatibilityDate: wranglerConfig?.compatibilityDate ?? "2026-01-01",
    globalOutbound: null,                          // no network access
    ...(dataService ? { env: { DATA: dataService } } : {}),
    tails: [runtimeExports.DynamicWorkerTail({ props: { workerId } })],
  };
});

const response = await worker.getEntrypoint().fetch(request);
```

### Worker ID strategy

Worker ID is derived from the content hash of the generated code + whether the
binding is attached. This means:

- Same prompt, no binding: `worker-${hash(code)}-nodata` — cold first run, warm on repeat
- Same prompt, binding attached: `worker-${hash(code)}-withdata` — cold first run, warm on repeat
- Saved reports: `report-${uuid}` stored in KV with metadata

The hash includes the `package.json` content so changing deps busts the cache.
This gives the demo its cold/warm contrast — run the same prompt twice to show
caching, then add the binding to show a new cold start followed by a fast warm.

### The intentional failure

For the "run without binding" beat in the script, generate the code with a prompt
that explicitly tries to call `env.DATA.getAIData()`. Without the binding in
the `env`, calling it will throw. The error surfaces in the log stream. This is
the teachable moment — not a bug, it's capability-based sandboxing working as
designed.

### Saving a report

```typescript
// KV entry shape
type SavedReport = {
  workerId: string;
  prompt: string;
  createdAt: string;
  url: string;   // /<workerId> route served by the loader Worker
};
```

The loader Worker routes `GET /<workerId>` by looking up the worker ID and calling
`worker.getEntrypoint().fetch(request)` — the Dynamic Worker is still cached and
responds immediately on warm starts.

### Killing a report

Delete the KV entry and stop holding a reference to the Worker. The loader no
longer calls `LOADER.get()` for that ID, so it gets evicted from cache. No
explicit teardown call needed.

---

## wrangler.jsonc (key sections)

```jsonc
{
  "name": "dynamic-workers-report-builder",
  "main": "src/index.ts",
  "compatibility_date": "2026-01-01",
  "observability": { "enabled": true, "head_sampling_rate": 1 },

  "ai": { "binding": "AI" },

  "worker_loaders": [{ "binding": "LOADER" }],

  "durable_objects": {
    "bindings": [{ "name": "LOG_SESSION", "class_name": "LogSession" }]
  },

  "kv_namespaces": [{ "binding": "REPORTS", "id": "<your-kv-id>" }],

  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["LogSession"] }]
}
```

---

## Build Order

1. **AI survey dataset + DataService** — hardcode the 82-record dataset, expose `getAIData`,
   test it returns and filters records correctly. No Dynamic Workers yet.

2. **Workers AI code generation** — wire up the AI binding, test that the system
   prompt produces valid TypeScript that imports `vega-lite` and `vega`. Log the
   raw AI output before trying to run it. Verify the output compiles via
   `createWorker` (bundle step) without errors.

3. **Dynamic Worker execution (no binding)** — pass the bundled code to
   `env.LOADER.get()` with `globalOutbound: null` and no `env`. Confirm it runs
   and returns styled HTML with an SVG chart. Confirm it fails cleanly when it
   tries to call `env.DATA.getAIData()` — error must surface in the log stream,
   not as a silent crash.

4. **DataService binding** — pass the `DataService` stub into the Dynamic Worker
   `env`. Confirm the report now renders with real survey data.

5. **Log capture** — add `DynamicWorkerTail` and `LogSession`. Confirm logs stream
   back in the response. Confirm timing breakdown (build/load/run) is visible.

6. **Save + list** — add KV writes on save, KV reads for the Active Reports list,
   routing for `GET /<workerId>`.

7. **Kill** — add KV delete and remove from UI list.

8. **UI polish** — iframe for report output, binding toggle, timing display, list
   panel. Match the layout above closely enough to be clear on camera.

---

## Demo Script Checkpoints

These are the specific moments the video script calls out — make sure each works
reliably before recording:

| Script beat | What must happen |
|---|---|
| Cold open — type prompt, hit run | Report renders with styled HTML + SVG bar chart |
| Show generated code | Code panel visible, readable at 1080p — imports vega-lite visible |
| Cold vs. warm start | Cold shows bundle + npm fetch time, warm is sub-100ms |
| Run without binding | Clear error in log stream — `env.DATA is not defined` or similar |
| Toggle binding on | Binding panel shows `DATA: getAIData` attached |
| Re-run with binding | Report populates with real survey data + chart |
| Save report | Appears in Active Reports list with a URL |
| Kill report | Disappears from list cleanly |
| Two reports side by side | Different prompts, different chart types, both live |

---

## References

## package.json (loader Worker / host)

```json
{
  "dependencies": {
    "@cloudflare/worker-bundler": "latest",
    "hono": "^4"
  },
  "devDependencies": {
    "wrangler": "latest",
    "@cloudflare/workers-types": "latest",
    "typescript": "^5",
    "vite": "^5",
    "react": "^18",
    "react-dom": "^18",
    "@types/react": "^18",
    "@types/react-dom": "^18"
  }
}
```

Note: `vega-lite` and `vega` are **not** installed in the host project. They are
resolved and fetched by `@cloudflare/worker-bundler` at Dynamic Worker bundle time
from the npm registry, using the `package.json` injected into the `files` map.

---

### Cloudflare Platform
- [Dynamic Workers docs](https://developers.cloudflare.com/dynamic-workers/)
- [Dynamic Workers bindings](https://developers.cloudflare.com/dynamic-workers/usage/bindings/)
- [Dynamic Workers observability](https://developers.cloudflare.com/dynamic-workers/usage/observability/)
- [Dynamic Workers egress control](https://developers.cloudflare.com/dynamic-workers/usage/egress-control/)
- [Dynamic Workers Playground (reference implementation)](https://github.com/cloudflare/agents/tree/main/examples/dynamic-workers-playground)
- [@cloudflare/worker-bundler npm](https://www.npmjs.com/package/@cloudflare/worker-bundler)
- [Workers AI](https://developers.cloudflare.com/workers-ai/)
- [Workers RPC](https://developers.cloudflare.com/workers/runtime-apis/rpc/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare changelog](https://developers.cloudflare.com/changelog/) — check before building for recent changes

### Agent Skills
- [cloudflare/skills](https://github.com/cloudflare/skills) — install before starting the build
- [skills install docs (OpenCode)](https://opencode.ai/docs/skills/)

### Data
- [Stack Overflow Developer Survey 2024](https://survey.stackoverflow.co/2024/) (data source)
- [Stack Overflow Developer Survey 2025](https://survey.stackoverflow.co/2025/) (data source)
- [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/)
