import type { ThemeConfig } from "./types";

export interface ThemePreset {
  id: string;
  name: string;
  theme: ThemeConfig;
}

// コードブロックの背景・文字色はどのプリセットでも比較的暗めに統一し、
// 常時読み込んでいるhighlight.jsの github-dark テーマとの見た目の整合を保つ。
const CODE_BG = "#161b22";
const CODE_TEXT = "#ce9178";

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "midnight",
    name: "Midnight",
    theme: {
      backgroundColor: "#0d1117",
      textColor: "#c9d1d9",
      headingColor: "#f0f6fc",
      linkColor: "#58a6ff",
      boldColor: "#f0c674",
      codeBackgroundColor: CODE_BG,
      codeTextColor: CODE_TEXT,
      fontSize: 16,
      lineHeight: 1.7,
    },
  },
  {
    id: "github-dark",
    name: "GitHub Dark",
    theme: {
      backgroundColor: "#0d1117",
      textColor: "#e6edf3",
      headingColor: "#ffffff",
      linkColor: "#4493f8",
      boldColor: "#ffa657",
      codeBackgroundColor: "#161b22",
      codeTextColor: "#79c0ff",
      fontSize: 16,
      lineHeight: 1.7,
    },
  },
  {
    id: "github-light",
    name: "GitHub Light",
    theme: {
      backgroundColor: "#ffffff",
      textColor: "#1f2328",
      headingColor: "#0e0f10",
      linkColor: "#0969da",
      boldColor: "#953800",
      codeBackgroundColor: CODE_BG,
      codeTextColor: CODE_TEXT,
      fontSize: 16,
      lineHeight: 1.7,
    },
  },
  {
    id: "solarized-dark",
    name: "Solarized Dark",
    theme: {
      backgroundColor: "#002b36",
      textColor: "#93a1a1",
      headingColor: "#eee8d5",
      linkColor: "#268bd2",
      boldColor: "#b58900",
      codeBackgroundColor: "#073642",
      codeTextColor: "#2aa198",
      fontSize: 16,
      lineHeight: 1.7,
    },
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    theme: {
      backgroundColor: "#fdf6e3",
      textColor: "#586e75",
      headingColor: "#073642",
      linkColor: "#268bd2",
      boldColor: "#cb4b16",
      codeBackgroundColor: CODE_BG,
      codeTextColor: CODE_TEXT,
      fontSize: 16,
      lineHeight: 1.7,
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    theme: {
      backgroundColor: "#282a36",
      textColor: "#f8f8f2",
      headingColor: "#ffffff",
      linkColor: "#8be9fd",
      boldColor: "#ffb86c",
      codeBackgroundColor: "#21222c",
      codeTextColor: "#50fa7b",
      fontSize: 16,
      lineHeight: 1.7,
    },
  },
  {
    id: "nord",
    name: "Nord",
    theme: {
      backgroundColor: "#2e3440",
      textColor: "#d8dee9",
      headingColor: "#eceff4",
      linkColor: "#88c0d0",
      boldColor: "#ebcb8b",
      codeBackgroundColor: "#3b4252",
      codeTextColor: "#a3be8c",
      fontSize: 16,
      lineHeight: 1.7,
    },
  },
  {
    id: "one-dark",
    name: "One Dark",
    theme: {
      backgroundColor: "#282c34",
      textColor: "#abb2bf",
      headingColor: "#ffffff",
      linkColor: "#61afef",
      boldColor: "#e5c07b",
      codeBackgroundColor: "#21252b",
      codeTextColor: "#98c379",
      fontSize: 16,
      lineHeight: 1.7,
    },
  },
  {
    id: "monokai",
    name: "Monokai",
    theme: {
      backgroundColor: "#272822",
      textColor: "#f8f8f2",
      headingColor: "#ffffff",
      linkColor: "#66d9ef",
      boldColor: "#fd971f",
      codeBackgroundColor: "#1e1f1c",
      codeTextColor: "#a6e22e",
      fontSize: 16,
      lineHeight: 1.7,
    },
  },
  {
    id: "sepia",
    name: "Sepia",
    theme: {
      backgroundColor: "#f4ecd8",
      textColor: "#5b4636",
      headingColor: "#3a2e22",
      linkColor: "#8a5a2b",
      boldColor: "#a8471b",
      codeBackgroundColor: CODE_BG,
      codeTextColor: CODE_TEXT,
      fontSize: 17,
      lineHeight: 1.8,
    },
  },
];
