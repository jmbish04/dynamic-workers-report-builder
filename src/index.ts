import { exports as runtimeExports } from "cloudflare:workers";
import { createWorker } from "@cloudflare/worker-bundler";
import { DataService } from "./data-service";
import { LogSession, DynamicWorkerTail, type LogEntry } from "./log-session";

export { DataService, LogSession, DynamicWorkerTail };

// ---------- Types ----------

interface Env {
  AI: Ai;
  LOADER: WorkerLoader;
  LOG_SESSION: DurableObjectNamespace<LogSession>;
  REPORTS: KVNamespace;
}

interface SavedReport {
  workerId: string;
  slug: string;
  prompt: string;
  createdAt: string;
  fullCode: string; // assembled worker source — used to re-bundle on isolate eviction
}

// Module-level exports — used to access LogSession by name for log capture
type ModuleExports = {
  LogSession: {
    getByName(name: string): Pick<LogSession, "waitForLogs" | "addLogs">;
  };
};
const moduleExports = runtimeExports as unknown as ModuleExports;

// Per-request ctx.exports — used to instantiate entrypoints for dynamic worker bindings
type CtxExports = {
  DataService(options: { props: Record<string, unknown> }): Fetcher;
  DynamicWorkerTail(options: { props: { workerId: string } }): Fetcher;
};

// ---------- Workers AI prompt ----------

const SYSTEM_PROMPT = `You are generating a Cloudflare Worker that returns a self-contained HTML report page.
Output ONLY valid JavaScript (ES module). No explanation. No markdown fences. No import statements.

The worker has one binding: env.DATA

type DeveloperAIRecord = {
  country: string;
  region: "Americas" | "Europe" | "Asia-Pacific" | "Africa & Middle East";
  respondents: number;
  aiUsagePct: number;    // % currently using AI tools
  favorablePct: number;  // % favorable toward AI
  skepticalPct: number;  // % unfavorable toward AI
  trustPct: number;      // % who trust AI output accuracy
  year: 2024 | 2025;
};

env.DATA.getAIData(filters?: { region?: string; year?: 2024 | 2025; minRespondents?: number }): Promise<DeveloperAIRecord[]>

The worker fetches the data and returns an HTML page. The page uses Chart.js (loaded from CDN) for charts.
Embed the data as a JSON literal in a <script> tag and render the chart client-side with Chart.js.

CDN script tag to include: <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>

Chart.js usage pattern:
  const ctx = document.getElementById('myChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',  // or 'horizontalBar' via indexAxis:'y', 'pie', 'line', 'scatter', etc.
    data: { labels: [...], datasets: [{ label: '...', data: [...], backgroundColor: '...' }] },
    options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: true } } }
  });

Choose the best Chart.js chart type for the request:
- Ranked lists → bar with indexAxis:'y' (horizontal bars, sorted descending)
- Year-over-year comparison → grouped bar (two datasets)
- Proportions → pie or doughnut
- Distribution / scatter → scatter or bubble

Every report must include:
- A styled HTML page with a bold title and one-line summary stat
- A Chart.js chart in a <canvas> element (give it a fixed height e.g. style="height:400px")
- A data table with alternating row colors (#f9f9f9 / white), all styles inline
- A footer: "Source: Stack Overflow Developer Survey 2024/2025 (ODbL)"
- Clean, readable inline CSS — a professional look

Output ONLY the JavaScript. Start with: export default {`;

function buildDynamicWorker(aiCode: string, prompt: string): string {
  // Strip any import statements — the worker is pure JS, charts are client-side
  const stripped = aiCode
    .replace(/^import\s.+from\s+['"][^'"]+['"]\s*;?\s*\n?/gm, "")
    .trim();

  // Inject a console.log so the log capture pipeline has something to show.
  // We do this here rather than relying on the AI so it's always present.
  const logLine = `console.log("Report request: ${prompt.replace(/"/g, '\\"').replace(/\n/g, " ")}");`;

  // Insert after the opening of the fetch handler
  return stripped.replace(
    /async\s+fetch\s*\([^)]*\)\s*\{/,
    (match) => `${match}\n    ${logLine}`
  );
}

// ---------- Worker ID hash ----------

async function makeWorkerId(code: string): Promise<string> {
  const payload = code;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload)
  );
  const hash = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("").slice(0, 16);
  return `report-worker-${hash}`;
}

// ---------- Slug generation ----------

function makeSlug(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 8)
    .join("-")
    .slice(0, 60);
}

// ---------- JSON helpers ----------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// ---------- Main fetch handler ----------

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // POST /api/run — generate code + execute dynamic worker
    if (url.pathname === "/api/run" && request.method === "POST") {
      return handleRun(request, env, ctx);
    }

    // POST /api/save — save a report to KV
    if (url.pathname === "/api/save" && request.method === "POST") {
      return handleSave(request, env);
    }

    // GET /api/reports — list saved reports
    if (url.pathname === "/api/reports" && request.method === "GET") {
      return handleList(env);
    }

    // DELETE /api/reports/:id — kill a report
    const killMatch = url.pathname.match(/^\/api\/reports\/(.+)$/);
    if (killMatch && request.method === "DELETE") {
      return handleKill(killMatch[1], env);
    }

    // GET /r/:slug — serve a saved report by slug
    const reportMatch = url.pathname.match(/^\/r\/(.+)$/);
    if (reportMatch && request.method === "GET") {
      return handleServeReport(reportMatch[1], request, env, ctx);
    }

    return new Response("Not found", { status: 404, headers: CORS_HEADERS });
  },
};

// ---------- /api/run ----------

async function handleRun(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    return await _handleRun(request, env, ctx);
  } catch (err) {
    console.error("handleRun top-level error:", err);
    return json({
      error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      stack: err instanceof Error ? err.stack : undefined,
    }, 500);
  }
}

async function _handleRun(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const body = await request.json() as { prompt: string };
  const { prompt } = body;
  if (!prompt) return json({ error: "prompt is required" }, 400);

  // Stream progress back as SSE so the connection stays alive during slow AI inference
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();

  const send = (event: string, data: unknown) => {
    writer.write(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  };

  ctx.waitUntil((async () => {
    try {
      // 1. Generate code with AI (streaming keeps connection alive)
      send("status", { stage: "ai", message: "Generating code with Workers AI…" });

      // 1a. Stream AI response — generates only getData + getSpec functions
      let aiCode = "";
      try {
        // Stream to keep the connection alive during long generations
        const stream = await env.AI.run("@cf/nvidia/nemotron-3-120b-a12b" as Parameters<Ai["run"]>[0], {
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          max_tokens: 4096,
          stream: true,
        } as AiTextGenerationInput) as ReadableStream;

        const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of value.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") break;
            try {
              const chunk = JSON.parse(raw) as {
                choices?: { delta?: { content?: string } }[];
                response?: string;
              };
              const delta = chunk.choices?.[0]?.delta?.content ?? chunk.response ?? "";
              aiCode += delta;
            } catch { /* skip malformed chunks */ }
          }
        }

        // Fallback: if streaming gave nothing, try non-streaming
        if (!aiCode.trim()) {
          const fallback = await env.AI.run("@cf/nvidia/nemotron-3-120b-a12b" as Parameters<Ai["run"]>[0], {
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: prompt },
            ],
            max_tokens: 4096,
          } as AiTextGenerationInput) as { choices?: { message?: { content?: string } }[]; response?: string };
          aiCode = fallback.choices?.[0]?.message?.content ?? fallback.response ?? "";
        }
      } catch (err) {
        send("error", { error: `AI generation failed: ${err instanceof Error ? err.message : String(err)}` });
        await writer.close();
        return;
      }

      // Strip markdown fences and any reasoning preamble before the first import/export
      aiCode = aiCode
        .replace(/^```(?:javascript|typescript|js|ts)?\n?/m, "")
        .replace(/\n?```\s*$/m, "")
        .trim();
      const codeStart = aiCode.search(/^(import|export|async\s+function|function|const|let|var)\s/m);
      if (codeStart > 0) aiCode = aiCode.slice(codeStart);

      if (!aiCode) {
        send("error", { error: "AI returned empty code" });
        await writer.close();
        return;
      }

      const fullCode = buildDynamicWorker(aiCode, prompt);

      // 2. Bundle the generated code with worker-bundler
      send("status", { stage: "bundle", message: "Bundling generated code…" });
      let mainModule: string, modules: Record<string, string>, compatibilityDate: string, compatibilityFlags: string[];
      try {
        const result = await createWorker({
          files: { "src/index.js": fullCode },
        });
        mainModule = result.mainModule;
        modules = result.modules as Record<string, string>;
        compatibilityDate = result.wranglerConfig?.compatibilityDate ?? "2026-04-01";
        compatibilityFlags = result.wranglerConfig?.compatibilityFlags ?? [];
      } catch (err) {
        send("error", { error: `Bundle failed: ${err instanceof Error ? err.message : String(err)}`, generatedCode: aiCode });
        await writer.close();
        return;
      }

      const workerId = await makeWorkerId(fullCode);

      send("status", { stage: "run", message: "Running dynamic worker…" });

      // 3. Run dynamic worker — pass modules straight from createWorker, same as the playground
      const ctxExports = (ctx as unknown as { exports: CtxExports }).exports;
      const dataBinding = ctxExports.DataService({ props: {} });

      // Set up log session before the worker fires so no tail events are missed
      const logSession = moduleExports.LogSession.getByName(workerId);
      const logWaiter = await logSession.waitForLogs();

      const worker = env.LOADER.get(workerId, async () => ({
        mainModule,
        modules: modules as Record<string, string>,
        compatibilityDate,
        compatibilityFlags,
        globalOutbound: null,
        env: { DATA: dataBinding },
        tails: [ctxExports.DynamicWorkerTail({ props: { workerId } })],
      }));

      const entrypoint = worker.getEntrypoint() as Fetcher & { __warmup__?: () => Promise<void> };
      try { await entrypoint.__warmup__?.(); } catch { /* expected */ }

      let html = "";
      let workerError: { message: string; stack?: string } | null = null;
      try {
        const res = await entrypoint.fetch(new Request("https://worker.internal/"));
        html = await res.text();
        if (res.status >= 500) workerError = { message: html || "Worker returned an internal error." };
      } catch (err) {
        workerError = { message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined };
      }

      // Send the result immediately — don't block on log collection
      send("result", {
        workerId, generatedCode: aiCode, fullCode, html, workerError,
        logs: [], // populated by trailing "logs" event below
      });

      // Collect logs as a trailing SSE event — tail fires async after the
      // dynamic worker completes; wait up to 5s then close the stream
      try {
        const logs = await logWaiter.getLogs(5000);
        if (logs.length > 0) {
          send("logs", { logs });
        }
      } catch { /* tail may not arrive — that's fine */ }

    } catch (err) {
      send("error", { error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      await writer.close();
    }
  })());

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      ...CORS_HEADERS,
    },
  });
}

// ---------- /api/save ----------

async function handleSave(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as {
    workerId: string;
    prompt: string;
    fullCode: string;
  };

  const { workerId, prompt, fullCode } = body;
  if (!workerId || !prompt || !fullCode) {
    return json({ error: "workerId, prompt, and fullCode are required" }, 400);
  }

  // Generate a unique slug: base slug + short hash suffix to avoid collisions
  const base = makeSlug(prompt);
  const suffix = workerId.slice(-6);
  const slug = `${base}-${suffix}`;

  const entry: SavedReport = {
    workerId,
    slug,
    prompt,
    createdAt: new Date().toISOString(),
    fullCode,
  };

  // Store under both the slug (for routing) and workerId (for list/kill by ID)
  await Promise.all([
    env.REPORTS.put(`slug:${slug}`, JSON.stringify(entry)),
    env.REPORTS.put(`id:${workerId}`, JSON.stringify(entry)),
  ]);

  return json({ ok: true, workerId, slug });
}

// ---------- /api/reports ----------

async function handleList(env: Env): Promise<Response> {
  const list = await env.REPORTS.list({ prefix: "id:" });
  const reports: SavedReport[] = [];

  for (const key of list.keys) {
    const raw = await env.REPORTS.get(key.name);
    if (raw) {
      try {
        reports.push(JSON.parse(raw) as SavedReport);
      } catch {
        // skip malformed
      }
    }
  }

  reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return json({ reports });
}

// ---------- DELETE /api/reports/:id ----------

async function handleKill(workerId: string, env: Env): Promise<Response> {
  const raw = await env.REPORTS.get(`id:${workerId}`);
  if (raw) {
    const report = JSON.parse(raw) as SavedReport;
    await Promise.all([
      env.REPORTS.delete(`id:${workerId}`),
      env.REPORTS.delete(`slug:${report.slug}`),
    ]);
  } else {
    await env.REPORTS.delete(`id:${workerId}`);
  }
  return json({ ok: true });
}

// ---------- GET /r/:workerId ----------

async function handleServeReport(
  slug: string,
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  // Look up by slug first, fall back to legacy id: prefix for old links
  const raw = await env.REPORTS.get(`slug:${slug}`) ?? await env.REPORTS.get(`id:${slug}`);
  if (!raw) {
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:system-ui;padding:32px;color:#374151">
        <h2>Report not found</h2><p>This report may have been deleted.</p>
      </body></html>`,
      { status: 404, headers: { "Content-Type": "text/html" } }
    );
  }

  const report = JSON.parse(raw) as SavedReport;
  const { workerId, fullCode } = report;

  const ctxExports = (ctx as unknown as { exports: CtxExports }).exports;
  const dataBinding = ctxExports.DataService({ props: {} });

  const worker = env.LOADER.get(workerId, async () => {
    // Re-bundle from stored source on isolate cache miss
    const result = await createWorker({
      files: { "src/index.js": fullCode },
    });
    return {
      mainModule: result.mainModule,
      modules: result.modules as Record<string, string>,
      compatibilityDate: result.wranglerConfig?.compatibilityDate ?? "2026-04-01",
      compatibilityFlags: result.wranglerConfig?.compatibilityFlags ?? [],
      globalOutbound: null,
      env: { DATA: dataBinding },
    };
  });

  const entrypoint = worker.getEntrypoint() as Fetcher;
  return entrypoint.fetch(new Request("https://worker.internal/"));
}
