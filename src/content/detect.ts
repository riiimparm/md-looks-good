import { MD_EXTENSION_RE } from "../shared/constants";

export type SourceKind = "file" | "raw-http";

export interface DetectionResult {
  isRawMarkdown: boolean;
  rawText: string | null;
  sourceKind: SourceKind;
}

const NOT_DETECTED: DetectionResult = {
  isRawMarkdown: false,
  rawText: null,
  sourceKind: "file",
};

/**
 * Chromeの組み込みプレーンテキストビューアは body > pre という
 * 特徴的なDOM構造になる。この構造かどうかで「生Markdownページ」を判定する。
 */
export function detectRawMarkdownPage(doc: Document, url: string): DetectionResult {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return NOT_DETECTED;
  }
  if (!MD_EXTENSION_RE.test(pathname)) return NOT_DETECTED;

  const body = doc.body;
  if (!body) return NOT_DETECTED;

  const isPreOnlyBody =
    body.children.length === 1 && body.children[0]?.tagName === "PRE";
  if (!isPreOnlyBody) return NOT_DETECTED;

  const contentType = doc.contentType;
  const contentTypeOk =
    contentType === "text/plain" ||
    contentType === "text/markdown" ||
    contentType === "";
  if (!contentTypeOk) return NOT_DETECTED;

  const rawText = body.children[0].textContent ?? "";
  const sourceKind: SourceKind = url.startsWith("file://") ? "file" : "raw-http";
  return { isRawMarkdown: true, rawText, sourceKind };
}
