/**
 * aria2 log line parsing, verified against real 1.37.0 captures
 * (src/mocks/fixtures.logs.ts).
 *
 * Line format: "2026-09-15 08:15:16.482719 [NOTICE] [HttpListenCommand.cc:108] message"
 */

export type LogLevel = "DEBUG" | "INFO" | "NOTICE" | "WARN" | "ERROR";

export interface LogLine {
  raw: string;
  time?: string;
  level?: LogLevel;
  source?: string;
  message: string;
}

const LINE_RE =
  /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+)\s+\[([A-Z]+)\]\s+(?:\[([^\]]+)\]\s*)?(.*)$/;

export function parseLogLine(raw: string): LogLine {
  const m = LINE_RE.exec(raw);
  if (!m) return { raw, message: raw };
  return {
    raw,
    time: m[1],
    level: m[2] as LogLevel,
    source: m[3],
    message: m[4],
  };
}

export function parseLog(text: string): LogLine[] {
  return text
    .split("\n")
    .map((l) => l.replace(/\r$/, ""))
    .filter((l) => l.trim().length > 0)
    .map(parseLogLine);
}

export const LOG_LEVELS: LogLevel[] = [
  "DEBUG",
  "INFO",
  "NOTICE",
  "WARN",
  "ERROR",
];

/** For a given set of enabled levels, which coarser levels stay visible? */
export function filterLogLines(
  lines: LogLine[],
  query: string,
  levels: Set<LogLevel>,
): LogLine[] {
  const q = query.trim().toLowerCase();
  return lines.filter((line) => {
    if (line.level && !levels.has(line.level)) return false;
    if (q && !line.raw.toLowerCase().includes(q)) return false;
    return true;
  });
}
