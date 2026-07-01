import cytoscape from "cytoscape";
import type { ExtMessage, GetGraphResponse } from "../shared/messages";
import { type GraphView, getPositions, savePositions } from "../shared/storage";
import type { GraphNode, GraphPositions, GraphSnapshot } from "../shared/types";
import {
  groupKeyForUrl,
  normalizeUrl,
  shortenGroupLabel,
  shortenUrlForLabel,
} from "../shared/urlNormalize";

let currentCy: cytoscape.Core | null = null;
let cachedGraph: GraphSnapshot | null = null;
let currentTabUrl: string | null = null;
let activeView: GraphView = "link";

async function getCurrentTabUrl(): Promise<string | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tabs[0]?.url;
  return url ? normalizeUrl(url) : null;
}

/** リンク構造ビューで、現在開いているファイルとリンクで繋がっている島(連結成分)だけを残す。 */
function filterToRelatedIsland(graph: GraphSnapshot, rootUrl: string | null): GraphSnapshot {
  if (!rootUrl || !graph.nodes[rootUrl]) return graph;

  const adjacency = new Map<string, Set<string>>();
  for (const e of Object.values(graph.edges)) {
    if (!adjacency.has(e.source)) adjacency.set(e.source, new Set());
    if (!adjacency.has(e.target)) adjacency.set(e.target, new Set());
    adjacency.get(e.source)?.add(e.target);
    adjacency.get(e.target)?.add(e.source);
  }

  const visited = new Set<string>([rootUrl]);
  const queue = [rootUrl];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const next of adjacency.get(current) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  const nodes: GraphSnapshot["nodes"] = {};
  for (const id of visited) {
    if (graph.nodes[id]) nodes[id] = graph.nodes[id];
  }
  const edges: GraphSnapshot["edges"] = {};
  for (const [id, edge] of Object.entries(graph.edges)) {
    if (visited.has(edge.source) && visited.has(edge.target)) edges[id] = edge;
  }
  return { nodes, edges };
}

async function getGraph(): Promise<GetGraphResponse> {
  const message: ExtMessage = { type: "GET_GRAPH" };
  return chrome.runtime.sendMessage(message);
}

async function resetGraphRequest(): Promise<void> {
  const message: ExtMessage = { type: "RESET_GRAPH" };
  await chrome.runtime.sendMessage(message);
}

async function pruneIsolatedRequest(): Promise<void> {
  const message: ExtMessage = { type: "PRUNE_ISOLATED_NODES" };
  await chrome.runtime.sendMessage(message);
}

async function pruneOldRequest(olderThanDays: number): Promise<void> {
  const message: ExtMessage = { type: "PRUNE_OLD_NODES", olderThanDays };
  await chrome.runtime.sendMessage(message);
}

async function focusOrOpenTab(url: string): Promise<void> {
  const tabs = await chrome.tabs.query({ url });
  const activeTab = tabs.find((t) => t.active) ?? tabs[0];
  if (activeTab?.id !== undefined) {
    await chrome.tabs.update(activeTab.id, { active: true });
    if (activeTab.windowId !== undefined) {
      await chrome.windows.update(activeTab.windowId, { focused: true });
    }
  } else {
    await chrome.tabs.create({ url });
  }
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  chrome.downloads.download({ url: dataUrl, filename });
}

async function exportGraphAsJson(): Promise<void> {
  const graph = await getGraph();
  const json = JSON.stringify(graph, null, 2);
  const dataUrl = `data:application/json;base64,${btoa(unescape(encodeURIComponent(json)))}`;
  downloadDataUrl(dataUrl, "md-looks-good-graph.json");
}

function exportGraphAsPng(): void {
  if (!currentCy) return;
  const dataUrl = currentCy.png({ full: true, scale: 2, bg: "#1a1a1a" });
  downloadDataUrl(dataUrl, "md-looks-good-graph.png");
}

const LEAF_NODE_STYLE: cytoscape.StylesheetJsonBlock[] = [
  {
    selector: "node:childless",
    style: {
      label: "data(label)",
      "font-size": 8,
      color: "#eee",
      "background-color": "#4fc1ff",
      width: 24,
      height: 24,
      "text-wrap": "wrap",
      "text-max-width": "70px",
      "text-valign": "bottom",
      "text-margin-y": 4,
    },
  },
  {
    selector: "node.pending",
    style: {
      "background-opacity": 0.35,
      "background-color": "#888",
    },
  },
];

const LINK_STYLE: cytoscape.StylesheetJsonBlock[] = [
  ...LEAF_NODE_STYLE,
  {
    selector: "node:parent",
    style: {
      label: "data(label)",
      shape: "round-rectangle",
      "background-color": "#2a2a2a",
      "background-opacity": 0.5,
      "border-width": 1,
      "border-style": "dashed",
      "border-color": "#555",
      "font-size": 9,
      color: "#999",
      "text-valign": "top",
      "text-halign": "center",
      "text-margin-y": -4,
      padding: "16px",
    },
  },
  {
    selector: "edge",
    style: {
      width: 1.5,
      "line-color": "#666",
      "target-arrow-color": "#666",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
    },
  },
];

const CLUSTER_STYLE: cytoscape.StylesheetJsonBlock[] = [
  ...LEAF_NODE_STYLE,
  {
    selector: "edge",
    style: {
      width: "mapData(weight, 1, 6, 1, 6)",
      "line-color": "#f0c674",
      opacity: 0.55,
      "target-arrow-shape": "none",
      "curve-style": "haystack",
      label: "data(label)",
      "font-size": 6,
      color: "#f0c674",
      "text-background-color": "#1a1a1a",
      "text-background-opacity": 0.85,
      "text-background-padding": "1px",
    },
  },
];

function nodeLabel(n: GraphNode): string {
  return n.title && n.title !== n.id ? n.title : shortenUrlForLabel(n.id);
}

function withStoredPosition(
  data: Record<string, unknown>,
  classes: string,
  positions: GraphPositions,
): cytoscape.ElementDefinition {
  const pos = positions[data.id as string];
  return { data, classes, ...(pos ? { position: pos } : {}) };
}

function buildLinkElements(
  graph: GraphSnapshot,
  positions: GraphPositions,
): cytoscape.ElementDefinition[] {
  const groupLabels = new Map<string, string>();
  for (const n of Object.values(graph.nodes)) {
    const key = groupKeyForUrl(n.id);
    if (!groupLabels.has(key)) groupLabels.set(key, shortenGroupLabel(key));
  }
  const multiGroup = groupLabels.size > 1;

  return [
    ...(multiGroup
      ? Array.from(groupLabels.entries()).map(
          ([key, label]): cytoscape.ElementDefinition => ({
            data: { id: `mlg-group:${key}`, label },
            classes: "mlg-group",
          }),
        )
      : []),
    ...Object.values(graph.nodes).map((n) =>
      withStoredPosition(
        {
          id: n.id,
          label: nodeLabel(n),
          ...(multiGroup ? { parent: `mlg-group:${groupKeyForUrl(n.id)}` } : {}),
        },
        n.confirmed ? "confirmed" : "pending",
        positions,
      ),
    ),
    ...Object.values(graph.edges).map(
      (e): cytoscape.ElementDefinition => ({
        data: { id: e.id, source: e.source, target: e.target },
      }),
    ),
  ];
}

function buildClusterElements(
  graph: GraphSnapshot,
  positions: GraphPositions,
): cytoscape.ElementDefinition[] {
  const nodes = Object.values(graph.nodes);
  const clusterEdges: cytoscape.ElementDefinition[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const freqA = nodes[i].codeFrequency ?? [];
    if (freqA.length === 0) continue;
    const countA = new Map(freqA.map((f) => [f.code, f.count]));
    for (let j = i + 1; j < nodes.length; j += 1) {
      const freqB = nodes[j].codeFrequency ?? [];
      const shared = freqB.filter((f) => countA.has(f.code));
      if (shared.length === 0) continue;

      let topCode = shared[0].code;
      let topScore = (countA.get(topCode) ?? 0) + shared[0].count;
      for (const f of shared) {
        const score = (countA.get(f.code) ?? 0) + f.count;
        if (score > topScore) {
          topScore = score;
          topCode = f.code;
        }
      }

      clusterEdges.push({
        data: {
          id: `mlg-cluster:${nodes[i].id}~${nodes[j].id}`,
          source: nodes[i].id,
          target: nodes[j].id,
          weight: shared.length,
          label: topCode,
        },
      });
    }
  }

  return [
    ...nodes.map((n) =>
      withStoredPosition(
        { id: n.id, label: nodeLabel(n) },
        n.confirmed ? "confirmed" : "pending",
        positions,
      ),
    ),
    ...clusterEdges,
  ];
}

function scatterMissingPositions(
  elements: cytoscape.ElementDefinition[],
  positions: GraphPositions,
): boolean {
  let hasNewNode = false;
  for (const el of elements) {
    const id = el.data.id as string | undefined;
    if (!id || el.data.source !== undefined || positions[id]) continue;
    hasNewNode = true;
    el.position = { x: Math.random() * 500, y: Math.random() * 400 };
  }
  return hasNewNode;
}

async function renderView(): Promise<void> {
  if (!cachedGraph) return;

  const emptyState = document.getElementById("mlg-empty-state") as HTMLElement;
  const cyContainer = document.getElementById("cy") as HTMLElement;

  if (Object.keys(cachedGraph.nodes).length === 0) {
    emptyState.hidden = false;
    cyContainer.hidden = true;
    currentCy = null;
    return;
  }

  const view = activeView;
  const filterCurrent =
    (document.getElementById("mlg-filter-current") as HTMLInputElement | null)?.checked ?? true;
  const graph =
    view === "link" && filterCurrent
      ? filterToRelatedIsland(cachedGraph, currentTabUrl)
      : cachedGraph;
  const nodeCount = Object.keys(graph.nodes).length;

  if (nodeCount === 0) {
    emptyState.hidden = false;
    cyContainer.hidden = true;
    currentCy = null;
    return;
  }
  emptyState.hidden = true;
  cyContainer.hidden = false;

  const positions = await getPositions(view);
  const elements = view === "link" ? buildLinkElements(graph, positions) : buildClusterElements(graph, positions);
  const style = view === "link" ? LINK_STYLE : CLUSTER_STYLE;
  const hasNewNode = scatterMissingPositions(elements, positions);

  const layout: cytoscape.LayoutOptions =
    nodeCount > 60
      ? { name: "grid" }
      : hasNewNode
        ? { name: "cose", randomize: false, nodeDimensionsIncludeLabels: true }
        : { name: "preset" };

  const cy = cytoscape({
    container: cyContainer,
    elements,
    style,
    layout,
  });

  cy.on("layoutstop", () => {
    const updated: GraphPositions = {};
    cy.nodes().forEach((n) => {
      if (!n.isParent()) updated[n.id()] = n.position();
    });
    savePositions(view, updated);
  });

  cy.on("tap", "node", (evt) => {
    if (evt.target.isParent()) return;
    focusOrOpenTab(evt.target.id());
  });

  currentCy = cy;
}

async function refreshAndRender(): Promise<void> {
  [cachedGraph, currentTabUrl] = await Promise.all([getGraph(), getCurrentTabUrl()]);
  const countLabel = document.getElementById("mlg-node-count");
  if (countLabel) countLabel.textContent = `${Object.keys(cachedGraph.nodes).length} ファイル`;
  await renderView();
}

function setActiveView(view: GraphView): void {
  if (activeView === view) return;
  activeView = view;
  document
    .querySelectorAll<HTMLButtonElement>(".mlg-tab-button")
    .forEach((btn) => btn.classList.toggle("mlg-tab-active", btn.dataset.view === view));
  renderView();
}

document.querySelectorAll<HTMLButtonElement>(".mlg-tab-button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view as GraphView | undefined;
    if (view) setActiveView(view);
  });
});

document.getElementById("mlg-filter-current")?.addEventListener("change", () => {
  renderView();
});

document.getElementById("mlg-reset-graph")?.addEventListener("click", async () => {
  await resetGraphRequest();
  await refreshAndRender();
});

document.getElementById("mlg-export-json")?.addEventListener("click", () => {
  exportGraphAsJson();
});

document.getElementById("mlg-export-png")?.addEventListener("click", () => {
  exportGraphAsPng();
});

document.getElementById("mlg-prune-isolated")?.addEventListener("click", async () => {
  await pruneIsolatedRequest();
  await refreshAndRender();
});

document.getElementById("mlg-prune-old")?.addEventListener("click", async () => {
  const input = document.getElementById("mlg-prune-old-days") as HTMLInputElement;
  const days = Number(input.value);
  if (!Number.isFinite(days) || days <= 0) return;
  await pruneOldRequest(days);
  await refreshAndRender();
});

refreshAndRender();
