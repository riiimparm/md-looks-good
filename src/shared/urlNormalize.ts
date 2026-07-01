import { MD_EXTENSION_RE } from "./constants";

/**
 * hash/searchを除去し、file:// はパスをdecodeして表記ゆれを統一する。
 * 大文字小文字はOSのファイルシステム依存のため変換しない。
 */
export function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    u.hash = "";
    u.search = "";
    if (u.protocol === "file:") {
      try {
        u.pathname = decodeURIComponent(u.pathname)
          .split("/")
          .map((segment) => encodeURIComponent(segment))
          .join("/");
      } catch {
        // decode失敗時は元のpathnameを維持
      }
    }
    return u.toString();
  } catch {
    return null;
  }
}

export function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    const resolved = new URL(href, baseUrl);
    return normalizeUrl(resolved.toString());
  } catch {
    return null;
  }
}

export function isSupportedMdUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "file:" && u.protocol !== "https:") return false;
    return MD_EXTENSION_RE.test(u.pathname);
  } catch {
    return false;
  }
}

export function shortenUrlForLabel(url: string): string {
  try {
    const u = new URL(url);
    const segments = decodeURIComponent(u.pathname).split("/").filter(Boolean);
    return segments[segments.length - 1] ?? url;
  } catch {
    return url;
  }
}

/**
 * グラフのノードを「島」として束ねるためのグループキー。
 * ディレクトリパス(ファイル名を除いた部分)+ホストを単位とする。
 */
export function groupKeyForUrl(url: string): string {
  try {
    const u = new URL(url);
    const dir = decodeURIComponent(u.pathname).replace(/\/[^/]*$/, "") || "/";
    return u.protocol === "file:" ? dir : `${u.host}${dir}`;
  } catch {
    return "unknown";
  }
}

/** グループキーを短いラベルに整形する(表示用、末尾のディレクトリ名のみ)。 */
export function shortenGroupLabel(groupKey: string): string {
  const segments = groupKey.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "/";
}
