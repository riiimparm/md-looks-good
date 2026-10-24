import MarkdownIt from "markdown-it";
import footnote from "markdown-it-footnote";
import taskLists from "markdown-it-task-lists";
import { highlightCode } from "./highlight";
import { applyMarkdownExtensions } from "./mdExtensions";

const dangerousSchemeRe = /^(javascript|data|vbscript):/i;

type SanitizingElement = { setHTML(html: string, options: { sanitizer: object }): void };

// 生HTMLの無害化はネイティブ Sanitizer APIに任せる。未対応ブラウザでは
// サニタイズ手段がないので、生HTMLはエスケープ表示にフォールバックする。
const sanitizerCtor = (globalThis as { Sanitizer?: new (config: object) => object }).Sanitizer;
const canSanitizeHtml =
  typeof sanitizerCtor === "function" &&
  typeof (Element.prototype as Partial<SanitizingElement>).setHTML === "function";

export function createMarkdownIt(): MarkdownIt {
  const md = new MarkdownIt({
    html: canSanitizeHtml,
    linkify: true,
    breaks: true,
  })
    .use(footnote)
    .use(taskLists, { enabled: true, label: true });

  applyMarkdownExtensions(md);

  // javascript: 等の危険なスキームを明示的に拒否する
  const defaultValidateLink = md.validateLink.bind(md);
  md.validateLink = (url: string) => {
    if (dangerousSchemeRe.test(url.trim())) return false;
    return defaultValidateLink(url);
  };

  // ```mermaid はダイアグラム描画用のプレースホルダに、それ以外は highlight.js でハイライトする
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const info = token.info ? md.utils.unescapeAll(token.info).trim() : "";
    const lang = info.split(/\s+/)[0] ?? "";

    if (lang === "mermaid") {
      return `<div class="mlg-mermaid">${md.utils.escapeHtml(token.content)}</div>\n`;
    }

    const highlighted = highlightCode(token.content, lang);
    if (highlighted !== null) {
      const langClass = lang ? ` language-${md.utils.escapeHtml(lang)}` : "";
      return `<pre><code class="hljs${langClass}">${highlighted}</code></pre>\n`;
    }

    return `<pre><code>${md.utils.escapeHtml(token.content)}</code></pre>\n`;
  };

  // 幅の広い表を横スクロール可能にするためラッパーで囲む
  const defaultTableOpen =
    md.renderer.rules.table_open ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  const defaultTableClose =
    md.renderer.rules.table_close ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.table_open = (tokens, idx, options, env, self) =>
    `<div class="mlg-table-wrap">${defaultTableOpen(tokens, idx, options, env, self)}`;
  md.renderer.rules.table_close = (tokens, idx, options, env, self) =>
    `${defaultTableClose(tokens, idx, options, env, self)}</div>`;

  return md;
}

export function renderMarkdownToHtml(md: MarkdownIt, rawText: string): string {
  return md.render(rawText);
}

/**
 * 元の <pre> を隠し、整形済みHTMLを新規コンテナに描画する。
 * 元テキストはデバッグ目的で残す。
 */
export function replaceDomWithRendered(html: string): HTMLElement {
  const pre = document.body.querySelector("pre");
  if (pre) {
    (pre as HTMLElement).style.display = "none";
  }

  const root = document.createElement("div");
  root.id = "mlg-root";

  const content = document.createElement("div");
  content.id = "mlg-content";
  if (canSanitizeHtml) {
    // 空configは「安全でない要素・属性以外はすべて許可」。既定のSanitizerは
    // class/id/details等まで落としてしまい描画が壊れるため使わない。
    (content as unknown as SanitizingElement).setHTML(html, {
      sanitizer: new sanitizerCtor!({}),
    });
  } else {
    content.innerHTML = html;
  }
  root.appendChild(content);
  document.body.appendChild(root);

  return root;
}
