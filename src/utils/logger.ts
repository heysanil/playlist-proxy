import pc from "picocolors";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
    timestamp: string;
    method: string;
    path: string;
    status: number;
    duration: number;
    details?: Record<string, unknown>;
}

interface LoggerOptions {
    verbose: boolean;
}

let options: LoggerOptions = {
    verbose: false,
};

// Circular buffer for log entries
const MAX_LOG_ENTRIES = 1000;
const logBuffer: LogEntry[] = [];
const logListeners: Set<(entry: LogEntry) => void> = new Set();

export function setLoggerOptions(opts: Partial<LoggerOptions>) {
    options = { ...options, ...opts };
}

export function getLogBuffer(): LogEntry[] {
    return [...logBuffer];
}

export function addLogListener(listener: (entry: LogEntry) => void) {
    logListeners.add(listener);
    return () => logListeners.delete(listener);
}

function timestamp(): string {
    return pc.dim(new Date().toISOString().slice(11, 23));
}

function rawTimestamp(): string {
    return new Date().toISOString();
}

export function debug(...args: unknown[]) {
    if (options.verbose) {
        console.log(timestamp(), pc.magenta("DBG"), ...args);
    }
}

export function info(...args: unknown[]) {
    console.log(timestamp(), pc.blue("INF"), ...args);
}

export function warn(...args: unknown[]) {
    console.log(timestamp(), pc.yellow("WRN"), ...args);
}

export function error(...args: unknown[]) {
    console.log(timestamp(), pc.red("ERR"), ...args);
}

export function success(...args: unknown[]) {
    console.log(timestamp(), pc.green("OK "), ...args);
}

// Request logging helpers
export function logRequest(method: string, path: string, status: number, duration: number) {
    const statusColor =
        status >= 500 ? pc.red : status >= 400 ? pc.yellow : status >= 300 ? pc.cyan : pc.green;

    const durationStr =
        duration < 1000 ? `${duration.toFixed(0)}ms` : `${(duration / 1000).toFixed(2)}s`;

    console.log(
        timestamp(),
        pc.dim(method.padEnd(4)),
        statusColor(status.toString()),
        path,
        pc.dim(durationStr)
    );
}

export function logRequestVerbose(
    method: string,
    path: string,
    status: number,
    duration: number,
    details: Record<string, unknown>
) {
    // Don't log admin UI requests to avoid noise
    if (path.startsWith("/admin")) {
        return;
    }

    logRequest(method, path, status, duration);
    if (options.verbose && Object.keys(details).length > 0) {
        for (const [key, value] of Object.entries(details)) {
            console.log(pc.dim(`         ${key}: ${value}`));
        }
    }

    // Add to buffer
    const entry: LogEntry = {
        timestamp: rawTimestamp(),
        method,
        path,
        status,
        duration,
        details: Object.keys(details).length > 0 ? details : undefined,
    };

    logBuffer.push(entry);
    if (logBuffer.length > MAX_LOG_ENTRIES) {
        logBuffer.shift();
    }

    // Notify listeners
    for (const listener of logListeners) {
        try {
            listener(entry);
        } catch {
            // Ignore listener errors
        }
    }
}
