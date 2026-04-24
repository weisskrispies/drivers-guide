import type { Road } from "@/lib/roads/types";

type Props = { road: Road };

export function RoadDetail({ road }: Props) {
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {road.name}
        </h2>
        {road.region && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{road.region}</p>
        )}
      </header>
      {road.description && (
        <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
          {road.description}
        </p>
      )}
      <dl className="grid grid-cols-2 gap-3 text-sm">
        {road.distance_miles != null && (
          <Stat label="Distance" value={`${road.distance_miles} mi`} />
        )}
        {road.est_drive_minutes != null && (
          <Stat label="Drive time" value={`${road.est_drive_minutes} min`} />
        )}
        {road.elevation_gain_ft != null && (
          <Stat label="Elevation gain" value={`${road.elevation_gain_ft.toLocaleString()} ft`} />
        )}
        {road.surface_quality && (
          <Stat label="Surface" value={road.surface_quality} />
        )}
        {road.best_time && <Stat label="Best time" value={road.best_time} />}
      </dl>
      {road.characteristics.length > 0 && (
        <TagGroup label="Characteristics" items={road.characteristics} tone="neutral" />
      )}
      {road.hazards.length > 0 && (
        <TagGroup label="Hazards" items={road.hazards} tone="warning" />
      )}
      {road.traffic_notes && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Traffic notes
          </h3>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            {road.traffic_notes}
          </p>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-900">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium capitalize text-zinc-900 dark:text-zinc-100">
        {value}
      </dd>
    </div>
  );
}

function TagGroup({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: "neutral" | "warning";
}) {
  const toneClass =
    tone === "warning"
      ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </h3>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className={`rounded-full px-2.5 py-0.5 text-xs ${toneClass}`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
