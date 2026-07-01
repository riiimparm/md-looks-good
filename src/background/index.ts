import { getGraph, resetGraph, saveGraph } from "../shared/storage";
import type { ExtMessage, GetGraphResponse } from "../shared/messages";
import type { CodeFrequencyInfo, GraphSnapshot } from "../shared/types";

async function upsertNode(
  graph: GraphSnapshot,
  url: string,
  title: string,
  confirmed: boolean,
  codeFrequency?: CodeFrequencyInfo[],
): Promise<void> {
  const now = Date.now();
  const existing = graph.nodes[url];
  if (existing) {
    existing.lastSeenAt = now;
    if (confirmed) {
      existing.confirmed = true;
      existing.title = title || existing.title;
      if (codeFrequency) existing.codeFrequency = codeFrequency;
    } else if (!existing.title) {
      existing.title = title;
    }
  } else {
    graph.nodes[url] = {
      id: url,
      title: title || url,
      firstSeenAt: now,
      lastSeenAt: now,
      confirmed,
      codeFrequency: codeFrequency ?? [],
    };
  }
}

function upsertEdge(graph: GraphSnapshot, source: string, target: string): void {
  const id = `${source}->${target}`;
  if (graph.edges[id]) return;
  graph.edges[id] = { id, source, target, createdAt: Date.now() };
}

async function handlePageRendered(
  url: string,
  title: string,
  codeFrequency: CodeFrequencyInfo[],
): Promise<void> {
  const graph = await getGraph();
  await upsertNode(graph, url, title, true, codeFrequency);
  await saveGraph(graph);
}

async function handleLinksFound(sourceUrl: string, targetUrls: string[]): Promise<void> {
  const graph = await getGraph();
  await upsertNode(graph, sourceUrl, sourceUrl, false);
  for (const target of targetUrls) {
    await upsertNode(graph, target, target, false);
    upsertEdge(graph, sourceUrl, target);
  }
  await saveGraph(graph);
}

function removeNodeAndEdges(graph: GraphSnapshot, url: string): void {
  delete graph.nodes[url];
  for (const [id, edge] of Object.entries(graph.edges)) {
    if (edge.source === url || edge.target === url) {
      delete graph.edges[id];
    }
  }
}

async function handleDeleteNode(url: string): Promise<void> {
  const graph = await getGraph();
  removeNodeAndEdges(graph, url);
  await saveGraph(graph);
}

async function handlePruneIsolatedNodes(): Promise<void> {
  const graph = await getGraph();
  const connected = new Set<string>();
  for (const edge of Object.values(graph.edges)) {
    connected.add(edge.source);
    connected.add(edge.target);
  }
  for (const url of Object.keys(graph.nodes)) {
    if (!connected.has(url)) delete graph.nodes[url];
  }
  await saveGraph(graph);
}

async function handlePruneOldNodes(olderThanDays: number): Promise<void> {
  const graph = await getGraph();
  const threshold = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  for (const [url, node] of Object.entries(graph.nodes)) {
    if (node.lastSeenAt < threshold) {
      removeNodeAndEdges(graph, url);
    }
  }
  await saveGraph(graph);
}

chrome.runtime.onMessage.addListener((message: ExtMessage, _sender, sendResponse) => {
  switch (message.type) {
    case "PAGE_RENDERED":
      handlePageRendered(message.url, message.title, message.codeFrequency);
      return false;
    case "LINKS_FOUND":
      handleLinksFound(message.sourceUrl, message.targetUrls);
      return false;
    case "GET_GRAPH":
      getGraph().then((graph: GetGraphResponse) => sendResponse(graph));
      return true;
    case "RESET_GRAPH":
      resetGraph().then(() => sendResponse(true));
      return true;
    case "DELETE_NODE":
      handleDeleteNode(message.url).then(() => sendResponse(true));
      return true;
    case "PRUNE_ISOLATED_NODES":
      handlePruneIsolatedNodes().then(() => sendResponse(true));
      return true;
    case "PRUNE_OLD_NODES":
      handlePruneOldNodes(message.olderThanDays).then(() => sendResponse(true));
      return true;
    default:
      return false;
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});
