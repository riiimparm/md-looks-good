import type { ExtMessage } from "../shared/messages";
import type { CodeFrequencyInfo, LinkInfo } from "../shared/types";
import { isSupportedMdUrl, normalizeUrl, resolveUrl } from "../shared/urlNormalize";

export function collectInternalLinkUrls(links: LinkInfo[], baseUrl: string): string[] {
  const resolved = links
    .map((l) => resolveUrl(l.href, baseUrl))
    .filter((u): u is string => u !== null)
    .filter(isSupportedMdUrl);
  return [...new Set(resolved)];
}

function sendMessage(message: ExtMessage): void {
  chrome.runtime.sendMessage(message).catch(() => {
    // background workerが未起動などの一時的な失敗は無視する
  });
}

export function reportPageRendered(
  url: string,
  title: string,
  codeFrequency: CodeFrequencyInfo[],
): void {
  const normalized = normalizeUrl(url);
  if (!normalized) return;
  sendMessage({ type: "PAGE_RENDERED", url: normalized, title, codeFrequency });
}

export function reportLinksFound(sourceUrl: string, targetUrls: string[]): void {
  const normalizedSource = normalizeUrl(sourceUrl);
  if (!normalizedSource || targetUrls.length === 0) return;
  sendMessage({ type: "LINKS_FOUND", sourceUrl: normalizedSource, targetUrls });
}
