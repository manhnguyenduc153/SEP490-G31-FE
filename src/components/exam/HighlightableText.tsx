"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface HighlightRange {
  start: number;
  end: number;
}

interface HighlightableTextProps {
  text: string;
  storageKey: string;
  className?: string;
  clearLabel?: string;
  highlightHint?: string;
}

const STORAGE_PREFIX = "examHighlight_";

function loadHighlights(storageKey: string): HighlightRange[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHighlights(storageKey: string, ranges: HighlightRange[]) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(ranges));
  } catch {
    // ignore storage errors (quota / private mode)
  }
}

function normalizeRanges(ranges: HighlightRange[]): HighlightRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: HighlightRange[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

// Walks the rendered text nodes (which may already be split across <mark> spans)
// to translate a DOM (node, offset) selection point back into a plain-text char offset.
function getTextOffset(container: Node, node: Node, offset: number): number {
  let charCount = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let current: Node | null;
  while ((current = walker.nextNode())) {
    if (current === node) return charCount + offset;
    charCount += current.textContent?.length ?? 0;
  }
  return charCount;
}

export function HighlightableText({ text, storageKey, className, clearLabel, highlightHint }: HighlightableTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ranges, setRanges] = useState<HighlightRange[]>(() => loadHighlights(storageKey));
  const [toolbar, setToolbar] = useState<{ x: number; y: number; start: number; end: number } | null>(null);

  useEffect(() => {
    setRanges(loadHighlights(storageKey));
  }, [storageKey]);

  const persist = useCallback(
    (next: HighlightRange[]) => {
      const normalized = normalizeRanges(next);
      setRanges(normalized);
      saveHighlights(storageKey, normalized);
    },
    [storageKey]
  );

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setToolbar(null);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      setToolbar(null);
      return;
    }

    let start = getTextOffset(container, range.startContainer, range.startOffset);
    let end = getTextOffset(container, range.endContainer, range.endOffset);
    if (start === end) {
      setToolbar(null);
      return;
    }
    if (start > end) [start, end] = [end, start];

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setToolbar({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top,
      start,
      end,
    });
  }, []);

  const applyHighlight = () => {
    if (!toolbar) return;
    persist([...ranges, { start: toolbar.start, end: toolbar.end }]);
    setToolbar(null);
    window.getSelection()?.removeAllRanges();
  };

  const removeHighlight = (target: HighlightRange) => {
    persist(ranges.filter((r) => !(r.start === target.start && r.end === target.end)));
  };

  const clearAll = () => persist([]);

  const segments = useMemo(() => {
    if (ranges.length === 0) return [{ text, highlighted: false, range: null as HighlightRange | null }];
    const result: { text: string; highlighted: boolean; range: HighlightRange | null }[] = [];
    let cursor = 0;
    ranges.forEach((r) => {
      if (r.start > cursor) result.push({ text: text.slice(cursor, r.start), highlighted: false, range: null });
      result.push({ text: text.slice(r.start, r.end), highlighted: true, range: r });
      cursor = r.end;
    });
    if (cursor < text.length) result.push({ text: text.slice(cursor), highlighted: false, range: null });
    return result;
  }, [text, ranges]);

  return (
    <div className="relative">
      {ranges.length > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="absolute -top-5 right-0 z-10 text-[10px] font-semibold text-gray-400 hover:text-error-500"
        >
          {clearLabel ?? "Xóa highlight"}
        </button>
      )}

      <div ref={containerRef} onMouseUp={handleMouseUp} className={className}>
        {segments.map((seg, idx) =>
          seg.highlighted ? (
            <mark
              key={idx}
              onClick={() => seg.range && removeHighlight(seg.range)}
              title={highlightHint ?? "Nhấn để bỏ highlight"}
              className="bg-yellow-300/70 dark:bg-yellow-500/40 text-inherit rounded-[2px] px-0.5 cursor-pointer"
            >
              {seg.text}
            </mark>
          ) : (
            <React.Fragment key={idx}>{seg.text}</React.Fragment>
          )
        )}
      </div>

      {toolbar && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={applyHighlight}
          style={{ left: toolbar.x, top: toolbar.y }}
          className="absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+8px)] px-2.5 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap cursor-pointer"
        >
          🖍️ Highlight
        </button>
      )}
    </div>
  );
}
