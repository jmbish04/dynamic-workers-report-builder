import { useState } from "react";

interface PromptPanelProps {
  onRun: (prompt: string) => void;
  onSave: (prompt: string) => void;
  running: boolean;
  hasResult: boolean;
  demoPrompts: string[];
}

export function PromptPanel({ onRun, onSave, running, hasResult, demoPrompts }: PromptPanelProps) {
  const [prompt, setPrompt] = useState(demoPrompts[0]);
  const [saving, setSaving] = useState(false);

  const handleRun = () => {
    if (!prompt.trim() || running) return;
    onRun(prompt.trim());
  };

  const handleSave = async () => {
    if (!hasResult || saving) return;
    setSaving(true);
    await onSave(prompt.trim());
    setSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleRun();
    }
  };

  return (
    <div style={styles.panel}>
      <div style={styles.section}>
        <label style={styles.label}>Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the report you want..."
          rows={6}
          style={styles.textarea}
        />
        <div style={styles.hint}>Cmd+Enter to run</div>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>Demo Prompts</label>
        <div style={styles.demoList}>
          {demoPrompts.map((p, i) => (
            <button
              key={i}
              style={{
                ...styles.demoButton,
                ...(prompt === p ? styles.demoButtonActive : {}),
              }}
              onClick={() => setPrompt(p)}
            >
              {p.length > 60 ? p.slice(0, 57) + "…" : p}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.actions}>
        <button
          onClick={handleRun}
          disabled={running || !prompt.trim()}
          style={{
            ...styles.btn,
            ...styles.btnPrimary,
            ...(running || !prompt.trim() ? styles.btnDisabled : {}),
          }}
        >
          {running ? "Running…" : "Run"}
        </button>
        <button
          onClick={handleSave}
          disabled={!hasResult || saving}
          style={{
            ...styles.btn,
            ...styles.btnSecondary,
            ...(!hasResult || saving ? styles.btnDisabled : {}),
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    padding: 20,
    borderRight: "1px solid #e8e0d5",
    background: "rgba(255,251,245,0.7)",
    overflowY: "auto",
  },
  section: {
    marginBottom: 20,
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "#8a7968",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 8,
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    background: "#fff",
    border: "1px solid #e8e0d5",
    borderRadius: 8,
    color: "#1a1a1a",
    padding: "10px 12px",
    fontSize: 13,
    lineHeight: 1.5,
    resize: "vertical",
    outline: "none",
    fontFamily: "inherit",
  },
  hint: {
    fontSize: 11,
    color: "#b0a090",
    marginTop: 4,
    textAlign: "right",
  },
  demoList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  demoButton: {
    background: "#fff",
    border: "1px solid #e8e0d5",
    borderRadius: 8,
    color: "#6b5d50",
    padding: "7px 10px",
    fontSize: 12,
    textAlign: "left",
    cursor: "pointer",
    lineHeight: 1.4,
  },
  demoButtonActive: {
    borderColor: "#f6821f",
    color: "#c05a00",
    background: "#fff8f2",
  },
  actions: {
    display: "flex",
    gap: 10,
    marginTop: "auto",
    paddingTop: 8,
  },
  btn: {
    flex: 1,
    padding: "10px 16px",
    borderRadius: 999,
    border: "none",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  btnPrimary: {
    background: "#f6821f",
    color: "#fff",
  },
  btnSecondary: {
    background: "#fff",
    color: "#6b5d50",
    border: "1px solid #e8e0d5",
  },
  btnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
};
