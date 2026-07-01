import type Token from "markdown-it/lib/token.mjs";
import type { WordCloudItem } from "../shared/types";

const ENGLISH_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "else", "when", "of", "to", "in", "on",
  "at", "for", "with", "as", "by", "from", "is", "are", "was", "were", "be", "been", "being",
  "this", "that", "these", "those", "it", "its", "not", "no", "yes", "you", "your", "we", "our",
  "he", "she", "they", "them", "his", "her", "their", "can", "could", "will", "would", "should",
  "may", "might", "must", "do", "does", "did", "have", "has", "had", "so", "than", "also",
  "into", "about", "which", "who", "whom", "what", "where", "why", "how", "there", "here",
  "up", "down", "out", "over", "under", "again", "further", "once", "more", "most", "other",
  "some", "such", "only", "own", "same", "just", "because", "all", "any", "both", "each",
]);

const CJK_STOPWORDS = new Set([
  "場合", "こと", "もの", "ため", "よう", "これ", "それ", "あれ", "この", "その", "そう",
  "なる", "ある", "いる", "れる", "した", "して", "です", "ます", "できる", "という",
]);

const KANJI_RE = /[一-鿿々]/;
const KATAKANA_RE = /[゠-ヿー]/;
const LATIN_RE = /[A-Za-z0-9]/;

type CharClass = "kanji" | "katakana" | "latin" | null;

function classify(ch: string): CharClass {
  if (KANJI_RE.test(ch)) return "kanji";
  if (KATAKANA_RE.test(ch)) return "katakana";
  if (LATIN_RE.test(ch)) return "latin";
  return null;
}

function collectPlainText(children: Token[]): string {
  let text = "";
  for (const child of children) {
    if (child.type === "text") {
      text += `${child.content} `;
    } else if (child.type === "softbreak" || child.type === "hardbreak") {
      text += " ";
    }
  }
  return text;
}

function tokenizeText(text: string): string[] {
  const tokens: string[] = [];
  let buf = "";
  let bufClass: CharClass = null;

  const flush = () => {
    if (buf) tokens.push(bufClass === "latin" ? buf.toLowerCase() : buf);
    buf = "";
    bufClass = null;
  };

  for (const ch of text) {
    const cls = classify(ch);
    if (cls === null) {
      flush();
      continue;
    }
    if (cls !== bufClass) flush();
    buf += ch;
    bufClass = cls;
  }
  flush();

  return tokens.filter((token) => {
    if (token.length < 2) return false;
    if (/^[0-9]+$/.test(token)) return false;
    if (ENGLISH_STOPWORDS.has(token)) return false;
    if (CJK_STOPWORDS.has(token)) return false;
    return true;
  });
}

export function extractWordCloud(tokens: Token[]): WordCloudItem[] {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    if (token.type === "inline" && token.children) {
      const text = collectPlainText(token.children);
      for (const word of tokenizeText(text)) {
        counts.set(word, (counts.get(word) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, 40);
}
