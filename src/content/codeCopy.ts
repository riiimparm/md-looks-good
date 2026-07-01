function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  return fallbackCopy(text);
}

function fallbackCopy(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      resolve();
    } catch (err) {
      reject(err);
    } finally {
      textarea.remove();
    }
  });
}

function extractLangLabel(code: HTMLElement): string {
  const match = /language-(\S+)/.exec(code.className);
  return match ? match[1] : "";
}

export function mountCodeCopyButtons(root: HTMLElement): void {
  const blocks = root.querySelectorAll<HTMLPreElement>("pre");
  blocks.forEach((pre) => {
    if (pre.closest(".mlg-code-block")) return;
    const code = pre.querySelector("code");
    if (!code) return;

    const wrapper = document.createElement("div");
    wrapper.className = "mlg-code-block";

    const toolbar = document.createElement("div");
    toolbar.className = "mlg-code-toolbar";

    const langLabel = document.createElement("span");
    langLabel.className = "mlg-code-lang";
    langLabel.textContent = extractLangLabel(code);

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "mlg-code-copy";
    copyBtn.textContent = "コピー";

    copyBtn.addEventListener("click", () => {
      copyText(code.textContent ?? "").then(() => {
        copyBtn.textContent = "コピーしました";
        copyBtn.classList.add("mlg-code-copy--done");
        setTimeout(() => {
          copyBtn.textContent = "コピー";
          copyBtn.classList.remove("mlg-code-copy--done");
        }, 1500);
      });
    });

    toolbar.appendChild(langLabel);
    toolbar.appendChild(copyBtn);

    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(toolbar);
    wrapper.appendChild(pre);
  });
}
