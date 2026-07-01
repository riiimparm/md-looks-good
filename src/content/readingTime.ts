const JP_CHAR_RE = /[぀-ヿ㐀-鿿＀-￯]/g;
const EN_WORD_RE = /[A-Za-z0-9']+/g;

const JP_CHARS_PER_MIN = 500;
const EN_WORDS_PER_MIN = 220;

export function estimateReadingTimeMinutes(text: string): number {
  const jpChars = (text.match(JP_CHAR_RE) ?? []).length;
  const withoutJp = text.replace(JP_CHAR_RE, " ");
  const enWords = (withoutJp.match(EN_WORD_RE) ?? []).length;

  const jpMinutes = jpChars / JP_CHARS_PER_MIN;
  const enMinutes = enWords / EN_WORDS_PER_MIN;

  return Math.max(1, Math.ceil(jpMinutes + enMinutes));
}

export function formatReadingTime(minutes: number): string {
  return `約 ${minutes} 分`;
}
