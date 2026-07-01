import mermaid from "mermaid";

let initialized = false;

function ensureInitialized(): void {
  if (initialized) return;
  mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict" });
  initialized = true;
}

/**
 * .mlg-mermaid 要素(fenceレンダラーが生成)を実際のSVG図に差し替える。
 * render.tsのfenceルールでは textContent に生のMermaidソースを escapeHtml して埋め込んでいるため、
 * ブラウザがHTMLパース時にエンティティを復元した textContent から元のソースを取り出せる。
 */
export async function renderMermaidDiagrams(root: HTMLElement): Promise<void> {
  const blocks = Array.from(root.querySelectorAll<HTMLElement>(".mlg-mermaid"));
  if (blocks.length === 0) return;
  ensureInitialized();

  let index = 0;
  for (const block of blocks) {
    const source = block.textContent ?? "";
    const id = `mlg-mermaid-${index}`;
    index += 1;
    try {
      const { svg } = await mermaid.render(id, source);
      block.innerHTML = svg;
      block.classList.add("mlg-mermaid-rendered");
    } catch (err) {
      block.textContent = `Mermaid の描画に失敗しました: ${(err as Error).message}`;
      block.classList.add("mlg-mermaid-error");
    }
  }
}
