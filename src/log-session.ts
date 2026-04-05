import {
  DurableObject,
  RpcTarget,
  WorkerEntrypoint,
  exports as runtimeExports,
} from "cloudflare:workers";

export interface LogEntry {
  level: string;
  message: string;
  timestamp: number;
}

type DynamicWorkerEventKind = "request" | "log" | "exception";

interface StructuredDynamicWorkerEvent {
  source: "dynamic-worker-tail";
  workerId: string;
  kind: DynamicWorkerEventKind;
  level: string;
  message: string;
  timestamp: number;
  outcome?: string;
  method?: string;
  url?: string;
  path?: string;
  status?: number;
  name?: string;
  stack?: string;
}

function normalizeLogMessage(message: unknown): string {
  if (Array.isArray(message)) {
    return message
      .map((entry) =>
        typeof entry === "string" ? entry : JSON.stringify(entry)
      )
      .join(" ");
  }
  return typeof message === "string" ? message : JSON.stringify(message);
}

function isFetchTraceEvent(
  event: TraceItem["event"]
): event is TraceItemFetchEventInfo {
  return event !== null && "request" in (event as object);
}

function toRequestSummary(
  event: TraceItem,
  workerId: string
): StructuredDynamicWorkerEvent | null {
  if (!isFetchTraceEvent(event.event)) return null;
  const url = (event.event as TraceItemFetchEventInfo).request.url;
  const path = new URL(url).pathname;
  const status = (event.event as TraceItemFetchEventInfo).response?.status;
  return {
    source: "dynamic-worker-tail",
    workerId,
    kind: "request",
    level: event.outcome === "exception" ? "error" : "info",
    message: `${(event.event as TraceItemFetchEventInfo).request.method} ${path}${status !== undefined ? ` -> ${status}` : ""} (${event.outcome})`,
    timestamp: event.eventTimestamp ?? Date.now(),
    outcome: event.outcome,
    method: (event.event as TraceItemFetchEventInfo).request.method,
    url,
    path,
    status,
  };
}

function toExceptionEvents(event: TraceItem, workerId: string): StructuredDynamicWorkerEvent[] {
  return event.exceptions.map((exception: TraceException) => ({
    source: "dynamic-worker-tail" as const,
    workerId,
    kind: "exception" as const,
    level: "error",
    message: exception.message,
    timestamp: exception.timestamp,
    name: exception.name,
    stack: exception.stack,
  }));
}

function toLogEvents(event: TraceItem, workerId: string): StructuredDynamicWorkerEvent[] {
  return event.logs.map((log: TraceLog) => ({
    source: "dynamic-worker-tail" as const,
    workerId,
    kind: "log" as const,
    level: log.level,
    message: normalizeLogMessage(log.message),
    timestamp: log.timestamp,
  }));
}

function toRealtimeLogEntries(events: StructuredDynamicWorkerEvent[]): LogEntry[] {
  return events
    .filter((e) => e.kind !== "request")
    .map((e) => ({
      level: e.level,
      message: e.kind === "exception" && e.name ? `${e.name}: ${e.message}` : e.message,
      timestamp: e.timestamp,
    }));
}

// LogWaiter is an RpcTarget — it stays alive inside the DO isolate while
// the caller holds the stub, so getLogs() correctly blocks until logs arrive.
class LogWaiter extends RpcTarget {
  private logs: LogEntry[] = [];
  private resolve: ((logs: LogEntry[]) => void) | undefined;

  addLogs(logs: LogEntry[]) {
    this.logs.push(...logs);
    if (this.resolve) {
      this.resolve(this.logs);
      this.resolve = undefined;
    }
  }

  async getLogs(timeoutMs: number): Promise<LogEntry[]> {
    if (this.logs.length > 0) return this.logs;
    return new Promise<LogEntry[]>((resolve) => {
      const timeout = setTimeout(() => resolve(this.logs), timeoutMs);
      this.resolve = (logs) => {
        clearTimeout(timeout);
        resolve(logs);
      };
    });
  }
}

export class LogSession extends DurableObject {
  private waiter: LogWaiter | null = null;

  async addLogs(logs: LogEntry[]) {
    if (this.waiter) {
      this.waiter.addLogs(logs);
    }
  }

  async waitForLogs(): Promise<LogWaiter> {
    this.waiter = new LogWaiter();
    return this.waiter;
  }
}

// ---- Type plumbing for cross-isolate exports access -------------------------

type LogSessionExports = {
  LogSession: {
    getByName(name: string): {
      addLogs(logs: LogEntry[]): Promise<void>;
      waitForLogs(): Promise<LogWaiter>;
    };
  };
};

const exports = runtimeExports as unknown as LogSessionExports;

// -----------------------------------------------------------------------------

interface DynamicWorkerTailProps {
  workerId: string;
}

export class DynamicWorkerTail extends WorkerEntrypoint<never, DynamicWorkerTailProps> {
  override async tail(events: TraceItem[]) {
    const logSessionStub = exports.LogSession.getByName(this.ctx.props.workerId);

    for (const event of events) {
      const structuredEvents: StructuredDynamicWorkerEvent[] = [];
      const requestSummary = toRequestSummary(event, this.ctx.props.workerId);
      if (requestSummary) structuredEvents.push(requestSummary);
      structuredEvents.push(...toLogEvents(event, this.ctx.props.workerId));
      structuredEvents.push(...toExceptionEvents(event, this.ctx.props.workerId));

      if (structuredEvents.length > 0) {
        await logSessionStub.addLogs(toRealtimeLogEntries(structuredEvents));
      }
    }
  }
}
