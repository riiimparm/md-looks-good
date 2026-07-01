import type MarkdownIt from "markdown-it";
import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";

const ALERT_TYPES = ["note", "tip", "important", "warning", "caution"];
const ALERT_LABELS: Record<string, string> = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
};

/**
 * GitHub/GitLab共通のアラート記法: `> [!NOTE]` 等で始まる引用ブロックを
 * 種別クラス付きの装飾ボックスとして描画する。
 */
function applyAlerts(md: MarkdownIt): void {
  md.core.ruler.after("block", "mlg-alerts", (state) => {
    const tokens = state.tokens;
    const markerRe = new RegExp(`^\\[!(${ALERT_TYPES.join("|")})\\]\\s*`, "i");
    for (let i = 0; i < tokens.length; i += 1) {
      if (tokens[i].type !== "blockquote_open") continue;
      const paraOpen = tokens[i + 1];
      const inline = tokens[i + 2];
      if (paraOpen?.type !== "paragraph_open" || inline?.type !== "inline") continue;
      const match = markerRe.exec(inline.content);
      if (!match) continue;

      const type = match[1].toLowerCase();
      inline.content = inline.content.slice(match[0].length);
      const firstChild = inline.children?.[0];
      if (firstChild && firstChild.type === "text") {
        firstChild.content = firstChild.content.replace(markerRe, "");
      }

      tokens[i].attrSet("class", `mlg-alert mlg-alert-${type}`);
      tokens[i].meta = { ...(tokens[i].meta as Record<string, unknown> | undefined), alertType: type };
    }
  });

  const defaultOpen =
    md.renderer.rules.blockquote_open ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.blockquote_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const meta = token.meta as { alertType?: string } | undefined;
    const open = defaultOpen(tokens, idx, options, env, self);
    if (!meta?.alertType) return open;
    const label = ALERT_LABELS[meta.alertType] ?? meta.alertType;
    return `${open}<p class="mlg-alert-title">${md.utils.escapeHtml(label)}</p>`;
  };
}

/**
 * mkdocs(Material)のadmonition記法: `!!! type "タイトル"` + インデントブロック。
 */
function applyAdmonitions(md: MarkdownIt): void {
  function admonitionRule(
    state: StateBlock,
    startLine: number,
    endLine: number,
    silent: boolean,
  ): boolean {
    const pos = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    const lineText = state.src.slice(pos, max);
    const match = /^!!!\s+([\w-]+)(?:\s+"([^"]*)")?\s*$/.exec(lineText);
    if (!match) return false;
    if (silent) return true;

    const type = match[1].toLowerCase();
    const title = match[2] ?? type.charAt(0).toUpperCase() + type.slice(1);

    const oldParent = state.parentType;
    const oldLineMax = state.lineMax;
    const oldIndent = state.blkIndent;

    state.parentType = "admonition" as StateBlock["parentType"];
    state.blkIndent += 4;

    let nextLine = startLine + 1;
    const contentStart = nextLine;
    while (nextLine < endLine) {
      if (!state.isEmpty(nextLine) && state.sCount[nextLine] < state.blkIndent) break;
      nextLine += 1;
    }
    let contentEnd = nextLine;
    while (contentEnd > contentStart && state.isEmpty(contentEnd - 1)) contentEnd -= 1;

    state.lineMax = contentEnd;

    const tokenOpen = state.push("admonition_open", "div", 1);
    tokenOpen.attrSet("class", `mlg-admonition mlg-admonition-${type}`);
    tokenOpen.markup = "!!!";
    tokenOpen.map = [startLine, contentEnd];

    const titleToken = state.push("admonition_title", "", 0);
    titleToken.content = title;

    state.md.block.tokenize(state, contentStart, contentEnd);

    state.push("admonition_close", "div", -1);

    state.parentType = oldParent;
    state.lineMax = oldLineMax;
    state.blkIndent = oldIndent;
    state.line = contentEnd;
    return true;
  }

  md.block.ruler.before("fence", "mlg-admonition", admonitionRule, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });

  md.renderer.rules.admonition_open = (tokens, idx, options, _env, self) =>
    self.renderToken(tokens, idx, options);
  md.renderer.rules.admonition_close = (tokens, idx, options, _env, self) =>
    self.renderToken(tokens, idx, options);
  md.renderer.rules.admonition_title = (tokens, idx) =>
    `<p class="mlg-admonition-title">${md.utils.escapeHtml(tokens[idx].content)}</p>`;
}

/** mkdocsのハイライト記法 `==text==` を <mark> として描画する。 */
function applyHighlight(md: MarkdownIt): void {
  function highlight(state: StateInline, silent: boolean): boolean {
    const start = state.pos;
    if (state.src.charCodeAt(start) !== 0x3d || state.src.charCodeAt(start + 1) !== 0x3d) {
      return false;
    }
    const end = state.src.indexOf("==", start + 2);
    if (end === -1 || end === start + 2) return false;

    if (!silent) {
      state.push("mark_open", "mark", 1);
      const text = state.push("text", "", 0);
      text.content = state.src.slice(start + 2, end);
      state.push("mark_close", "mark", -1);
    }
    state.pos = end + 2;
    return true;
  }
  md.inline.ruler.before("emphasis", "mlg-highlight", highlight);
}

/** mkdocsのキーボードキー記法 `++ctrl+alt+delete++` を <kbd> の並びとして描画する。 */
function applyKbd(md: MarkdownIt): void {
  function kbd(state: StateInline, silent: boolean): boolean {
    const start = state.pos;
    if (state.src.charCodeAt(start) !== 0x2b || state.src.charCodeAt(start + 1) !== 0x2b) {
      return false;
    }
    const end = state.src.indexOf("++", start + 2);
    if (end === -1) return false;
    const content = state.src.slice(start + 2, end);
    if (!content.trim() || /\n/.test(content)) return false;

    if (!silent) {
      const token = state.push("mlg_kbd", "", 0);
      token.meta = { keys: content.split("+").map((k) => k.trim()).filter(Boolean) };
    }
    state.pos = end + 2;
    return true;
  }
  md.inline.ruler.before("emphasis", "mlg-kbd", kbd);

  md.renderer.rules.mlg_kbd = (tokens, idx) => {
    const meta = tokens[idx].meta as { keys: string[] };
    const keys = meta.keys.map((k) => `<kbd>${md.utils.escapeHtml(k)}</kbd>`).join(" + ");
    return `<span class="mlg-keys">${keys}</span>`;
  };
}

export function applyMarkdownExtensions(md: MarkdownIt): void {
  applyAlerts(md);
  applyAdmonitions(md);
  applyHighlight(md);
  applyKbd(md);
}
