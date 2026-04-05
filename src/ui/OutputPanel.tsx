import { useEffect, useRef, useState } from "react";
import type { RunResult, LogEntry } from "./App";
import { highlightText } from "@speed-highlight/core";
import "./highlight-github-light.css";

interface OutputPanelProps {
  result: RunResult | null;
  running: boolean;
  statusMessage?: string;
  slug?: string; // set after the report is saved
  onSaveAndOpen?: () => Promise<string | undefined>; // saves, returns slug, caller opens tab
}

export function OutputPanel({ result, running, statusMessage, slug, onSaveAndOpen }: OutputPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [activeTab, setActiveTab] = useState<"report" | "code">("report");
  const lastHtmlRef = useRef<string>("");
  const [opening, setOpening] = useState(false);

  const handleSaveAndOpen = async () => {
    if (!onSaveAndOpen || opening) return;
    setOpening(true);
    try {
      const resolvedSlug = await onSaveAndOpen();
      if (resolvedSlug) {
        window.open(`/r/${resolvedSlug}`, "_blank", "noopener,noreferrer");
      }
    } finally {
      setOpening(false);
    }
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    if (running) {
      iframe.srcdoc = "";
      lastHtmlRef.current = "";
      return;
    }
    // Only reassign srcdoc when html actually changes — avoids reloading the
    // iframe when unrelated result fields (e.g. logs) update
    if (result?.html && result.html !== lastHtmlRef.current) {
      lastHtmlRef.current = result.html;
      iframe.srcdoc = result.html;
    } else if (!result?.html && lastHtmlRef.current) {
      iframe.srcdoc = "";
      lastHtmlRef.current = "";
    }
  }, [result?.html, running]);

  return (
    <div style={styles.panel}>
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === "report" ? styles.tabActive : {}) }}
          onClick={() => setActiveTab("report")}
        >
          Report
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === "code" ? styles.tabActive : {}) }}
          onClick={() => setActiveTab("code")}
        >
          Generated Code
        </button>

      </div>

      <div style={styles.content}>
        {/* Report tab — always mounted, hidden when code tab is active */}
        <div style={{ ...styles.reportArea, display: activeTab === "report" ? "flex" : "none" }}>
          {/* Browser chrome */}
          <div style={styles.browserChrome}>
            <div style={styles.trafficLights}>
              <div style={{ ...styles.dot, background: "#ff5f57" }} />
              <div style={{ ...styles.dot, background: "#febc2e" }} />
              <div style={{ ...styles.dot, background: "#28c840" }} />
            </div>
            <div style={styles.addressBar}>
              {slug
                ? `dynamic-workers-report-builder.craigsdemos.workers.dev/r/${slug}`
                : result?.workerId
                ? `dynamic-workers-report-builder.craigsdemos.workers.dev/r/${result.workerId}`
                : "dynamic-workers-report-builder.craigsdemos.workers.dev"}
            </div>
            {result?.workerId && onSaveAndOpen && (
              <button
                onClick={handleSaveAndOpen}
                disabled={opening}
                title={slug ? "Open in new tab" : "Save and open in new tab"}
                style={{
                  ...styles.openTabBtn,
                  ...(opening ? styles.openTabBtnDisabled : {}),
                }}
              >
                {opening ? "…" : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                )}
              </button>
            )}
          </div>

          {/* Content area */}
          <div style={styles.browserContent}>
            {running && (
              <div style={styles.loadingOverlay}>
                <div style={styles.spinner} />
                <div style={styles.loadingText}>
                  {statusMessage ?? "Generating code with Workers AI…"}
                </div>
              </div>
            )}
            {!running && result?.workerError && (
              <div style={styles.errorBanner}>
                <div style={styles.errorTitle}>Worker Error</div>
                <div style={styles.errorMessage}>{result.workerError.message}</div>
                {result.workerError.stack && (
                  <pre style={styles.errorStack}>{result.workerError.stack}</pre>
                )}
              </div>
            )}
            <iframe
              ref={iframeRef}
              style={{
                ...styles.iframe,
                display: running || (result?.workerError && !result.html) ? "none" : "block",
              }}
              sandbox="allow-scripts"
              title="Report Output"
            />
            {!running && !result && (
              <div style={styles.placeholder}>
                <div style={styles.placeholderIcon}>⚡</div>
                <div style={styles.placeholderText}>
                  Enter a prompt and click Run to generate a report
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Code tab — always mounted, hidden when report tab is active */}
        <div style={{ ...styles.codeArea, display: activeTab === "code" ? "block" : "none" }}>
          {result?.generatedCode ? (
            <HighlightedCode code={result.generatedCode} />
          ) : (
            <div style={styles.placeholder}>
              <div style={styles.placeholderText}>No code generated yet</div>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Worker Logs */}
      <div style={styles.logsSection}>
        <div style={styles.logHeader}>
          <span style={styles.logTitle}>Dynamic Worker Logs</span>
        </div>
        <div style={styles.logEntries}>
          {result?.logs.map((log, i) => (
            <LogLine key={i} log={log} />
          ))}
          {!running && result && result.logs.length === 0 && (
            <div style={{ ...styles.logEntry, color: "#b0a090" }}>
              No console output from dynamic worker
            </div>
          )}
          {!running && !result && (
            <div style={{ ...styles.logEntry, color: "#b0a090" }}>
              Logs from the dynamic worker will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HighlightedCode({ code }: { code: string }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    highlightText(code, "js").then((html) => {
      if (ref.current) ref.current.innerHTML = html;
    });
  }, [code]);

  return (
    <pre style={styles.code}>
      <code ref={ref} className="shj-lang-js">{code}</code>
    </pre>
  );
}

function LogLine({ log }: { log: LogEntry }) {
  const levelColor: Record<string, string> = {
    log: "#8a7968",
    info: "#2563eb",
    warn: "#c07800",
    error: "#c05a00",
    debug: "#7c5cbf",
  };
  const color = levelColor[log.level] ?? "#8a7968";
  const ts = new Date(log.timestamp).toISOString().split("T")[1].slice(0, 12);

  return (
    <div style={styles.logEntry}>
      <span style={{ ...styles.logTs }}>{ts}</span>
      <span style={{ ...styles.logLevel, color }}>{log.level}</span>
      <span style={styles.logMsg}>{log.message}</span>
    </div>
  );
}


const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: "flex",
    flexDirection: "column",
    background: "transparent",
    overflow: "hidden",
  },
  tabs: {
    display: "flex",
    alignItems: "center",
    gap: 0,
    borderBottom: "1px solid #e8e0d5",
    padding: "0 16px",
    background: "rgba(255,251,245,0.8)",
    minHeight: 40,
  },
  tab: {
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    color: "#8a7968",
    cursor: "pointer",
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 500,
    outline: "none",
  },
  tabActive: {
    color: "#1a1a1a",
    borderBottomColor: "#f6821f",
  },
  content: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  reportArea: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "#e8e0d5",
  },
  browserChrome: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    background: "#f5f0e8",
    borderBottom: "1px solid #e8e0d5",
    flexShrink: 0,
  },
  trafficLights: {
    display: "flex",
    gap: 6,
    flexShrink: 0,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
  },
  addressBar: {
    flex: 1,
    background: "#fff",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 12,
    color: "#6b5d50",
    fontFamily: "monospace",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    border: "1px solid #e8e0d5",
  },
  openTabBtn: {
    flexShrink: 0,
    background: "none",
    border: "none",
    color: "#8a7968",
    cursor: "pointer",
    padding: "4px 6px",
    borderRadius: 5,
    display: "flex",
    alignItems: "center",
    lineHeight: 1,
  },
  openTabBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  browserContent: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    background: "#fff",
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
    background: "#fff",
  },
  loadingOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    background: "rgba(255,251,245,0.95)",
    zIndex: 10,
  },
  spinner: {
    width: 36,
    height: 36,
    border: "3px solid #e8e0d5",
    borderTopColor: "#f6821f",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    color: "#8a7968",
    fontSize: 14,
  },
  errorBanner: {
    background: "#fff5f0",
    border: "1px solid #fcd5b0",
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  errorTitle: {
    color: "#c05a00",
    fontWeight: 700,
    marginBottom: 8,
    fontSize: 14,
  },
  errorMessage: {
    color: "#7a3500",
    fontSize: 13,
    fontFamily: "monospace",
    wordBreak: "break-all",
  },
  errorStack: {
    color: "#8a7968",
    fontSize: 11,
    fontFamily: "monospace",
    marginTop: 8,
    overflow: "auto",
    maxHeight: 120,
    background: "#fff8f2",
    padding: 8,
    borderRadius: 4,
  },
  placeholder: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    background: "rgba(255,251,245,0.9)",
  },
  placeholderIcon: {
    fontSize: 48,
    opacity: 0.5,
  },
  placeholderText: {
    fontSize: 14,
    color: "#8a7968",
    textAlign: "center",
  },
  codeArea: {
    height: "100%",
    overflow: "auto",
    padding: 16,
    background: "#fffbf5",
  },
  code: {
    margin: 0,
    fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
    fontSize: 12,
    lineHeight: 1.6,
    color: "#4a3f33",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
  logsSection: {
    borderTop: "1px solid #e8e0d5",
    background: "rgba(255,251,245,0.95)",
    maxHeight: 200,
    display: "flex",
    flexDirection: "column",
  },
  logHeader: {
    display: "flex",
    alignItems: "center",
    padding: "6px 12px",
    borderBottom: "1px solid #e8e0d5",
    gap: 12,
  },
  logTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "#8a7968",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  logEntries: {
    flex: 1,
    overflow: "auto",
    padding: "4px 0",
  },
  logEntry: {
    display: "flex",
    gap: 10,
    padding: "3px 12px",
    fontSize: 12,
    fontFamily: "monospace",
    alignItems: "baseline",
  },
  logTs: {
    color: "#b0a090",
    flexShrink: 0,
    fontSize: 11,
  },
  logLevel: {
    flexShrink: 0,
    minWidth: 38,
    fontSize: 11,
  },
  logMsg: {
    color: "#4a3f33",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
};
