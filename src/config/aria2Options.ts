/**
 * Aria2 option metadata registry.
 *
 * One schema drives three surfaces: the global Aria2 settings page, the
 * new-task advanced options, and the per-task options editor — the same
 * approach AriaNg takes with its option registry.
 *
 * `readonly` marks options aria2 rejects in changeGlobalOption at runtime
 * (startup/RPC/DHT options). They are rendered disabled, not hidden.
 */

export type OptionCategory =
  | "basic"
  | "http-ftp"
  | "http"
  | "ftp-sftp"
  | "bt"
  | "metalink"
  | "rpc"
  | "advanced";

export type OptionSurface = "global" | "new-task" | "task-option";

export type OptionFieldType =
  | "string"
  | "number"
  | "boolean"
  | "text"
  | "select"
  | "password";

export interface Aria2OptionDef {
  key: string;
  type: OptionFieldType;
  category: OptionCategory;
  /** Cannot be changed at runtime via changeGlobalOption. */
  readonly?: boolean;
  /** Render plain byte counts human-readable when the field is read-only. */
  sizeFormat?: boolean;
  /** Allowed values for select fields. */
  choices?: string[];
  /**
   * Input hint. An English source string used as the i18n key — OptionField
   * renders it through i18next, so locales translate it like any other UI
   * string (technical hints without translations fall back to the key).
   */
  placeholder?: string;
  /** Where this definition is used; global settings page shows everything. */
  showIn?: OptionSurface[];
  /**
   * Marks aria2 list options. aria2 parses these as comma-separated only —
   * the zod validation in optionValidation.ts uses this to reject e.g.
   * newline-separated tracker pastes before they silently break the list.
   */
  listFormat?: "comma";
}

export interface OptionCategoryMeta {
  id: OptionCategory;
}

export const optionCategories: OptionCategoryMeta[] = [
  { id: "basic" },
  { id: "http-ftp" },
  { id: "http" },
  { id: "ftp-sftp" },
  { id: "bt" },
  { id: "metalink" },
  { id: "rpc" },
  { id: "advanced" },
];

export function findOptionDef(key: string): Aria2OptionDef | undefined {
  return aria2Options.find((def) => def.key === key);
}

export const aria2Options: Aria2OptionDef[] = [
  // ---------- basic ----------
  {
    key: "dir",
    type: "string",
    category: "basic",
    placeholder: "/downloads",
    showIn: ["global", "new-task"],
  },
  {
    key: "max-concurrent-downloads",
    type: "number",
    category: "basic",
  },
  {
    key: "check-integrity",
    type: "boolean",
    category: "basic",
    showIn: ["global", "new-task"],
  },
  {
    key: "continue",
    type: "boolean",
    category: "basic",
    showIn: ["global", "new-task"],
  },
  {
    key: "log",
    type: "string",
    category: "basic",
  },
  {
    key: "log-level",
    type: "select",
    category: "basic",
    choices: ["debug", "info", "notice", "warn", "error"],
  },
  {
    key: "disk-cache",
    type: "string",
    /** Displayed human-readable (bytes → KB/MB/GB) when read-only. */
    sizeFormat: true,
    category: "basic",
    readonly: true,
  },
  {
    key: "file-allocation",
    type: "select",
    category: "basic",
    choices: ["none", "prealloc", "trunc", "falloc"],
    showIn: ["global", "new-task"],
  },

  // ---------- http-ftp ----------
  {
    key: "split",
    type: "number",
    category: "http-ftp",
    showIn: ["global", "new-task", "task-option"],
  },
  {
    key: "max-connection-per-server",
    type: "number",
    category: "http-ftp",
    showIn: ["global", "new-task", "task-option"],
  },
  {
    key: "min-split-size",
    type: "string",
    /** Displayed human-readable (bytes → KB/MB/GB) when read-only. */
    sizeFormat: true,
    category: "http-ftp",
    showIn: ["global", "new-task", "task-option"],
  },
  {
    key: "max-tries",
    type: "number",
    category: "http-ftp",
  },
  {
    key: "retry-wait",
    type: "number",
    category: "http-ftp",
  },
  {
    key: "connect-timeout",
    type: "number",
    category: "http-ftp",
  },
  {
    key: "timeout",
    type: "number",
    category: "http-ftp",
  },
  {
    key: "lowest-speed-limit",
    type: "string",
    category: "http-ftp",
    showIn: ["global", "new-task", "task-option"],
  },
  {
    key: "max-file-not-found",
    type: "number",
    category: "http-ftp",
  },
  {
    key: "user-agent",
    type: "string",
    category: "http-ftp",
    showIn: ["global", "new-task"],
  },
  {
    key: "all-proxy",
    type: "string",
    category: "http-ftp",
    placeholder: "[http://][user:pass@]host[:port]",
    showIn: ["global", "new-task", "task-option"],
  },
  {
    key: "all-proxy-user",
    type: "string",
    category: "http-ftp",
    showIn: ["global", "new-task"],
  },
  {
    key: "all-proxy-passwd",
    type: "password",
    category: "http-ftp",
    showIn: ["global", "new-task"],
  },
  {
    key: "no-proxy",
    type: "text",
    category: "http-ftp",
  },

  // ---------- http ----------
  {
    key: "http-user",
    type: "string",
    category: "http",
    showIn: ["global", "task-option"],
  },
  {
    key: "http-passwd",
    type: "password",
    category: "http",
    showIn: ["global", "task-option"],
  },
  {
    key: "referer",
    type: "string",
    category: "http",
    showIn: ["global", "new-task"],
  },
  {
    key: "header",
    type: "text",
    category: "http",
    placeholder: "Header1: value1\nHeader2: value2",
    showIn: ["global", "new-task"],
  },
  {
    key: "http-accept-gzip",
    type: "boolean",
    category: "http",
  },
  {
    key: "http-no-cache",
    type: "boolean",
    category: "http",
  },
  {
    key: "enable-http-keep-alive",
    type: "boolean",
    category: "http",
  },
  {
    key: "enable-http-pipelining",
    type: "boolean",
    category: "http",
  },
  {
    key: "use-head",
    type: "boolean",
    category: "http",
  },
  {
    key: "save-cookies",
    type: "string",
    category: "http",
  },
  {
    key: "check-certificate",
    type: "boolean",
    category: "http",
    readonly: true,
  },

  // ---------- ftp-sftp ----------
  {
    key: "ftp-user",
    type: "string",
    category: "ftp-sftp",
  },
  {
    key: "ftp-passwd",
    type: "password",
    category: "ftp-sftp",
  },
  {
    key: "ftp-pasv",
    type: "boolean",
    category: "ftp-sftp",
  },
  {
    key: "ftp-type",
    type: "select",
    category: "ftp-sftp",
    choices: ["binary", "ascii"],
  },
  {
    key: "ftp-reuse-connection",
    type: "boolean",
    category: "ftp-sftp",
  },

  // ---------- bt ----------
  {
    key: "bt-tracker",
    type: "text",
    category: "bt",
    placeholder: "Comma-separated tracker URLs (line breaks are not supported)",
    showIn: ["global", "new-task"],
    listFormat: "comma",
  },
  {
    key: "bt-exclude-tracker",
    type: "text",
    category: "bt",
    listFormat: "comma",
  },
  {
    key: "enable-dht",
    type: "boolean",
    category: "bt",
    readonly: true,
  },
  {
    key: "enable-dht6",
    type: "boolean",
    category: "bt",
    readonly: true,
  },
  {
    key: "enable-peer-exchange",
    type: "boolean",
    category: "bt",
  },
  {
    key: "bt-max-peers",
    type: "number",
    category: "bt",
    showIn: ["global", "task-option"],
  },
  {
    key: "bt-request-peer-speed-limit",
    type: "string",
    category: "bt",
    showIn: ["global", "task-option"],
  },
  {
    key: "bt-require-crypto",
    type: "boolean",
    category: "bt",
  },
  {
    key: "bt-min-crypto-level",
    type: "select",
    category: "bt",
    choices: ["plain", "arc4"],
  },
  {
    key: "bt-force-encryption",
    type: "boolean",
    category: "bt",
  },
  {
    key: "listen-port",
    type: "string",
    category: "bt",
    readonly: true,
  },
  {
    key: "dht-listen-port",
    type: "string",
    category: "bt",
    readonly: true,
  },
  {
    key: "max-overall-upload-limit",
    type: "string",
    category: "bt",
    showIn: ["global"],
  },
  {
    key: "max-upload-limit",
    type: "string",
    category: "bt",
    showIn: ["global", "new-task", "task-option"],
  },
  {
    key: "seed-ratio",
    type: "string",
    category: "bt",
    showIn: ["global", "new-task", "task-option"],
  },
  {
    key: "seed-time",
    type: "number",
    category: "bt",
    showIn: ["global", "new-task", "task-option"],
  },
  {
    key: "bt-seed-unverified",
    type: "boolean",
    category: "bt",
  },
  {
    key: "bt-save-metadata",
    type: "boolean",
    category: "bt",
  },
  {
    key: "bt-stop-timeout",
    type: "number",
    category: "bt",
    showIn: ["global", "task-option"],
  },
  {
    key: "bt-max-open-files",
    type: "number",
    category: "bt",
  },
  {
    key: "bt-detach-seed-only",
    type: "boolean",
    category: "bt",
    readonly: true,
  },
  {
    key: "follow-torrent",
    type: "select",
    category: "bt",
    choices: ["true", "false", "mem"],
  },
  {
    key: "peer-id-prefix",
    type: "string",
    category: "bt",
    readonly: true,
  },
  {
    key: "peer-agent",
    type: "string",
    category: "bt",
    readonly: true,
  },

  // ---------- metalink ----------
  {
    key: "follow-metalink",
    type: "select",
    category: "metalink",
    choices: ["true", "false", "mem"],
  },
  {
    key: "metalink-enable-unique-protocol",
    type: "boolean",
    category: "metalink",
  },

  // ---------- rpc ----------
  {
    key: "rpc-secret",
    type: "password",
    category: "rpc",
    // Not in changeGlobalOption whitelist — set it via the aria2 launch flag
    // and connect with it from Connection Settings.
    readonly: true,
  },
  {
    key: "enable-rpc",
    type: "boolean",
    category: "rpc",
    readonly: true,
  },
  {
    key: "rpc-listen-all",
    type: "boolean",
    category: "rpc",
    readonly: true,
  },
  {
    key: "rpc-listen-port",
    type: "number",
    category: "rpc",
    readonly: true,
  },
  {
    key: "rpc-allow-origin-all",
    type: "boolean",
    category: "rpc",
    readonly: true,
  },
  {
    key: "rpc-max-request-size",
    type: "string",
    category: "rpc",
    readonly: true,
  },

  // ---------- advanced ----------
  {
    key: "max-overall-download-limit",
    type: "string",
    category: "advanced",
  },
  {
    key: "max-download-limit",
    type: "string",
    category: "advanced",
    showIn: ["global", "new-task", "task-option"],
  },
  {
    key: "optimize-concurrent-downloads",
    type: "string",
    category: "advanced",
  },
  {
    key: "allow-overwrite",
    type: "boolean",
    category: "advanced",
    showIn: ["global", "new-task"],
  },
  {
    key: "auto-file-renaming",
    type: "boolean",
    category: "advanced",
  },
  {
    key: "conditional-get",
    type: "boolean",
    category: "advanced",
  },
  {
    key: "download-result",
    type: "select",
    category: "advanced",
    choices: ["default", "remove", "keep", "hide"],
  },
  {
    key: "keep-unfinished-download-result",
    type: "boolean",
    category: "advanced",
  },
  {
    key: "max-download-result",
    type: "number",
    category: "advanced",
  },
  {
    key: "force-save",
    type: "boolean",
    category: "advanced",
    showIn: ["global", "task-option"],
  },
  {
    key: "save-not-found",
    type: "boolean",
    category: "advanced",
  },
  {
    key: "save-session",
    type: "string",
    category: "advanced",
  },
  {
    key: "save-session-interval",
    type: "number",
    category: "advanced",
  },
  {
    key: "auto-save-interval",
    type: "number",
    category: "advanced",
    readonly: true,
  },
  {
    key: "piece-length",
    type: "string",
    /** Displayed human-readable (bytes → KB/MB/GB) when read-only. */
    sizeFormat: true,
    category: "advanced",
  },
  {
    key: "no-file-allocation-limit",
    type: "string",
    /** Displayed human-readable (bytes → KB/MB/GB) when read-only. */
    sizeFormat: true,
    category: "advanced",
  },
  {
    key: "parameterized-uri",
    type: "boolean",
    category: "advanced",
    showIn: ["global", "new-task"],
  },
  {
    key: "realtime-chunk-checksum",
    type: "boolean",
    category: "advanced",
  },
  {
    key: "hash-check-only",
    type: "boolean",
    category: "advanced",
  },
  {
    key: "always-resume",
    type: "boolean",
    category: "advanced",
  },
  {
    key: "max-resume-failure-tries",
    type: "number",
    category: "advanced",
  },
  {
    key: "enable-mmap",
    type: "boolean",
    category: "advanced",
  },
  {
    key: "max-mmap-limit",
    type: "string",
    /** Displayed human-readable (bytes → KB/MB/GB) when read-only. */
    sizeFormat: true,
    category: "advanced",
  },
  {
    key: "async-dns",
    type: "boolean",
    category: "advanced",
  },
  {
    key: "disable-ipv6",
    type: "boolean",
    category: "advanced",
    readonly: true,
  },
  {
    key: "event-poll",
    type: "select",
    category: "advanced",
    choices: ["epoll", "kqueue", "port", "poll", "select"],
    readonly: true,
  },
  {
    key: "min-tls-version",
    type: "select",
    category: "advanced",
    choices: ["SSLv3", "TLSv1", "TLSv1.1", "TLSv1.2", "TLSv1.3"],
    readonly: true,
  },
  {
    key: "quiet",
    type: "boolean",
    category: "advanced",
    readonly: true,
  },
  {
    key: "console-log-level",
    type: "select",
    category: "advanced",
    choices: ["debug", "info", "notice", "warn", "error"],
    readonly: true,
  },
];

export function getOptionsForCategory(
  category: OptionCategory,
  surface: OptionSurface,
) {
  if (surface === "global") {
    return aria2Options.filter((o) => o.category === category);
  }
  return aria2Options.filter(
    (o) => o.category === category && o.showIn?.includes(surface),
  );
}

export function getOptionsForSurface(surface: OptionSurface) {
  return aria2Options.filter((o) => o.showIn?.includes(surface));
}
