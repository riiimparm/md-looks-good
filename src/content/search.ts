export interface SearchState {
  query: string;
  matches: HTMLElement[];
  currentIndex: number;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function clearHighlights(root: HTMLElement): void {
  const marks = root.querySelectorAll("mark.mlg-hit");
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark);
    parent.normalize();
  });
}

function collectTextNodes(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

function wrapMatchesInTextNode(node: Text, query: string): HTMLElement[] {
  const text = node.textContent ?? "";
  const re = new RegExp(escapeRegExp(query), "gi");
  if (!re.test(text)) return [];
  re.lastIndex = 0;

  const frag = document.createDocumentFragment();
  const marks: HTMLElement[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const mark = document.createElement("mark");
    mark.className = "mlg-hit";
    mark.textContent = match[0];
    frag.appendChild(mark);
    marks.push(mark);
    lastIndex = match.index + match[0].length;
    if (match[0].length === 0) re.lastIndex += 1;
  }
  if (lastIndex < text.length) {
    frag.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
  node.parentNode?.replaceChild(frag, node);
  return marks;
}

export function performSearch(root: HTMLElement, query: string): SearchState {
  clearHighlights(root);
  if (!query.trim()) return { query, matches: [], currentIndex: -1 };

  const textNodes = collectTextNodes(root);
  const matches: HTMLElement[] = [];
  for (const node of textNodes) {
    matches.push(...wrapMatchesInTextNode(node, query));
  }
  return { query, matches, currentIndex: matches.length ? 0 : -1 };
}

export function focusMatch(state: SearchState, direction: 1 | -1): SearchState {
  if (!state.matches.length) return state;
  state.matches[state.currentIndex]?.classList.remove("mlg-hit-active");
  const nextIndex =
    (state.currentIndex + direction + state.matches.length) % state.matches.length;
  const el = state.matches[nextIndex];
  el.classList.add("mlg-hit-active");
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  return { ...state, currentIndex: nextIndex };
}

export function mountSearchBox(contentRoot: HTMLElement): void {
  const box = document.createElement("div");
  box.id = "mlg-search-box";
  box.hidden = true;

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "検索...";
  input.id = "mlg-search-input";

  const count = document.createElement("span");
  count.id = "mlg-search-count";

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.textContent = "↑";
  prevBtn.title = "前の一致";

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.textContent = "↓";
  nextBtn.title = "次の一致";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "×";
  closeBtn.title = "閉じる";

  box.appendChild(input);
  box.appendChild(count);
  box.appendChild(prevBtn);
  box.appendChild(nextBtn);
  box.appendChild(closeBtn);
  document.body.appendChild(box);

  let state: SearchState = { query: "", matches: [], currentIndex: -1 };
  let debounceTimer: number | undefined;

  function updateCount(): void {
    if (!state.matches.length) {
      count.textContent = state.query ? "0 件" : "";
      return;
    }
    count.textContent = `${state.currentIndex + 1} / ${state.matches.length}`;
  }

  function hide(): void {
    box.hidden = true;
    clearHighlights(contentRoot);
    state = { query: "", matches: [], currentIndex: -1 };
    input.value = "";
  }

  function show(): void {
    box.hidden = false;
    input.focus();
    input.select();
  }

  input.addEventListener("input", () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      state = performSearch(contentRoot, input.value);
      if (state.currentIndex >= 0) {
        state.matches[state.currentIndex].classList.add("mlg-hit-active");
        state.matches[state.currentIndex].scrollIntoView({ block: "center", behavior: "smooth" });
      }
      updateCount();
    }, 200);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      state = focusMatch(state, e.shiftKey ? -1 : 1);
      updateCount();
    } else if (e.key === "Escape") {
      e.preventDefault();
      hide();
    }
  });

  prevBtn.addEventListener("click", () => {
    state = focusMatch(state, -1);
    updateCount();
  });
  nextBtn.addEventListener("click", () => {
    state = focusMatch(state, 1);
    updateCount();
  });
  closeBtn.addEventListener("click", hide);

  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && box.hidden) {
      const active = document.activeElement;
      const isEditable =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active as HTMLElement | null)?.isContentEditable;
      if (isEditable) return;
      e.preventDefault();
      show();
    }
  });
}
