"use client";

import { useEffect } from "react";
import { useTheme, type ThemePref } from "@/lib/storage";
import { useHomeLocation } from "@/lib/storage";

/**
 * Cycles through three modes: auto → light → dark → auto.
 *
 *  - auto:  follow the user's local sunrise/sunset (icon: half sun)
 *  - light: stay in day mode (icon: sun)
 *  - dark:  stay in night mode (icon: moon)
 *
 * The visible icon shows the *current* preference; the tooltip
 * explains what the next click will do.
 */
export default function ThemeToggle() {
  // We don't have GPS in this component, but home is enough to get the
  // resolved theme right for the boot phase; the fuller resolution
  // (with currentLocation) happens inside RoadsApp's useTheme call. We
  // just need to mirror the on-disk preference to apply the class.
  const { home } = useHomeLocation();
  const { theme, themePref, toggle } = useTheme(home);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  const labels: Record<ThemePref, { icon: React.ReactNode; tooltip: string }> = {
    auto: {
      icon: <AutoIcon />,
      tooltip: "Theme: auto (sunrise / sunset). Click for light.",
    },
    light: {
      icon: <SunIcon />,
      tooltip: "Theme: light. Click for dark.",
    },
    dark: {
      icon: <MoonIcon />,
      tooltip: "Theme: dark. Click for auto.",
    },
  };
  const { icon, tooltip } = labels[themePref];

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={tooltip}
      title={tooltip}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
    >
      {icon}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.93 19.07l1.41-1.41" />
      <path d="M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function AutoIcon() {
  // Half sun / half moon — the "auto follows the sky" symbol.
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 8 a4 4 0 0 0 0 8 z" fill="currentColor" stroke="none" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.93 19.07l1.41-1.41" />
      <path d="M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
