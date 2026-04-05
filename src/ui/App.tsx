import { useState, useEffect, useCallback } from "react";
import { PromptPanel } from "./PromptPanel";
import { OutputPanel } from "./OutputPanel";
import { ReportList } from "./ReportList";

export interface LogEntry {
  level: string;
  message: string;
  timestamp: number;
}

export interface RunResult {
  workerId: string;
  generatedCode: string;
  fullCode: string;
  html: string;
  workerError: { message: string; stack?: string } | null;
  logs: LogEntry[];
}

export interface SavedReport {
  workerId: string;
  slug: string;
  prompt: string;
  createdAt: string;
}

const DEMO_PROMPTS = [
  "Show the top 10 countries by AI usage in 2025 as a ranked bar chart.",
  "Show countries with the biggest trust gap — high usage but low trust — for 2025.",
  "Compare average AI usage by region for 2024 vs 2025 as a grouped bar chart.",
];

// In dev, Vite proxies /api/* to the Worker. We use relative URLs everywhere.
const API_BASE = "";

export default function App() {
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [currentSlug, setCurrentSlug] = useState<string | undefined>(undefined);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports`);
      const data = await res.json() as { reports: SavedReport[] };
      setReports(data.reports ?? []);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const [statusMessage, setStatusMessage] = useState("Generating code with Workers AI…");

  const handleRun = async (prompt: string) => {
    setRunning(true);
    setResult(null);
    setCurrentPrompt(prompt);
    setCurrentSlug(undefined);
    setStatusMessage("Generating code with Workers AI…");

    try {
      const res = await fetch(`${API_BASE}/api/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json() as { error?: string };
        setResult({ workerId: "", generatedCode: "", fullCode: "", html: "", workerError: { message: data.error ?? "Unknown error" }, logs: [] });
        return;
      }

      // Consume SSE stream
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += value;
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const eventLine = part.split("\n").find(l => l.startsWith("event: "));
          const dataLine = part.split("\n").find(l => l.startsWith("data: "));
          if (!eventLine || !dataLine) continue;
          const event = eventLine.slice(7).trim();
          const data = JSON.parse(dataLine.slice(6));
          if (event === "status") {
            setStatusMessage(data.message);
          } else if (event === "result") {
            setResult(data as RunResult);
          } else if (event === "logs") {
            setResult(prev => prev ? { ...prev, logs: data.logs } : prev);
          } else if (event === "error") {
            setResult({ workerId: "", generatedCode: data.generatedCode ?? "", fullCode: "", html: "", workerError: { message: data.error }, logs: [] });
          }
        }
      }
    } catch (err) {
      setResult({ workerId: "", generatedCode: "", fullCode: "", html: "", workerError: { message: err instanceof Error ? err.message : String(err) }, logs: [] });
    } finally {
      setRunning(false);
    }
  };

  const handleSave = async (prompt: string) => {
    if (!result?.workerId || !result.fullCode) return;

    const saveRes = await fetch(`${API_BASE}/api/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId: result.workerId,
        prompt,
        fullCode: result.fullCode,
      }),
    });
    const saveData = await saveRes.json() as { ok: boolean; slug?: string };
    if (saveData.slug) setCurrentSlug(saveData.slug);
    await fetchReports();
  };

  const handleSaveAndOpen = async (): Promise<string | undefined> => {
    if (!result?.workerId || !result.fullCode) return undefined;
    // Already saved — just return the slug
    if (currentSlug) return currentSlug;
    // Save first, then return slug
    const saveRes = await fetch(`${API_BASE}/api/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId: result.workerId,
        prompt: currentPrompt,
        fullCode: result.fullCode,
      }),
    });
    const saveData = await saveRes.json() as { ok: boolean; slug?: string };
    if (saveData.slug) setCurrentSlug(saveData.slug);
    await fetchReports();
    return saveData.slug;
  };

  const handleKill = async (workerId: string) => {
    await fetch(`${API_BASE}/api/reports/${workerId}`, { method: "DELETE" });
    await fetchReports();
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>Dynamic Workers Report Builder</h1>
        <p style={styles.subtitle}>
          Type a prompt → Workers AI writes JS → Dynamic Worker runs it → HTML report appears
        </p>
      </header>

      <div style={styles.main}>
        <PromptPanel
          onRun={handleRun}
          onSave={handleSave}
          running={running}
          hasResult={!!result?.workerId}
          demoPrompts={DEMO_PROMPTS}
        />
        <OutputPanel result={result} running={running} statusMessage={statusMessage} slug={currentSlug} onSaveAndOpen={handleSaveAndOpen} />
      </div>

      <ReportList
        reports={reports}
        loading={loadingReports}
        onKill={handleKill}
        onRefresh={fetchReports}
      />

      <footer style={styles.footer}>
        <div>
          Built with 🧡 using{" "}
          <a
            href="https://developers.cloudflare.com/dynamic-workers/"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.footerLink}
          >
            Cloudflare Dynamic Workers
          </a>
        </div>
        <div>
          <a
            href="https://github.com/craigsdennis/dynamic-worker-based-reports"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.footerLink}
          >
            👀 the code
          </a>
        </div>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    minHeight: "100vh",
    background: "transparent",
    color: "#1a1a1a",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "16px 24px 14px",
    borderBottom: "1px solid #e8e0d5",
    background: "rgba(255,251,245,0.85)",
    backdropFilter: "blur(8px)",
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: "#1a1a1a",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    margin: "3px 0 0",
    fontSize: 13,
    color: "#8a7968",
  },
  main: {
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    gap: 0,
    flex: 1,
    minHeight: 0,
    borderBottom: "1px solid #e8e0d5",
  },
  footer: {
    position: "sticky",
    bottom: 0,
    borderTop: "1px solid #e8e0d5",
    background: "rgba(255,251,245,0.95)",
    backdropFilter: "blur(8px)",
    padding: "10px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    fontSize: 12,
    color: "#8a7968",
    textAlign: "center",
  },
  footerLink: {
    color: "#f6821f",
    textDecoration: "none",
    fontWeight: 500,
  },
};
