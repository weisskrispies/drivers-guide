/**
 * Sunrise / sunset for a given date and lat/lng using the standard
 * NOAA solar-position approximation. Accurate to within a minute or
 * two, which is more than enough for an "is it day or night here right
 * now" check.
 *
 * No dependencies — the math is short.
 */

export type SunTimes = {
  sunrise: Date | null;
  sunset: Date | null;
  alwaysDay: boolean;
  alwaysNight: boolean;
};

const J2000 = 2451545.0;
const DEG = Math.PI / 180;

function julian(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function fromJulian(j: number): Date {
  return new Date((j - 2440587.5) * 86400000);
}

export function getSunTimes(date: Date, lat: number, lng: number): SunTimes {
  const J = julian(date);
  const n = J - J2000 - 0.0009 + lng / 360;
  const Jstar = Math.round(n);

  const M = (357.5291 + 0.98560028 * Jstar) % 360;
  const Mrad = M * DEG;
  const C =
    1.9148 * Math.sin(Mrad) +
    0.02 * Math.sin(2 * Mrad) +
    0.0003 * Math.sin(3 * Mrad);
  const lambda = ((M + C + 180 + 102.9372) % 360) * DEG;
  const Jtransit =
    J2000 +
    Jstar +
    0.0053 * Math.sin(Mrad) -
    0.0069 * Math.sin(2 * lambda);
  const delta = Math.asin(Math.sin(lambda) * Math.sin(23.44 * DEG));
  const latRad = lat * DEG;

  const cosH =
    (Math.sin(-0.83 * DEG) - Math.sin(latRad) * Math.sin(delta)) /
    (Math.cos(latRad) * Math.cos(delta));

  if (cosH > 1) {
    return {
      sunrise: null,
      sunset: null,
      alwaysDay: false,
      alwaysNight: true,
    };
  }
  if (cosH < -1) {
    return {
      sunrise: null,
      sunset: null,
      alwaysDay: true,
      alwaysNight: false,
    };
  }

  const H = Math.acos(cosH) / DEG;
  const Jset = Jtransit + H / 360;
  const Jrise = Jtransit - H / 360;
  return {
    sunrise: fromJulian(Jrise),
    sunset: fromJulian(Jset),
    alwaysDay: false,
    alwaysNight: false,
  };
}

/** True if the given date is between sunrise and sunset at the given
 *  latitude/longitude. Always-day = true; always-night = false. */
export function isDaylight(date: Date, lat: number, lng: number): boolean {
  const t = getSunTimes(date, lat, lng);
  if (t.alwaysDay) return true;
  if (t.alwaysNight) return false;
  if (!t.sunrise || !t.sunset) return true;
  const ms = date.getTime();
  return ms >= t.sunrise.getTime() && ms < t.sunset.getTime();
}

/** Returns the next sunrise-or-sunset transition in the future, or null
 *  if the location is in continuous day/night for the next several
 *  days. */
export function nextSunTransition(
  date: Date,
  lat: number,
  lng: number,
): Date | null {
  const ms = date.getTime();
  for (let dayOffset = 0; dayOffset < 4; dayOffset++) {
    const probe = new Date(ms + dayOffset * 86400000);
    const t = getSunTimes(probe, lat, lng);
    if (t.sunrise && t.sunrise.getTime() > ms) return t.sunrise;
    if (t.sunset && t.sunset.getTime() > ms) return t.sunset;
  }
  return null;
}
