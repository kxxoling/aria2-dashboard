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
  label: { en: string; zh: string };
  type: OptionFieldType;
  category: OptionCategory;
  /** Cannot be changed at runtime via changeGlobalOption. */
  readonly?: boolean;
  /** Render plain byte counts human-readable when the field is read-only. */
  sizeFormat?: boolean;
  /** Allowed values for select fields. */
  choices?: string[];
  placeholder?: { en: string; zh: string };
  /** Unit hint, e.g. "MiB/s" or seconds. */
  suffix?: { en: string; zh: string };
  /** Where this definition is used; global settings page shows everything. */
  showIn?: OptionSurface[];
}

export interface OptionCategoryMeta {
  id: OptionCategory;
  label: { en: string; zh: string };
}

export const optionCategories: OptionCategoryMeta[] = [
  { id: "basic", label: { en: "Basic", zh: "基本设置" } },
  { id: "http-ftp", label: { en: "HTTP/FTP/SFTP", zh: "HTTP/FTP/SFTP" } },
  { id: "http", label: { en: "HTTP", zh: "HTTP" } },
  { id: "ftp-sftp", label: { en: "FTP/SFTP", zh: "FTP/SFTP" } },
  { id: "bt", label: { en: "BitTorrent", zh: "BT 设置" } },
  { id: "metalink", label: { en: "Metalink", zh: "Metalink" } },
  { id: "rpc", label: { en: "RPC", zh: "RPC" } },
  { id: "advanced", label: { en: "Advanced", zh: "高级设置" } },
];

const both = (v: string) => ({ en: v, zh: v });

export const aria2Options: Aria2OptionDef[] = [
  // ---------- basic ----------
  {
    key: "dir",
    label: { en: "Download directory", zh: "下载目录" },
    type: "string",
    category: "basic",
    placeholder: { en: "/downloads", zh: "/downloads" },
    showIn: ["global", "new-task"],
  },
  {
    key: "max-concurrent-downloads",
    label: { en: "Max concurrent downloads", zh: "最大同时下载数" },
    type: "number",
    category: "basic",
  },
  {
    key: "check-integrity",
    label: { en: "Verify integrity if supported", zh: "校验完整性（如支持）" },
    type: "boolean",
    category: "basic",
    showIn: ["global", "new-task"],
  },
  {
    key: "continue",
    label: { en: "Resume partially downloaded files", zh: "断点续传" },
    type: "boolean",
    category: "basic",
    showIn: ["global", "new-task"],
  },
  {
    key: "log",
    label: { en: "Log file", zh: "日志文件" },
    type: "string",
    category: "basic",
    placeholder: both(""),
  },
  {
    key: "log-level",
    label: { en: "Log level", zh: "日志级别" },
    type: "select",
    category: "basic",
    choices: ["debug", "info", "notice", "warn", "error"],
  },
  {
    key: "disk-cache",
    label: { en: "Disk cache", zh: "磁盘缓存" },
    type: "string",
    /** Displayed human-readable (bytes → KB/MB/GB) when read-only. */
    sizeFormat: true,
    category: "basic",
    readonly: true,
    suffix: both("e.g. 32M"),
  },
  {
    key: "file-allocation",
    label: { en: "File allocation method", zh: "文件预分配方式" },
    type: "select",
    category: "basic",
    choices: ["none", "prealloc", "trunc", "falloc"],
    showIn: ["global", "new-task"],
  },

  // ---------- http-ftp ----------
  {
    key: "split",
    label: { en: "Splits (connections per download)", zh: "任务分片数" },
    type: "number",
    category: "http-ftp",
    showIn: ["global", "new-task", "task-option"],
  },
  {
    key: "max-connection-per-server",
    label: { en: "Max connections per server", zh: "单服务器最大连接数" },
    type: "number",
    category: "http-ftp",
    showIn: ["global", "new-task", "task-option"],
  },
  {
    key: "min-split-size",
    label: { en: "Min split size", zh: "最小分片大小" },
    type: "string",
    /** Displayed human-readable (bytes → KB/MB/GB) when read-only. */
    sizeFormat: true,
    category: "http-ftp",
    suffix: both("e.g. 20M"),
    showIn: ["global", "new-task", "task-option"],
  },
  {
    key: "max-tries",
    label: { en: "Max tries", zh: "最大重试次数" },
    type: "number",
    category: "http-ftp",
  },
  {
    key: "retry-wait",
    label: { en: "Retry wait", zh: "重试等待" },
    type: "number",
    category: "http-ftp",
    suffix: { en: "sec", zh: "秒" },
  },
  {
    key: "connect-timeout",
    label: { en: "Connect timeout", zh: "连接超时" },
    type: "number",
    category: "http-ftp",
    suffix: { en: "sec", zh: "秒" },
  },
  {
    key: "timeout",
    label: { en: "Timeout", zh: "超时时间" },
    type: "number",
    category: "http-ftp",
    suffix: { en: "sec", zh: "秒" },
  },
  {
    key: "lowest-speed-limit",
    label: { en: "Lowest speed limit", zh: "最低速度限制" },
    type: "string",
    category: "http-ftp",
    suffix: both("e.g. 50K"),
    showIn: ["global", "new-task", "task-option"],
  },
  {
    key: "max-file-not-found",
    label: { en: "Max file not found tries", zh: "文件未找到最大重试" },
    type: "number",
    category: "http-ftp",
  },
  {
    key: "user-agent",
    label: { en: "User agent", zh: "User-Agent" },
    type: "string",
    category: "http-ftp",
    showIn: ["global", "new-task"],
  },
  {
    key: "all-proxy",
    label: { en: "Proxy (all protocols)", zh: "代理（全部协议）" },
    type: "string",
    category: "http-ftp",
    placeholder: both("[http://][user:pass@]host[:port]"),
    showIn: ["global", "new-task", "task-option"],
  },
  {
    key: "all-proxy-user",
    label: { en: "Proxy username", zh: "代理用户名" },
    type: "string",
    category: "http-ftp",
    showIn: ["global", "new-task"],
  },
  {
    key: "all-proxy-passwd",
    label: { en: "Proxy password", zh: "代理密码" },
    type: "password",
    category: "http-ftp",
    showIn: ["global", "new-task"],
  },
  {
    key: "no-proxy",
    label: {
      en: "Bypass proxy for listed hosts",
      zh: "对列表中的主机不用代理",
    },
    type: "text",
    category: "http-ftp",
  },

  // ---------- http ----------
  {
    key: "http-user",
    label: { en: "HTTP username", zh: "HTTP 用户名" },
    type: "string",
    category: "http",
    showIn: ["global", "task-option"],
  },
  {
    key: "http-passwd",
    label: { en: "HTTP password", zh: "HTTP 密码" },
    type: "password",
    category: "http",
    showIn: ["global", "task-option"],
  },
  {
    key: "referer",
    label: { en: "Referer", zh: "Referer" },
    type: "string",
    category: "http",
    showIn: ["global", "new-task"],
  },
  {
    key: "header",
    label: { en: "Custom headers", zh: "自定义请求头" },
    type: "text",
    category: "http",
    placeholder: both("Header1: value1\nHeader2: value2"),
    showIn: ["global", "new-task"],
  },
  {
    key: "http-accept-gzip",
    label: { en: "Accept gzip responses", zh: "接受 gzip 响应" },
    type: "boolean",
    category: "http",
  },
  {
    key: "http-no-cache",
    label: { en: "Disable cache from proxies", zh: "禁用代理缓存" },
    type: "boolean",
    category: "http",
  },
  {
    key: "enable-http-keep-alive",
    label: { en: "Enable HTTP keep-alive", zh: "启用 HTTP keep-alive" },
    type: "boolean",
    category: "http",
  },
  {
    key: "enable-http-pipelining",
    label: { en: "Enable HTTP pipelining", zh: "启用 HTTP pipelining" },
    type: "boolean",
    category: "http",
  },
  {
    key: "use-head",
    label: { en: "Use HEAD for first request", zh: "首次请求使用 HEAD" },
    type: "boolean",
    category: "http",
  },
  {
    key: "save-cookies",
    label: { en: "Cookies save file", zh: "Cookie 保存文件" },
    type: "string",
    category: "http",
  },
  {
    key: "check-certificate",
    label: { en: "Verify TLS certificates", zh: "校验 TLS 证书" },
    type: "boolean",
    category: "http",
    readonly: true,
  },

  // ---------- ftp-sftp ----------
  {
    key: "ftp-user",
    label: { en: "FTP username", zh: "FTP 用户名" },
    type: "string",
    category: "ftp-sftp",
  },
  {
    key: "ftp-passwd",
    label: { en: "FTP password", zh: "FTP 密码" },
    type: "password",
    category: "ftp-sftp",
  },
  {
    key: "ftp-pasv",
    label: { en: "Passive mode", zh: "被动模式" },
    type: "boolean",
    category: "ftp-sftp",
  },
  {
    key: "ftp-type",
    label: { en: "Transfer type", zh: "传输类型" },
    type: "select",
    category: "ftp-sftp",
    choices: ["binary", "ascii"],
  },
  {
    key: "ftp-reuse-connection",
    label: { en: "Reuse connection", zh: "复用连接" },
    type: "boolean",
    category: "ftp-sftp",
  },

  // ---------- bt ----------
  {
    key: "bt-tracker",
    label: { en: "BT tracker servers", zh: "BT tracker 服务器" },
    type: "text",
    category: "bt",
    placeholder: {
      en: "One tracker URL per line, comma separated also works",
      zh: "每行一个 tracker，也可用逗号分隔",
    },
    showIn: ["global", "new-task"],
  },
  {
    key: "bt-exclude-tracker",
    label: { en: "Excluded trackers", zh: "排除的 tracker" },
    type: "text",
    category: "bt",
  },
  {
    key: "enable-dht",
    label: { en: "Enable DHT (IPv4)", zh: "启用 DHT（IPv4）" },
    type: "boolean",
    category: "bt",
    readonly: true,
  },
  {
    key: "enable-dht6",
    label: { en: "Enable DHT (IPv6)", zh: "启用 DHT（IPv6）" },
    type: "boolean",
    category: "bt",
    readonly: true,
  },
  {
    key: "enable-peer-exchange",
    label: { en: "Enable peer exchange", zh: "启用节点交换 (PEX)" },
    type: "boolean",
    category: "bt",
  },
  {
    key: "bt-max-peers",
    label: { en: "Max peers per torrent", zh: "单种子最大节点数" },
    type: "number",
    category: "bt",
    showIn: ["global", "task-option"],
  },
  {
    key: "bt-request-peer-speed-limit",
    label: { en: "Desired peer speed", zh: "期望节点速度" },
    type: "string",
    category: "bt",
    suffix: both("e.g. 50K"),
    showIn: ["global", "task-option"],
  },
  {
    key: "bt-require-crypto",
    label: { en: "Require encrypted transport", zh: "要求加密传输" },
    type: "boolean",
    category: "bt",
  },
  {
    key: "bt-min-crypto-level",
    label: { en: "Min crypto level", zh: "最低加密级别" },
    type: "select",
    category: "bt",
    choices: ["plain", "arc4"],
  },
  {
    key: "bt-force-encryption",
    label: { en: "Force encryption", zh: "强制加密" },
    type: "boolean",
    category: "bt",
  },
  {
    key: "listen-port",
    label: { en: "Listen port (BT)", zh: "BT 监听端口" },
    type: "string",
    category: "bt",
    readonly: true,
  },
  {
    key: "dht-listen-port",
    label: { en: "DHT listen port", zh: "DHT 监听端口" },
    type: "string",
    category: "bt",
    readonly: true,
  },
  {
    key: "max-overall-upload-limit",
    label: { en: "Overall upload limit", zh: "全局上传限速" },
    type: "string",
    category: "bt",
    suffix: both("e.g. 5M / 0 = unlimited"),
    showIn: ["global"],
  },
  {
    key: "max-upload-limit",
    label: { en: "Per-task upload limit", zh: "单任务上传限速" },
    type: "string",
    category: "bt",
    suffix: both("e.g. 1M / 0 = unlimited"),
    showIn: ["global", "new-task", "task-option"],
  },
  {
    key: "seed-ratio",
    label: { en: "Share ratio to stop seeding", zh: "停止做种分享率" },
    type: "string",
    category: "bt",
    suffix: { en: "e.g. 2.0", zh: "如 2.0" },
    showIn: ["global", "new-task", "task-option"],
  },
  {
    key: "seed-time",
    label: { en: "Seeding time", zh: "做种时间" },
    type: "number",
    category: "bt",
    suffix: { en: "min", zh: "分钟" },
    showIn: ["global", "new-task", "task-option"],
  },
  {
    key: "bt-seed-unverified",
    label: { en: "Seed unverified files", zh: "做种未校验文件" },
    type: "boolean",
    category: "bt",
  },
  {
    key: "bt-save-metadata",
    label: { en: "Save torrent metadata", zh: "保存种子元数据" },
    type: "boolean",
    category: "bt",
  },
  {
    key: "bt-stop-timeout",
    label: { en: "BT stop timeout", zh: "BT 停止超时" },
    type: "number",
    category: "bt",
    suffix: { en: "sec", zh: "秒" },
    showIn: ["global", "task-option"],
  },
  {
    key: "bt-max-open-files",
    label: { en: "Max open files (BT)", zh: "BT 最大打开文件数" },
    type: "number",
    category: "bt",
  },
  {
    key: "bt-detach-seed-only",
    label: { en: "Detach seed-only tasks", zh: "分离仅做种任务" },
    type: "boolean",
    category: "bt",
    readonly: true,
  },
  {
    key: "follow-torrent",
    label: { en: "Follow torrent behavior", zh: "种子文件处理方式" },
    type: "select",
    category: "bt",
    choices: ["true", "false", "mem"],
  },
  {
    key: "peer-id-prefix",
    label: { en: "Peer ID prefix", zh: "Peer ID 前缀" },
    type: "string",
    category: "bt",
    readonly: true,
  },
  {
    key: "peer-agent",
    label: { en: "Peer agent", zh: "Peer agent" },
    type: "string",
    category: "bt",
    readonly: true,
  },

  // ---------- metalink ----------
  {
    key: "follow-metalink",
    label: { en: "Follow metalink behavior", zh: "Metalink 处理方式" },
    type: "select",
    category: "metalink",
    choices: ["true", "false", "mem"],
  },
  {
    key: "metalink-enable-unique-protocol",
    label: { en: "Use unique protocol", zh: "仅使用唯一协议" },
    type: "boolean",
    category: "metalink",
  },

  // ---------- rpc ----------
  {
    key: "rpc-secret",
    label: { en: "RPC secret token", zh: "RPC 密钥" },
    type: "password",
    category: "rpc",
    // Not in changeGlobalOption whitelist — set it via the aria2 launch flag
    // and connect with it from Connection Settings.
    readonly: true,
    placeholder: both(""),
  },
  {
    key: "enable-rpc",
    label: { en: "Enable RPC", zh: "启用 RPC" },
    type: "boolean",
    category: "rpc",
    readonly: true,
  },
  {
    key: "rpc-listen-all",
    label: { en: "Listen on all interfaces", zh: "监听所有网卡" },
    type: "boolean",
    category: "rpc",
    readonly: true,
  },
  {
    key: "rpc-listen-port",
    label: { en: "RPC port", zh: "RPC 端口" },
    type: "number",
    category: "rpc",
    readonly: true,
  },
  {
    key: "rpc-allow-origin-all",
    label: { en: "Allow all origins", zh: "允许所有来源" },
    type: "boolean",
    category: "rpc",
    readonly: true,
  },
  {
    key: "rpc-max-request-size",
    label: { en: "Max request size", zh: "最大请求体积" },
    type: "string",
    category: "rpc",
    readonly: true,
  },

  // ---------- advanced ----------
  {
    key: "max-overall-download-limit",
    label: { en: "Overall download limit", zh: "全局下载限速" },
    type: "string",
    category: "advanced",
    suffix: both("e.g. 10M / 0 = unlimited"),
  },
  {
    key: "max-download-limit",
    label: { en: "Per-task download limit", zh: "单任务下载限速" },
    type: "string",
    category: "advanced",
    suffix: both("e.g. 5M / 0 = unlimited"),
    showIn: ["global", "new-task", "task-option"],
  },
  {
    key: "optimize-concurrent-downloads",
    label: { en: "Optimize concurrent downloads", zh: "优化并发下载" },
    type: "string",
    category: "advanced",
  },
  {
    key: "allow-overwrite",
    label: { en: "Allow overwrite existing files", zh: "允许覆盖已有文件" },
    type: "boolean",
    category: "advanced",
    showIn: ["global", "new-task"],
  },
  {
    key: "auto-file-renaming",
    label: { en: "Auto rename files", zh: "自动重命名文件" },
    type: "boolean",
    category: "advanced",
  },
  {
    key: "conditional-get",
    label: { en: "Conditional download (timestamp)", zh: "按时间戳条件下载" },
    type: "boolean",
    category: "advanced",
  },
  {
    key: "download-result",
    label: { en: "Download result display", zh: "下载结果展示" },
    type: "select",
    category: "advanced",
    choices: ["default", "remove", "keep", "hide"],
  },
  {
    key: "keep-unfinished-download-result",
    label: { en: "Keep unfinished results", zh: "保留未完成结果" },
    type: "boolean",
    category: "advanced",
  },
  {
    key: "max-download-result",
    label: { en: "Max kept results", zh: "最大保留结果数" },
    type: "number",
    category: "advanced",
  },
  {
    key: "force-save",
    label: { en: "Force save results", zh: "强制保存结果" },
    type: "boolean",
    category: "advanced",
    showIn: ["global", "task-option"],
  },
  {
    key: "save-not-found",
    label: { en: "Save not-found results", zh: "保存未找到结果" },
    type: "boolean",
    category: "advanced",
  },
  {
    key: "save-session",
    label: { en: "Session save file", zh: "会话保存文件" },
    type: "string",
    category: "advanced",
  },
  {
    key: "save-session-interval",
    label: { en: "Session save interval", zh: "会话保存间隔" },
    type: "number",
    category: "advanced",
    suffix: { en: "sec", zh: "秒" },
  },
  {
    key: "auto-save-interval",
    label: { en: "Control file save interval", zh: "控制文件保存间隔" },
    type: "number",
    category: "advanced",
    readonly: true,
    suffix: { en: "sec", zh: "秒" },
  },
  {
    key: "piece-length",
    label: { en: "Piece length", zh: "分片长度" },
    type: "string",
    /** Displayed human-readable (bytes → KB/MB/GB) when read-only. */
    sizeFormat: true,
    category: "advanced",
    suffix: both("e.g. 1M"),
  },
  {
    key: "no-file-allocation-limit",
    label: { en: "No-allocation size limit", zh: "免预分配大小上限" },
    type: "string",
    /** Displayed human-readable (bytes → KB/MB/GB) when read-only. */
    sizeFormat: true,
    category: "advanced",
    suffix: both("e.g. 32M"),
  },
  {
    key: "parameterized-uri",
    label: { en: "Enable parameterized URIs", zh: "启用参数化 URI" },
    type: "boolean",
    category: "advanced",
    showIn: ["global", "new-task"],
  },
  {
    key: "realtime-chunk-checksum",
    label: { en: "Realtime chunk checksum", zh: "实时分块校验" },
    type: "boolean",
    category: "advanced",
  },
  {
    key: "hash-check-only",
    label: { en: "Hash check only", zh: "仅哈希校验" },
    type: "boolean",
    category: "advanced",
  },
  {
    key: "always-resume",
    label: { en: "Always resume", zh: "总是断点续传" },
    type: "boolean",
    category: "advanced",
  },
  {
    key: "max-resume-failure-tries",
    label: { en: "Max resume failure tries", zh: "续传失败最大重试" },
    type: "number",
    category: "advanced",
  },
  {
    key: "enable-mmap",
    label: { en: "Enable mmap", zh: "启用 mmap" },
    type: "boolean",
    category: "advanced",
  },
  {
    key: "max-mmap-limit",
    label: { en: "Max mmap size", zh: "mmap 大小上限" },
    type: "string",
    /** Displayed human-readable (bytes → KB/MB/GB) when read-only. */
    sizeFormat: true,
    category: "advanced",
  },
  {
    key: "async-dns",
    label: { en: "Async DNS", zh: "异步 DNS" },
    type: "boolean",
    category: "advanced",
  },
  {
    key: "disable-ipv6",
    label: { en: "Disable IPv6", zh: "禁用 IPv6" },
    type: "boolean",
    category: "advanced",
    readonly: true,
  },
  {
    key: "event-poll",
    label: { en: "Event poll method", zh: "事件轮询方式" },
    type: "select",
    category: "advanced",
    choices: ["epoll", "kqueue", "port", "poll", "select"],
    readonly: true,
  },
  {
    key: "min-tls-version",
    label: { en: "Min TLS version", zh: "最低 TLS 版本" },
    type: "select",
    category: "advanced",
    choices: ["SSLv3", "TLSv1", "TLSv1.1", "TLSv1.2", "TLSv1.3"],
    readonly: true,
  },
  {
    key: "quiet",
    label: { en: "Quiet console", zh: "静默控制台" },
    type: "boolean",
    category: "advanced",
    readonly: true,
  },
  {
    key: "console-log-level",
    label: { en: "Console log level", zh: "控制台日志级别" },
    type: "select",
    category: "advanced",
    choices: ["debug", "info", "notice", "warn", "error"],
    readonly: true,
  },
];

export function pickLabel(
  bilingual: { en: string; zh: string },
  language: string,
): string {
  return language.startsWith("zh") ? bilingual.zh : bilingual.en;
}

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
