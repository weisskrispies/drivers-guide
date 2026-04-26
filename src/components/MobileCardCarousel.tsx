"use client";

import { useEffect, useRef } from "react";
import RoadCard from "./RoadCard";
import type { Road } from "@/lib/roads/types";

type Entry = { road: Road; distance: number | null };

type Props = {
  entries: Entry[];
  activeSlug: string | null;
  done: Set<string>;
  originLabel: string | null;
  onSelect: (slug: string) => void;
  onOpen: (slug: string) => void;
};

/**
 * Horizontally swipeable, snap-paged stack of compact road cards. The
 * card whose center is closest to the viewport center becomes active —
 * which fits the map to that road via the parent's onSelect handler.
 *
 * Behaviours:
 * - Internal scroll → settles → calls onSelect(slugAtCenter), which the
 *   parent treats as a list-style fit.
 * - External activeSlug change (map marker tap, modal close, etc.) →
 *   scrolls the carousel to that card so the visible card matches the
 *   active highlight.
 *
 * The map below stays fully usable: we leave 15% of the card on each
 * side as a "peek" so the user always knows there's more, and the
 * carousel itself only occupies the bottom strip of the screen.
 */
export default function MobileCardCarousel({
  entries,
  activeSlug,
  done,
  originLabel,
  onSelect,
  onOpen,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Suppress the scroll → onSelect feedback loop while we're
  // programmatically scrolling in response to an external selection.
  const suppressScrollSyncRef = useRef(false);

  // External selection → scroll the carousel to the matching card.
  useEffect(() => {
    if (!activeSlug) return;
    const el = containerRef.current;
    if (!el) return;
    const idx = entries.findIndex((e) => e.road.slug === activeSlug);
    if (idx < 0) return;
    const child = el.children[idx] as HTMLElement | undefined;
    if (!child) return;
    const target =
      child.offsetLeft - (el.clientWidth - child.clientWidth) / 2;
    if (Math.abs(el.scrollLeft - target) < 4) return;
    suppressScrollSyncRef.current = true;
    el.scrollTo({ left: target, behavior: "smooth" });
    // Re-enable after the smooth scroll likely finishes (~400ms).
    const t = window.setTimeout(() => {
      suppressScrollSyncRef.current = false;
    }, 500);
    return () => window.clearTimeout(t);
  }, [activeSlug, entries]);

  // Internal scroll → set active to whichever card is centered.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let timeout: number | null = null;
    const onScroll = () => {
      if (suppressScrollSyncRef.current) return;
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        const containerCenter = el.scrollLeft + el.clientWidth / 2;
        let closestIdx = -1;
        let closestDist = Infinity;
        Array.from(el.children).forEach((child, idx) => {
          const c = child as HTMLElement;
          const childCenter = c.offsetLeft + c.clientWidth / 2;
          const d = Math.abs(childCenter - containerCenter);
          if (d < closestDist) {
            closestDist = d;
            closestIdx = idx;
          }
        });
        if (closestIdx < 0) return;
        const entry = entries[closestIdx];
        if (!entry) return;
        if (entry.road.slug !== activeSlug) onSelect(entry.road.slug);
      }, 140);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (timeout) window.clearTimeout(timeout);
    };
  }, [entries, activeSlug, onSelect]);

  if (entries.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-auto flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain pb-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {entries.map(({ road, distance }, index) => (
        <div
          key={road.slug}
          className="flex w-[85vw] shrink-0 snap-center px-1.5 first:pl-3 last:pr-3"
        >
          <div className="w-full">
            <RoadCard
              road={road}
              index={index}
              distanceFromOrigin={distance}
              originLabel={originLabel}
              done={done.has(road.slug)}
              active={activeSlug === road.slug}
              compact
              onSelect={() => onSelect(road.slug)}
              onOpen={() => onOpen(road.slug)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
