import { STORAGE_KEY_THEME } from "../shared/constants";
import type { ThemeConfig } from "../shared/types";

export function applyThemeVariables(theme: ThemeConfig): void {
  const root = document.getElementById("mlg-root") ?? document.documentElement;
  root.style.setProperty("--mlg-bg", theme.backgroundColor);
  root.style.setProperty("--mlg-text", theme.textColor);
  root.style.setProperty("--mlg-heading", theme.headingColor);
  root.style.setProperty("--mlg-link", theme.linkColor);
  root.style.setProperty("--mlg-bold", theme.boldColor);
  root.style.setProperty("--mlg-code-bg", theme.codeBackgroundColor);
  root.style.setProperty("--mlg-code-text", theme.codeTextColor);
  root.style.setProperty("--mlg-font-size", `${theme.fontSize}px`);
  root.style.setProperty("--mlg-line-height", `${theme.lineHeight}`);
}

export function subscribeThemeChanges(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    const change = changes[STORAGE_KEY_THEME];
    if (!change) return;
    applyThemeVariables(change.newValue as ThemeConfig);
  });
}
