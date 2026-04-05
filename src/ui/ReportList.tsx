import { useState } from "react";
import type { SavedReport } from "./App";

interface ReportListProps {
  reports: SavedReport[];
  loading: boolean;
  onKill: (workerId: string) => void;
  onRefresh: () => void;
}

export function ReportList({ reports, loading, onKill, onRefresh }: ReportListProps) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Active Reports</span>
        <span style={styles.count}>{reports.length}</span>
        <button onClick={onRefresh} style={styles.refreshBtn} disabled={loading}>
          {loading ? "…" : "Refresh"}
        </button>
      </div>

      <div style={styles.list}>
        {reports.length === 0 && !loading && (
          <div style={styles.empty}>No saved reports yet. Run a prompt and click Save.</div>
        )}
        {loading && reports.length === 0 && (
          <div style={styles.empty}>Loading…</div>
        )}
        {reports.map((report) => (
          <ReportCard
            key={report.workerId}
            report={report}
            onKill={onKill}
          />
        ))}
      </div>
    </div>
  );
}

function ReportCard({
  report,
  onKill,
}: {
  report: SavedReport;
  onKill: (id: string) => void;
}) {
  const slug = report.slug ?? report.workerId;
  const reportUrl = `/r/${slug}`;
  const shareUrl = `${window.location.origin}/r/${slug}`;
  const age = formatAge(report.createdAt);

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardBody}>
        <div style={styles.prompt} title={report.prompt}>
          {report.prompt.length > 80 ? report.prompt.slice(0, 77) + "…" : report.prompt}
        </div>
        <div style={styles.meta}>
          <span style={styles.age}>{age}</span>
        </div>
        <div style={styles.slugRow}>
          <span style={styles.slugText}>/r/{slug}</span>
          <button onClick={handleCopy} style={styles.copyBtn}>
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>
      <div style={styles.cardActions}>
        <a
          href={reportUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.openBtn}
        >
          Open
        </a>
        <button
          onClick={() => onKill(report.workerId)}
          style={styles.killBtn}
        >
          Kill
        </button>
      </div>
    </div>
  );
}

function formatAge(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderTop: "1px solid #e8e0d5",
    background: "rgba(255,251,245,0.9)",
    padding: "12px 20px 16px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    fontWeight: 600,
    color: "#8a7968",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  count: {
    background: "#f0ebe3",
    color: "#8a7968",
    borderRadius: 10,
    fontSize: 11,
    padding: "1px 7px",
    fontWeight: 600,
  },
  refreshBtn: {
    marginLeft: "auto",
    background: "none",
    border: "1px solid #e8e0d5",
    borderRadius: 4,
    color: "#8a7968",
    padding: "3px 10px",
    fontSize: 12,
    cursor: "pointer",
  },
  list: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  empty: {
    fontSize: 13,
    color: "#b0a090",
    padding: "8px 0",
  },
  card: {
    background: "#fff",
    border: "1px solid #e8e0d5",
    borderRadius: 10,
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 280,
    maxWidth: 420,
    flex: "1 1 280px",
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  prompt: {
    fontSize: 13,
    color: "#1a1a1a",
    lineHeight: 1.4,
    marginBottom: 6,
  },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  age: {
    fontSize: 11,
    color: "#b0a090",
  },
  slugRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  slugText: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#8a7968",
  },
  copyBtn: {
    background: "none",
    border: "1px solid #e8e0d5",
    borderRadius: 3,
    color: "#8a7968",
    padding: "2px 8px",
    fontSize: 11,
    cursor: "pointer",
  },
  cardActions: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    flexShrink: 0,
  },
  openBtn: {
    display: "block",
    background: "#fff8f2",
    border: "1px solid #fcd5b0",
    color: "#c05a00",
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 12,
    cursor: "pointer",
    textDecoration: "none",
    textAlign: "center",
    fontWeight: 500,
  },
  killBtn: {
    background: "#fff",
    border: "1px solid #e8e0d5",
    color: "#b0a090",
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 12,
    cursor: "pointer",
  },
};
