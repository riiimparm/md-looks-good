import type { HeadingInfo } from "../shared/types";
import { bindToggleAria, createToggleButton, getBartender } from "./panels";

function slugify(text: string, usedIds: Set<string>): string {
  const base =
    text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-") || "section";
  let id = base;
  let i = 2;
  while (usedIds.has(id)) {
    id = `${base}-${i}`;
    i += 1;
  }
  usedIds.add(id);
  return id;
}

export function collectHeadings(contentRoot: HTMLElement): HeadingInfo[] {
  const usedIds = new Set<string>();
  const headingEls = Array.from(
    contentRoot.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6"),
  );
  return headingEls.map((el) => {
    const level = Number(el.tagName.substring(1));
    const text = el.textContent ?? "";
    const id = slugify(text, usedIds);
    el.id = id;
    return { level, text, id };
  });
}

function setupScrollSpy(dialog: HTMLElement, headings: HeadingInfo[]): void {
  const items = new Map<string, HTMLElement>();
  dialog.querySelectorAll<HTMLElement>(".mlg-toc-item").forEach((item) => {
    const id = item.dataset.headingId;
    if (id) items.set(id, item);
  });

  let ticking = false;
  const activate = (id: string | null): void => {
    items.forEach((item, itemId) => {
      item.classList.toggle("mlg-active", itemId === id);
    });
  };

  const update = (): void => {
    ticking = false;
    const offset = 96;
    let activeId: string | null = headings[0]?.id ?? null;
    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (!el) continue;
      if (el.getBoundingClientRect().top - offset <= 0) {
        activeId = h.id;
      } else {
        break;
      }
    }
    activate(activeId);
  };

  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  });

  update();
}

export function mountLeftPanel(headings: HeadingInfo[]): void {
  const dialog = document.createElement("dialog");
  dialog.id = "mlg-toc";
  dialog.className = "bartender-bar mlg-panel-bar";
  dialog.setAttribute("aria-label", "目次");

  const heading = document.createElement("div");
  heading.className = "mlg-panel-title";
  heading.textContent = "目次";
  dialog.appendChild(heading);

  if (headings.length === 0) {
    const empty = document.createElement("p");
    empty.className = "mlg-empty";
    empty.textContent = "見出しがありません";
    dialog.appendChild(empty);
  } else {
    const list = document.createElement("ul");
    list.className = "mlg-toc-list";
    for (const h of headings) {
      const item = document.createElement("li");
      item.className = `mlg-toc-item mlg-toc-level-${h.level}`;
      item.dataset.headingId = h.id;
      const link = document.createElement("a");
      link.href = `#${h.id}`;
      link.textContent = h.text;
      link.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      item.appendChild(link);
      list.appendChild(item);
    }
    dialog.appendChild(list);
  }

  document.body.appendChild(dialog);

  if (headings.length > 0) {
    setupScrollSpy(dialog, headings);
  }

  const bartender = getBartender();
  bartender.addBar("toc", {
    el: dialog,
    position: "left",
    modal: false,
    overlay: false,
    permanent: true,
  });

  const toggleButton = createToggleButton({
    id: "mlg-left-toggle",
    title: "目次を開閉",
    label: "☰",
    side: "left",
    onClick: () => bartender.toggle("toc", true),
  });
  bindToggleAria(toggleButton, dialog);
}
