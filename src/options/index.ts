import { getTheme, setTheme } from "../shared/storage";
import { DEFAULT_THEME, type ThemeConfig } from "../shared/types";
import { THEME_PRESETS } from "../shared/themePresets";

type ColorFieldKey = Extract<keyof ThemeConfig, string>;

const COLOR_FIELD_KEYS: ColorFieldKey[] = [
  "backgroundColor",
  "textColor",
  "headingColor",
  "linkColor",
  "boldColor",
  "codeBackgroundColor",
  "codeTextColor",
];

function getColorInputs(): Record<ColorFieldKey, HTMLInputElement> {
  const inputs = {} as Record<ColorFieldKey, HTMLInputElement>;
  for (const key of COLOR_FIELD_KEYS) {
    inputs[key] = document.getElementById(key) as HTMLInputElement;
  }
  return inputs;
}

function applyPreview(theme: ThemeConfig): void {
  const preview = document.getElementById("mlg-preview");
  if (!preview) return;
  preview.style.setProperty("--mlg-bg", theme.backgroundColor);
  preview.style.setProperty("--mlg-text", theme.textColor);
  preview.style.setProperty("--mlg-heading", theme.headingColor);
  preview.style.setProperty("--mlg-link", theme.linkColor);
  preview.style.setProperty("--mlg-bold", theme.boldColor);
  preview.style.setProperty("--mlg-code-bg", theme.codeBackgroundColor);
  preview.style.setProperty("--mlg-code-text", theme.codeTextColor);
  preview.style.setProperty("--mlg-font-size", `${theme.fontSize}px`);
  preview.style.setProperty("--mlg-line-height", `${theme.lineHeight}`);
}

function readFormTheme(
  colorInputs: Record<ColorFieldKey, HTMLInputElement>,
  fontSizeInput: HTMLInputElement,
  lineHeightInput: HTMLInputElement,
): ThemeConfig {
  const colors = {} as Record<ColorFieldKey, string>;
  for (const key of COLOR_FIELD_KEYS) {
    colors[key] = colorInputs[key].value;
  }
  return {
    ...colors,
    fontSize: Number(fontSizeInput.value),
    lineHeight: Number(lineHeightInput.value),
  };
}

function setFormTheme(
  colorInputs: Record<ColorFieldKey, HTMLInputElement>,
  fontSizeInput: HTMLInputElement,
  lineHeightInput: HTMLInputElement,
  fontSizeValue: HTMLElement,
  lineHeightValue: HTMLElement,
  theme: ThemeConfig,
): void {
  for (const key of COLOR_FIELD_KEYS) {
    colorInputs[key].value = theme[key] as string;
  }
  fontSizeInput.value = String(theme.fontSize);
  lineHeightInput.value = String(theme.lineHeight);
  fontSizeValue.textContent = String(theme.fontSize);
  lineHeightValue.textContent = String(theme.lineHeight);
}

async function main(): Promise<void> {
  const colorInputs = getColorInputs();
  const fontSizeInput = document.getElementById("fontSize") as HTMLInputElement;
  const lineHeightInput = document.getElementById("lineHeight") as HTMLInputElement;
  const fontSizeValue = document.getElementById("fontSize-value") as HTMLElement;
  const lineHeightValue = document.getElementById("lineHeight-value") as HTMLElement;
  const status = document.getElementById("mlg-save-status") as HTMLElement;
  const presetGrid = document.getElementById("mlg-preset-grid") as HTMLElement;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  const currentTheme = await getTheme();
  setFormTheme(colorInputs, fontSizeInput, lineHeightInput, fontSizeValue, lineHeightValue, currentTheme);
  applyPreview(currentTheme);

  function showStatus(message: string): void {
    status.textContent = message;
    setTimeout(() => {
      status.textContent = "";
    }, 1500);
  }

  function scheduleSave(): void {
    const theme = readFormTheme(colorInputs, fontSizeInput, lineHeightInput);
    fontSizeValue.textContent = String(theme.fontSize);
    lineHeightValue.textContent = String(theme.lineHeight);
    applyPreview(theme);
    status.textContent = "";
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await setTheme(theme);
      showStatus("保存しました");
    }, 200);
  }

  for (const key of COLOR_FIELD_KEYS) {
    colorInputs[key].addEventListener("input", scheduleSave);
  }
  fontSizeInput.addEventListener("input", scheduleSave);
  lineHeightInput.addEventListener("input", scheduleSave);

  for (const preset of THEME_PRESETS) {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "mlg-preset-swatch";
    swatch.title = preset.name;
    swatch.style.setProperty("--swatch-bg", preset.theme.backgroundColor);
    swatch.style.setProperty("--swatch-text", preset.theme.textColor);
    swatch.style.setProperty("--swatch-accent", preset.theme.linkColor);
    swatch.innerHTML = `<span class="mlg-preset-swatch-dot"></span><span class="mlg-preset-swatch-name">${preset.name}</span>`;
    swatch.addEventListener("click", async () => {
      setFormTheme(
        colorInputs,
        fontSizeInput,
        lineHeightInput,
        fontSizeValue,
        lineHeightValue,
        preset.theme,
      );
      applyPreview(preset.theme);
      await setTheme(preset.theme);
      showStatus(`${preset.name} を適用しました`);
    });
    presetGrid.appendChild(swatch);
  }

  document.getElementById("mlg-reset-theme")?.addEventListener("click", async () => {
    setFormTheme(
      colorInputs,
      fontSizeInput,
      lineHeightInput,
      fontSizeValue,
      lineHeightValue,
      DEFAULT_THEME,
    );
    applyPreview(DEFAULT_THEME);
    await setTheme(DEFAULT_THEME);
    showStatus("初期値に戻しました");
  });
}

main();
