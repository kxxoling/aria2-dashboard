/** File extensions treated as downloadable when intercepting link clicks. */
const DOWNLOAD_EXTENSIONS = new Set([
  // archives & disk images
  "7z",
  "apk",
  "appimage",
  "bz2",
  "cab",
  "deb",
  "dmg",
  "gz",
  "iso",
  "jar",
  "lzh",
  "msi",
  "pkg",
  "rar",
  "rpm",
  "tar",
  "tgz",
  "txz",
  "xz",
  "zst",
  "zip",
  // torrent metadata
  "torrent",
  // media
  "aac",
  "ape",
  "avi",
  "flac",
  "flv",
  "m4a",
  "m4v",
  "mkv",
  "mov",
  "mp3",
  "mp4",
  "mpeg",
  "mpg",
  "ogg",
  "opus",
  "wav",
  "webm",
  "wma",
  "wmv",
  // documents & books
  "azw3",
  "epub",
  "mobi",
  "pdf",
  // other binaries
  "bin",
  "img",
]);

function safeUrl(rawUrl: string): URL | null {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

/**
 * True for links the auto-interception should claim: magnet: URIs, plus
 * http(s) URLs whose path ends in a known downloadable file extension.
 */
export function isInterceptableUrl(rawUrl: string): boolean {
  const url = safeUrl(rawUrl);
  if (!url) return false;
  if (url.protocol === "magnet:") return true;
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return hasDownloadExtension(url.pathname);
}

/**
 * True for links the context menu accepts. Menu use is explicit intent, so
 * any magnet/http(s)/ftp link qualifies — no extension guessing here.
 */
export function isTaskUrl(rawUrl: string): boolean {
  const url = safeUrl(rawUrl);
  if (!url) return false;
  return ["magnet:", "http:", "https:", "ftp:"].includes(url.protocol);
}

function hasDownloadExtension(pathname: string): boolean {
  const fileName = pathname.split("/").pop() ?? "";
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) return false;
  return DOWNLOAD_EXTENSIONS.has(fileName.slice(dot + 1).toLowerCase());
}

/** A human-friendly one-liner describing the task, for notifications. */
export function describeTaskUrl(rawUrl: string): string {
  const url = safeUrl(rawUrl);
  if (!url) return truncate(rawUrl, 100);
  if (url.protocol === "magnet:") {
    return truncate(url.searchParams.get("dn") || "magnet:…", 100);
  }
  const fileName = url.pathname.split("/").filter(Boolean).pop();
  return truncate(fileName ? safeDecode(fileName) : url.host, 100);
}

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

export function truncate(text: string, maxLength: number): string {
  const trimmed = text.trim();
  return trimmed.length > maxLength
    ? `${trimmed.slice(0, maxLength - 1)}…`
    : trimmed;
}
