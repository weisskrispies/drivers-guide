"use client";

import { useEffect } from "react";

type Props = {
  totalRoutes: number;
  open: boolean;
  onClose: () => void;
};

/**
 * About / disclaimer panel modeled after the popos app's intro: a
 * contained card with a 2-column layout (text left, illustrative
 * placeholder right), opened on demand via the info button next to
 * the wordmark. Default closed so the map gets the full canvas on
 * first load.
 */
export default function IntroSection({ totalRoutes, open, onClose }: Props) {
  // Esc closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <section className="relative z-10 shrink-0 border-b border-[var(--border)] bg-[var(--bg)]">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <article className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] lg:grid-cols-[1fr_320px]">
            {/* Text */}
            <div className="px-5 py-5 sm:px-6 sm:py-6">
              <header className="flex items-start justify-between gap-3">
                <h2 className="text-[18px] font-semibold leading-tight tracking-tight text-[var(--text)] sm:text-[20px]">
                  Northern California&rsquo;s best driving roads, mapped.
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-[var(--text-dim)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </header>

              <div className="mt-4 space-y-3 text-[13.5px] leading-relaxed text-[var(--text-muted)]">
                <Block label="What this is">
                  A curated guide to {totalRoutes} of the best driving roads in
                  the San Francisco Bay Area and Northern California — coastal
                  Highway 1, the redwood corridors of the Santa Cruz Mountains,
                  Mt. Hamilton&rsquo;s switchbacks, the Sierra passes, and the
                  Mendocino coastline. Each route shows distance, elevation,
                  difficulty, traffic, and the seasonal best time to go.
                </Block>
                <Block label="Why we made it">
                  Driving notes for these roads usually live scattered across
                  enthusiast forums, motorcycle trip reports, and old blogs.
                  We&rsquo;re consolidating the ones that keep coming up — with
                  real coordinates and route lines on the map, plus a way to
                  check off the ones you&rsquo;ve driven.
                </Block>
                <Block label="Who it&rsquo;s for">
                  Anyone who plans a Sunday morning around a road. Drivers,
                  motorcyclists, weekend road-trippers, and anyone visiting
                  the Bay Area looking for the runs the locals know.
                </Block>
              </div>

              <p className="mt-5 rounded-lg bg-[var(--surface-2)] px-3 py-2.5 text-[11.5px] leading-relaxed text-[var(--text-muted)]">
                <strong className="text-[var(--text)]">Disclaimer.</strong>{" "}
                Road conditions change frequently — pavement quality, closures,
                wildlife, and weather can all shift overnight. Information is
                provided as-is for general guidance only. Drive within the
                posted limits, your own skill, and the conditions of the day.
                You&rsquo;re responsible for your own safety.
              </p>
            </div>

            {/* Image placeholder — replace with a real photo / OG card */}
            <div className="relative hidden md:block">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-soft)] via-[var(--surface-2)] to-[var(--surface)]" />
              <svg
                viewBox="0 0 240 200"
                className="absolute inset-0 h-full w-full"
                preserveAspectRatio="xMidYMid slice"
                aria-hidden
              >
                <path
                  d="M0,150 L20,138 L42,148 L70,128 L96,140 L120,118 L150,130 L180,108 L210,124 L240,112 L240,200 L0,200 Z"
                  fill="var(--accent)"
                  opacity="0.18"
                />
                <path
                  d="M0,170 L26,160 L54,170 L80,150 L110,164 L140,148 L172,160 L200,140 L228,154 L240,148 L240,200 L0,200 Z"
                  fill="var(--accent)"
                  opacity="0.32"
                />
                <path
                  d="M0,188 L40,180 L78,188 L120,176 L160,184 L200,174 L240,182 L240,200 L0,200 Z"
                  fill="var(--accent)"
                  opacity="0.55"
                />
                <path
                  d="M-10,200 C 60,170 80,140 130,150 C 180,160 200,130 250,120"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="190" cy="48" r="22" fill="var(--accent)" opacity="0.45" />
              </svg>
              <div className="absolute inset-x-0 bottom-2 px-3 text-right text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-dim)]">
                placeholder
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">
        {label}
      </div>
      <p>{children}</p>
    </div>
  );
}
