import type Token from "markdown-it/lib/token.mjs";
import type {
  AiScoreInfo,
  CodeFrequencyInfo,
  FootnoteInfo,
  FrontmatterValue,
  LinkInfo,
  MetaSummary,
} from "../shared/types";
import { bindToggleAria, createToggleButton, getBartender } from "./panels";
import { extractWordCloud } from "./wordCloud";

function walkInlineTokens(
  children: Token[],
  links: LinkInfo[],
  boldPhrases: string[],
  codeCounts: Map<string, number>,
): void {
  let i = 0;
  while (i < children.length) {
    const token = children[i];
    if (token.type === "link_open") {
      const href = token.attrGet("href") ?? "";
      let text = "";
      i += 1;
      while (children[i] && children[i].type !== "link_close") {
        text += children[i].content ?? "";
        i += 1;
      }
      if (href) links.push({ href, text: text || href });
    } else if (token.type === "strong_open") {
      let text = "";
      i += 1;
      while (children[i] && children[i].type !== "strong_close") {
        text += children[i].content ?? "";
        i += 1;
      }
      if (text) boldPhrases.push(text);
    } else if (token.type === "code_inline") {
      const count = codeCounts.get(token.content) ?? 0;
      codeCounts.set(token.content, count + 1);
    }
    i += 1;
  }
}

function extractFootnotes(rawText: string): FootnoteInfo[] {
  const footnotes: FootnoteInfo[] = [];
  const re = /^\[\^([^\]]+)\]:\s*(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(rawText)) !== null) {
    footnotes.push({ id: match[1], text: match[2] });
  }
  return footnotes;
}

export function extractMeta(
  tokens: Token[],
  rawText: string,
  frontmatter: Record<string, FrontmatterValue> = {},
): MetaSummary {
  const links: LinkInfo[] = [];
  const boldPhrases: string[] = [];
  const codeCounts = new Map<string, number>();

  for (const token of tokens) {
    if (token.type === "inline" && token.children) {
      walkInlineTokens(token.children, links, boldPhrases, codeCounts);
    }
  }

  const codeFrequency: CodeFrequencyInfo[] = [...codeCounts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    links,
    footnotes: extractFootnotes(rawText),
    boldPhrases,
    codeFrequency,
    wordCloud: extractWordCloud(tokens),
    frontmatter,
  };
}

function buildSection(title: string, open = true): { section: HTMLElement; body: HTMLElement } {
  const section = document.createElement("details");
  section.className = "mlg-meta-section";
  section.open = open;
  const summary = document.createElement("summary");
  summary.textContent = title;
  const body = document.createElement("div");
  body.className = "mlg-meta-body";
  section.appendChild(summary);
  section.appendChild(body);
  return { section, body };
}

export function mountRightPanel(
  meta: MetaSummary,
  readingTimeLabel: string,
  aiScore: AiScoreInfo,
): void {
  const dialog = document.createElement("dialog");
  dialog.id = "mlg-meta";
  dialog.className = "bartender-bar mlg-panel-bar";
  dialog.setAttribute("aria-label", "メタ情報");

  const title = document.createElement("div");
  title.className = "mlg-panel-title";
  title.textContent = "メタ情報";
  dialog.appendChild(title);

  const readingTime = document.createElement("div");
  readingTime.id = "mlg-reading-time";
  readingTime.textContent = `読了目安: ${readingTimeLabel}`;
  dialog.appendChild(readingTime);

  const frontmatterEntries = Object.entries(meta.frontmatter);
  if (frontmatterEntries.length > 0) {
    const { section: propsSection, body: propsBody } = buildSection(
      `プロパティ (${frontmatterEntries.length})`,
    );
    const dl = document.createElement("dl");
    dl.className = "mlg-frontmatter-list";
    for (const [key, value] of frontmatterEntries) {
      const dt = document.createElement("dt");
      dt.textContent = key;
      const dd = document.createElement("dd");
      if (Array.isArray(value)) {
        dd.textContent = value.join(", ");
      } else {
        dd.textContent = value;
      }
      dl.appendChild(dt);
      dl.appendChild(dd);
    }
    propsBody.appendChild(dl);
    dialog.appendChild(propsSection);
  }

  const { section: aiSection, body: aiBody } = buildSection("AIっぽさメーター");
  const scoreRow = document.createElement("div");
  scoreRow.className = "mlg-ai-score-row";
  const scoreNum = document.createElement("span");
  scoreNum.className = "mlg-ai-score-num";
  scoreNum.textContent = `${aiScore.score}`;
  const scoreLabel = document.createElement("span");
  scoreLabel.className = "mlg-ai-score-label";
  scoreLabel.textContent = aiScore.label;
  scoreRow.appendChild(scoreNum);
  scoreRow.appendChild(scoreLabel);
  aiBody.appendChild(scoreRow);

  const barTrack = document.createElement("div");
  barTrack.className = "mlg-ai-score-bar";
  const barFill = document.createElement("div");
  barFill.className = "mlg-ai-score-bar-fill";
  barFill.style.width = `${aiScore.score}%`;
  barTrack.appendChild(barFill);
  aiBody.appendChild(barTrack);

  const signalsList = document.createElement("ul");
  signalsList.className = "mlg-ai-signals";
  for (const signal of aiScore.signals) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.className = "mlg-ai-signal-name";
    name.textContent = signal.name;
    const track = document.createElement("span");
    track.className = "mlg-ai-signal-track";
    const fill = document.createElement("span");
    fill.className = "mlg-ai-signal-fill";
    fill.style.width = `${signal.value}%`;
    track.appendChild(fill);
    li.appendChild(name);
    li.appendChild(track);
    signalsList.appendChild(li);
  }
  aiBody.appendChild(signalsList);

  const caveat = document.createElement("p");
  caveat.className = "mlg-empty";
  caveat.textContent = "※文体の傾向を示す簡易的な目安であり、AI検出ではありません";
  aiBody.appendChild(caveat);

  dialog.appendChild(aiSection);

  const { section: linksSection, body: linksBody } = buildSection(
    `リンク集 (${meta.links.length})`,
  );
  if (meta.links.length === 0) {
    linksBody.innerHTML = `<p class="mlg-empty">リンクはありません</p>`;
  } else {
    const ul = document.createElement("ul");
    for (const link of meta.links) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = link.href;
      a.textContent = link.text;
      a.title = link.href;
      li.appendChild(a);
      ul.appendChild(li);
    }
    linksBody.appendChild(ul);
  }
  dialog.appendChild(linksSection);

  const { section: footnoteSection, body: footnoteBody } = buildSection(
    `注釈 (${meta.footnotes.length})`,
  );
  if (meta.footnotes.length === 0) {
    footnoteBody.innerHTML = `<p class="mlg-empty">注釈はありません</p>`;
  } else {
    const ul = document.createElement("ul");
    for (const fn of meta.footnotes) {
      const li = document.createElement("li");
      li.textContent = `[^${fn.id}] ${fn.text}`;
      ul.appendChild(li);
    }
    footnoteBody.appendChild(ul);
  }
  dialog.appendChild(footnoteSection);

  const { section: boldSection, body: boldBody } = buildSection(
    `太字 (${meta.boldPhrases.length})`,
  );
  if (meta.boldPhrases.length === 0) {
    boldBody.innerHTML = `<p class="mlg-empty">太字箇所はありません</p>`;
  } else {
    const ul = document.createElement("ul");
    for (const phrase of meta.boldPhrases) {
      const li = document.createElement("li");
      li.textContent = phrase;
      ul.appendChild(li);
    }
    boldBody.appendChild(ul);
  }
  dialog.appendChild(boldSection);

  const { section: codeSection, body: codeBody } = buildSection("よく使われるコード");
  if (meta.codeFrequency.length === 0) {
    codeBody.innerHTML = `<p class="mlg-empty">インラインコードはありません</p>`;
  } else {
    const ul = document.createElement("ul");
    ul.className = "mlg-code-freq-list";
    const maxCount = Math.max(...meta.codeFrequency.map((item) => item.count));
    for (const item of meta.codeFrequency) {
      const li = document.createElement("li");
      const code = document.createElement("code");
      code.textContent = item.code;
      const badge = document.createElement("span");
      badge.className = "mlg-count-badge";
      badge.textContent = String(item.count);
      badge.title = `${item.count}回出現`;
      const bar = document.createElement("span");
      bar.className = "mlg-count-bar";
      bar.style.width = `${(item.count / maxCount) * 100}%`;
      li.appendChild(code);
      li.appendChild(badge);
      li.appendChild(bar);
      ul.appendChild(li);
    }
    codeBody.appendChild(ul);
  }
  dialog.appendChild(codeSection);

  const { section: wordCloudSection, body: wordCloudBody } = buildSection("ワードクラウド");
  if (meta.wordCloud.length === 0) {
    wordCloudBody.innerHTML = `<p class="mlg-empty">抽出できるキーワードはありません</p>`;
  } else {
    const box = document.createElement("div");
    box.className = "mlg-wordcloud-box";
    const counts = meta.wordCloud.map((item) => item.count);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    const MIN_SIZE = 0.75;
    const MAX_SIZE = 1.7;
    for (const item of meta.wordCloud) {
      const span = document.createElement("span");
      span.className = "mlg-wordcloud-word";
      const ratio =
        maxCount === minCount ? 1 : Math.sqrt((item.count - minCount) / (maxCount - minCount));
      const fontSize = MIN_SIZE + (MAX_SIZE - MIN_SIZE) * ratio;
      span.style.fontSize = `${fontSize.toFixed(2)}rem`;
      span.style.opacity = `${(0.55 + 0.45 * ratio).toFixed(2)}`;
      span.textContent = item.word;
      span.title = `${item.count}回出現`;
      box.appendChild(span);
    }
    wordCloudBody.appendChild(box);
  }
  dialog.appendChild(wordCloudSection);

  document.body.appendChild(dialog);

  const bartender = getBartender();
  bartender.addBar("meta", {
    el: dialog,
    position: "right",
    modal: false,
    overlay: false,
    permanent: true,
  });

  const toggleButton = createToggleButton({
    id: "mlg-right-toggle",
    title: "メタ情報を開閉",
    label: "ⓘ",
    side: "right",
    onClick: () => bartender.toggle("meta", true),
  });
  bindToggleAria(toggleButton, dialog);
}
