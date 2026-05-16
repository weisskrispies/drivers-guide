import { bearingDelta } from "@/lib/geo";

// Bay Area-centric day/time heuristics. Deliberately approximate — these
// produce human advisories ("low sun in your eyes", "weekday commute hours"),
// not navigation-grade data.

const BAY_LAT = 37.8;
const BAY_LNG = -122.27;

export interface DateTimeContext {
  iso: string;
  valid: boolean;
  /** 0 = Sunday … 6 = Saturday (local). */
  dayOfWeek: number;
  isWeekend: boolean;
  hour: number;
  minute: number;
  decimalHour: number;
  sunriseHour: number;
  sunsetHour: number;
  isRushHour: boolean;
  nearSunrise: boolean;
  nearSunset: boolean;
}

function isUSDateDST(d: Date): boolean {
  // US DST: 2nd Sunday of March → 1st Sunday of November.
  const year = d.getUTCFullYear();
  const march = new Date(Date.UTC(year, 2, 1));
  const secondSunMarch = 1 + ((7 - march.getUTCDay()) % 7) + 7;
  const nov = new Date(Date.UTC(year, 10, 1));
  const firstSunNov = 1 + ((7 - nov.getUTCDay()) % 7);
  const dstStart = Date.UTC(year, 2, secondSunMarch, 10);
  const dstEnd = Date.UTC(year, 10, firstSunNov, 9);
  const t = d.getTime();
  return t >= dstStart && t < dstEnd;
}

/** NOAA-simplified sunrise/sunset, returned as local decimal hours. */
function sunriseSunset(date: Date, tzOffsetHours: number): [number, number] {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start) / 86400000);

  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1 + 0.5);
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const latRad = (BAY_LAT * Math.PI) / 180;
  const zenith = (90.833 * Math.PI) / 180;
  const cosHa =
    Math.cos(zenith) / (Math.cos(latRad) * Math.cos(decl)) -
    Math.tan(latRad) * Math.tan(decl);
  if (cosHa > 1 || cosHa < -1) return [6, 18];
  const ha = (Math.acos(cosHa) * 180) / Math.PI;

  const toLocalHour = (m: number) => (m / 60 + tzOffsetHours + 24) % 24;
  return [
    toLocalHour(720 - 4 * (BAY_LNG + ha) - eqTime),
    toLocalHour(720 - 4 * (BAY_LNG - ha) - eqTime),
  ];
}

export function analyzeDateTime(iso: string): DateTimeContext {
  // Parse wall-clock components and treat them as Bay Area local time.
  // Component parsing avoids server/client timezone drift.
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) {
    return {
      iso,
      valid: false,
      dayOfWeek: 0,
      isWeekend: false,
      hour: 12,
      minute: 0,
      decimalHour: 12,
      sunriseHour: 6.5,
      sunsetHour: 18.5,
      isRushHour: false,
      nearSunrise: false,
      nearSunset: false,
    };
  }

  const [, ys, mos, ds, hs, mis] = m;
  const year = Number(ys);
  const hour = Number(hs);
  const minute = Number(mis);
  const canonical = new Date(
    Date.UTC(year, Number(mos) - 1, Number(ds), hour, minute),
  );

  const tzOffset = isUSDateDST(canonical) ? -7 : -8;
  const decimalHour = hour + minute / 60;
  const dayOfWeek = canonical.getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const [sunriseHour, sunsetHour] = sunriseSunset(canonical, tzOffset);

  const isRushHour =
    !isWeekend &&
    ((decimalHour >= 7 && decimalHour <= 9.5) ||
      (decimalHour >= 16 && decimalHour <= 18.5));

  return {
    iso,
    valid: true,
    dayOfWeek,
    isWeekend,
    hour,
    minute,
    decimalHour,
    sunriseHour,
    sunsetHour,
    isRushHour,
    nearSunrise: Math.abs(decimalHour - sunriseHour) <= 0.75,
    nearSunset: Math.abs(decimalHour - sunsetHour) <= 0.75,
  };
}

/** Glare advisory for a segment heading, given the time of day. */
export function glareNoteForBearing(
  bearingDeg: number,
  ctx: DateTimeContext,
): string | null {
  if (ctx.nearSunrise && bearingDelta(bearingDeg, 90) <= 55) {
    return "Low sunrise sun roughly ahead — glare driving eastbound.";
  }
  if (ctx.nearSunset && bearingDelta(bearingDeg, 270) <= 55) {
    return "Low sunset sun roughly ahead — glare driving westbound.";
  }
  return null;
}

export function describeDateTime(ctx: DateTimeContext): string {
  if (!ctx.valid) return "Unspecified day/time";
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const h = ctx.hour % 12 === 0 ? 12 : ctx.hour % 12;
  const ampm = ctx.hour < 12 ? "AM" : "PM";
  const mm = ctx.minute.toString().padStart(2, "0");
  return `${days[ctx.dayOfWeek]}, ${h}:${mm} ${ampm}`;
}
