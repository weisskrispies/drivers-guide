export type Level = {
  threshold: number; // inclusive count required
  title: string;
  blurb: string;
};

// Punny ranks. Higher threshold first is handled in `levelForCount`.
export const LEVELS: Level[] = [
  { threshold: 0, title: "Garage Queen", blurb: "The car is warm. The seat is cold." },
  { threshold: 1, title: "Cone Dodger", blurb: "One road down. The cones fear you already." },
  { threshold: 3, title: "Third-Gear Hero", blurb: "You've discovered that third gear exists outside the freeway." },
  { threshold: 5, title: "Canyon Carver", blurb: "The redwoods know your exhaust note." },
  { threshold: 7, title: "Pavement Philosopher", blurb: "You now have Opinions about camber." },
  { threshold: 10, title: "Switchback Sensei", blurb: "Your passengers have stopped reaching for the handle." },
  { threshold: 13, title: "Apex Predator", blurb: "Cattle guards cannot contain you. The fog fears you." },
];

export function levelForCount(count: number): { level: Level; next?: Level; progress: number } {
  const sorted = [...LEVELS].sort((a, b) => a.threshold - b.threshold);
  let current = sorted[0];
  let next: Level | undefined;
  for (let i = 0; i < sorted.length; i++) {
    if (count >= sorted[i].threshold) {
      current = sorted[i];
      next = sorted[i + 1];
    } else {
      break;
    }
  }
  const progress = next
    ? Math.min(1, (count - current.threshold) / (next.threshold - current.threshold))
    : 1;
  return { level: current, next, progress };
}
