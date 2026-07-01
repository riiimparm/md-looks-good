import type { CodeFrequencyInfo, GraphSnapshot } from "./types";

export interface PageRenderedMessage {
  type: "PAGE_RENDERED";
  url: string;
  title: string;
  codeFrequency: CodeFrequencyInfo[];
}

export interface LinksFoundMessage {
  type: "LINKS_FOUND";
  sourceUrl: string;
  targetUrls: string[];
}

export interface GetGraphMessage {
  type: "GET_GRAPH";
}

export interface ResetGraphMessage {
  type: "RESET_GRAPH";
}

export interface DeleteNodeMessage {
  type: "DELETE_NODE";
  url: string;
}

export interface PruneIsolatedNodesMessage {
  type: "PRUNE_ISOLATED_NODES";
}

export interface PruneOldNodesMessage {
  type: "PRUNE_OLD_NODES";
  olderThanDays: number;
}

export type ExtMessage =
  | PageRenderedMessage
  | LinksFoundMessage
  | GetGraphMessage
  | ResetGraphMessage
  | DeleteNodeMessage
  | PruneIsolatedNodesMessage
  | PruneOldNodesMessage;

export type GetGraphResponse = GraphSnapshot;
