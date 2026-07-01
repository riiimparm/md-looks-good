import contentCss from "./content.css";
import hljsThemeCss from "highlight.js/styles/github-dark.css";
import { analyzeAiLikeness } from "./aiScore";
import { detectRawMarkdownPage } from "./detect";
import { mountCodeCopyButtons } from "./codeCopy";
import { parseFrontmatter } from "./frontmatter";
import { collectInternalLinkUrls, reportLinksFound, reportPageRendered } from "./linkTracker";
import { renderMermaidDiagrams } from "./mermaid";
import { extractMeta, mountRightPanel } from "./metaPanel";
import { estimateReadingTimeMinutes, formatReadingTime } from "./readingTime";
import { createMarkdownIt, renderMarkdownToHtml, replaceDomWithRendered } from "./render";
import { injectBartenderStyles } from "./panels";
import { fixGithubRawRootRelativeUrls } from "./resolveAssets";
import { mountSearchBox } from "./search";
import { applyThemeVariables, subscribeThemeChanges } from "./theme";
import { collectHeadings, mountLeftPanel } from "./toc";
import { getTheme } from "../shared/storage";

const APPLIED_FLAG = "mlgApplied";

async function main(): Promise<void> {
  if (document.documentElement.dataset[APPLIED_FLAG] === "true") return;

  const url = location.href;
  const detection = detectRawMarkdownPage(document, url);
  if (!detection.isRawMarkdown || detection.rawText === null) return;

  document.documentElement.dataset[APPLIED_FLAG] = "true";

  const styleEl = document.createElement("style");
  styleEl.textContent = contentCss;
  document.head.appendChild(styleEl);

  const hljsStyleEl = document.createElement("style");
  hljsStyleEl.textContent = hljsThemeCss;
  document.head.appendChild(hljsStyleEl);

  injectBartenderStyles();

  const theme = await getTheme();
  const { frontmatter, body } = parseFrontmatter(detection.rawText);
  const md = createMarkdownIt();
  const tokens = md.parse(body, {});
  const html = renderMarkdownToHtml(md, body);

  const root = replaceDomWithRendered(html);
  applyThemeVariables(theme);
  subscribeThemeChanges();

  const contentEl = document.getElementById("mlg-content") ?? root;
  fixGithubRawRootRelativeUrls(contentEl, url);
  await renderMermaidDiagrams(contentEl);
  mountCodeCopyButtons(contentEl);
  const headings = collectHeadings(contentEl);
  mountLeftPanel(headings);

  const meta = extractMeta(tokens, body, frontmatter);
  const minutes = estimateReadingTimeMinutes(body);
  const aiScore = analyzeAiLikeness(body);
  mountRightPanel(meta, formatReadingTime(minutes), aiScore);

  mountSearchBox(contentEl);

  const title = document.title || headings[0]?.text || url;
  reportPageRendered(url, title, meta.codeFrequency);
  const internalLinks = collectInternalLinkUrls(meta.links, url);
  reportLinksFound(url, internalLinks);
}

main();
