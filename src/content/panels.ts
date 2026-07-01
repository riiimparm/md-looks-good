import { Bartender } from "@fokke-/bartender.js";
import bartenderCss from "@fokke-/bartender.js/dist/bartender.css";

let instance: Bartender | null = null;
let stylesInjected = false;

export function getBartender(): Bartender {
  if (!instance) instance = new Bartender();
  return instance;
}

export function injectBartenderStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement("style");
  style.textContent = bartenderCss;
  document.head.appendChild(style);
}

/**
 * 常時表示のトグルボタンを作成する。
 * ダイアログ(バー)本体の外側の独立要素として配置するため、
 * バーの開閉状態に関わらず常にクリック可能。
 */
export function createToggleButton(opts: {
  id: string;
  title: string;
  label: string;
  side: "left" | "right";
  onClick: () => void;
}): HTMLButtonElement {
  const button = document.createElement("button");
  button.id = opts.id;
  button.type = "button";
  button.title = opts.title;
  button.textContent = opts.label;
  button.className = `mlg-panel-toggle mlg-panel-toggle--${opts.side}`;
  button.setAttribute("aria-expanded", "false");
  button.addEventListener("click", opts.onClick);
  document.body.appendChild(button);
  return button;
}

/**
 * トグルボタンの aria-expanded / aria-controls を
 * Bartenderバーの開閉イベントに同期させる。
 */
export function bindToggleAria(button: HTMLButtonElement, dialog: HTMLDialogElement): void {
  button.setAttribute("aria-controls", dialog.id);
  dialog.addEventListener("bartender-bar-after-open", () => {
    button.setAttribute("aria-expanded", "true");
  });
  dialog.addEventListener("bartender-bar-after-close", () => {
    button.setAttribute("aria-expanded", "false");
  });
}
