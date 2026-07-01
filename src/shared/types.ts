export interface ThemeConfig {
  backgroundColor: string;
  textColor: string;
  headingColor: string;
  linkColor: string;
  boldColor: string;
  codeBackgroundColor: string;
  codeTextColor: string;
  fontSize: number;
  lineHeight: number;
}

export const DEFAULT_THEME: ThemeConfig = {
  backgroundColor: "#0d1117",
  textColor: "#c9d1d9",
  headingColor: "#f0f6fc",
  linkColor: "#58a6ff",
  boldColor: "#f0c674",
  codeBackgroundColor: "#161b22",
  codeTextColor: "#ce9178",
  fontSize: 16,
  lineHeight: 1.7,
};

export interface GraphNode {
  id: string;
  title: string;
  firstSeenAt: number;
  lastSeenAt: number;
  confirmed: boolean;
  codeFrequency: CodeFrequencyInfo[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  createdAt: number;
}

export interface GraphSnapshot {
  nodes: Record<string, GraphNode>;
  edges: Record<string, GraphEdge>;
}

export const EMPTY_GRAPH: GraphSnapshot = { nodes: {}, edges: {} };

export interface NodePosition {
  x: number;
  y: number;
}

export type GraphPositions = Record<string, NodePosition>;

export interface LinkInfo {
  href: string;
  text: string;
}

export interface FootnoteInfo {
  id: string;
  text: string;
}

export interface CodeFrequencyInfo {
  code: string;
  count: number;
}

export interface WordCloudItem {
  word: string;
  count: number;
}

export type FrontmatterValue = string | string[];

export interface MetaSummary {
  links: LinkInfo[];
  footnotes: FootnoteInfo[];
  boldPhrases: string[];
  codeFrequency: CodeFrequencyInfo[];
  wordCloud: WordCloudItem[];
  frontmatter: Record<string, FrontmatterValue>;
}

export interface HeadingInfo {
  level: number;
  text: string;
  id: string;
}

export interface AiScoreSignal {
  name: string;
  value: number;
}

export interface AiScoreInfo {
  score: number;
  label: string;
  signals: AiScoreSignal[];
}
