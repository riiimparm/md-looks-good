import type { AiScoreInfo } from "../shared/types";

// 定番のAI生成文にありがちな定型フレーズ・つなぎ言葉。
// 網羅的な検出器ではなく、あくまで文体の傾向を示す簡易ヒューリスティック。
const BUZZ_PHRASES = [
  "さらに",
  "また、",
  "重要です",
  "重要なのは",
  "と言えるでしょう",
  "と言えます",
  "総括すると",
  "総じて",
  "結論として",
  "多岐にわたる",
  "様々な",
  "非常に重要",
  "本記事では",
  "本稿では",
  "以下のようになります",
  "いかがでしたか",
  "ご紹介しました",
  "ぜひ参考にしてください",
  "moreover",
  "furthermore",
  "in conclusion",
  "it's important to note",
  "it is important to note",
  "delve",
  "leverage",
  "tapestry",
  "boundaries",
  "landscape",
  "seamless",
  "robust",
  "notably",
  "arguably",
  "underscore",
];

function countOccurrences(text: string, phrase: string): number {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "gi");
  return (text.match(re) ?? []).length;
}

function splitSentences(text: string): string[] {
  return text
    .split(/[。!?！？\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function stripCode(text: string): string {
  return text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
}

export function analyzeAiLikeness(rawText: string): AiScoreInfo {
  const plain = stripCode(rawText);
  const length = Math.max(plain.length, 1);

  const phraseHits = BUZZ_PHRASES.reduce(
    (sum, phrase) => sum + countOccurrences(plain, phrase),
    0,
  );
  const phraseDensity = Math.min(phraseHits / (length / 400), 3) / 3;

  const emDashHits = countOccurrences(plain, "—") + countOccurrences(plain, "――");
  const emDashDensity = Math.min(emDashHits / (length / 800), 3) / 3;

  const lines = plain
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const listLines = lines.filter((l) => /^([-*+]|\d+[.)])\s/.test(l));
  const listRatio = lines.length > 0 ? listLines.length / lines.length : 0;

  const sentences = splitSentences(plain);
  const lengths = sentences.map((s) => s.length);
  let uniformity = 0;
  if (lengths.length >= 4) {
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
    uniformity = Math.max(0, Math.min(1, 1 - cv));
  }

  const rawScore = phraseDensity * 35 + emDashDensity * 15 + listRatio * 20 + uniformity * 30;
  const score = Math.round(Math.max(0, Math.min(100, rawScore)));

  let label: string;
  if (score < 25) label = "人間らしい文章";
  else if (score < 50) label = "やや定型的";
  else if (score < 75) label = "AIっぽさあり";
  else label = "かなりAIっぽい";

  return {
    score,
    label,
    signals: [
      { name: "定型フレーズ", value: Math.round(phraseDensity * 100) },
      { name: "ダッシュ多用", value: Math.round(emDashDensity * 100) },
      { name: "箇条書き比率", value: Math.round(listRatio * 100) },
      { name: "文の均一性", value: Math.round(uniformity * 100) },
    ],
  };
}
