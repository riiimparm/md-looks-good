import type { FrontmatterValue } from "../shared/types";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseInlineArray(value: string): string[] {
  return value
    .slice(1, -1)
    .split(",")
    .map((item) => unquote(item))
    .filter((item) => item.length > 0);
}

/**
 * フロントマターは代表的な形(スカラー値/インライン配列/ブロック配列)のみサポートする軽量パーサー。
 * ネストしたマップ等の完全なYAML仕様は対象外。
 */
export function parseFrontmatter(rawText: string): {
  frontmatter: Record<string, FrontmatterValue>;
  body: string;
} {
  const match = FRONTMATTER_RE.exec(rawText);
  if (!match) {
    return { frontmatter: {}, body: rawText };
  }

  const frontmatter: Record<string, FrontmatterValue> = {};
  const lines = match[1].split(/\r?\n/);
  let currentKey: string | null = null;
  let currentList: string[] | null = null;

  const flushList = () => {
    if (currentKey && currentList) {
      frontmatter[currentKey] = currentList;
    }
    currentKey = null;
    currentList = null;
  };

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const listItemMatch = /^\s*-\s*(.+)$/.exec(line);
    if (listItemMatch && currentKey) {
      currentList ??= [];
      currentList.push(unquote(listItemMatch[1]));
      continue;
    }

    flushList();

    const kvMatch = /^([^:\s][^:]*):\s*(.*)$/.exec(line);
    if (!kvMatch) continue;
    const key = kvMatch[1].trim();
    const rawValue = kvMatch[2].trim();

    if (!rawValue) {
      currentKey = key;
      continue;
    }

    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      frontmatter[key] = parseInlineArray(rawValue);
    } else {
      frontmatter[key] = unquote(rawValue);
    }
  }
  flushList();

  return { frontmatter, body: rawText.slice(match[0].length) };
}
