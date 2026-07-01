import {
  STORAGE_KEY_GRAPH,
  STORAGE_KEY_POSITIONS_CLUSTER,
  STORAGE_KEY_POSITIONS_LINK,
  STORAGE_KEY_THEME,
} from "./constants";
import {
  DEFAULT_THEME,
  EMPTY_GRAPH,
  type GraphPositions,
  type GraphSnapshot,
  type ThemeConfig,
} from "./types";

export async function getTheme(): Promise<ThemeConfig> {
  const stored = await chrome.storage.sync.get(STORAGE_KEY_THEME);
  const theme = stored[STORAGE_KEY_THEME] as Partial<ThemeConfig> | undefined;
  return { ...DEFAULT_THEME, ...theme };
}

export async function setTheme(theme: ThemeConfig): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY_THEME]: theme });
}

export async function getGraph(): Promise<GraphSnapshot> {
  const stored = await chrome.storage.local.get(STORAGE_KEY_GRAPH);
  const graph = stored[STORAGE_KEY_GRAPH] as GraphSnapshot | undefined;
  if (!graph) return { nodes: {}, edges: {} };
  return graph;
}

export async function saveGraph(graph: GraphSnapshot): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_GRAPH]: graph });
}

export async function resetGraph(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_GRAPH]: EMPTY_GRAPH });
  await chrome.storage.local.set({
    [STORAGE_KEY_POSITIONS_LINK]: {},
    [STORAGE_KEY_POSITIONS_CLUSTER]: {},
  });
}

export type GraphView = "link" | "cluster";

const POSITION_KEYS: Record<GraphView, string> = {
  link: STORAGE_KEY_POSITIONS_LINK,
  cluster: STORAGE_KEY_POSITIONS_CLUSTER,
};

export async function getPositions(view: GraphView): Promise<GraphPositions> {
  const key = POSITION_KEYS[view];
  const stored = await chrome.storage.local.get(key);
  return (stored[key] as GraphPositions | undefined) ?? {};
}

export async function savePositions(view: GraphView, positions: GraphPositions): Promise<void> {
  await chrome.storage.local.set({ [POSITION_KEYS[view]]: positions });
}
