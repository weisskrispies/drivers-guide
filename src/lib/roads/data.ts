import type { Road } from "./types";

/**
 * Curated SF Bay Area driving roads. Coordinates are approximate start/end
 * points good enough for distance sorting + map markers. Sources are the
 * enthusiast forum threads that consistently surface these as "go-to" drives.
 */
export const ROADS: Road[] = [
  {
    slug: "hwy-1-pacifica-hmb",
    name: "Highway 1 — Pacifica to Half Moon Bay",
    region: "San Mateo Coast",
    summary: "Cliffside sweepers with ocean on your right the whole way.",
    description:
      "Devil's Slide tunnel and the cliffs north of Montara give you fast, flowing sweepers with panoramic Pacific views. Pair it with the return up 92 for a classic coastal loop.",
    distanceMiles: 14,
    elevationGainFt: 650,
    estDriveMinutes: 25,
    difficulty: "moderate",
    surfaceQuality: "good",
    trafficNotes:
      "Cyclists on shoulders, weekend RVs and tourist traffic — early morning is essential.",
    characteristics: ["coastal", "sweepers", "scenic", "tunnel"],
    hazards: ["fog", "cyclists", "wildlife at dusk"],
    bestTime: "Sunrise — fog burns off and traffic is minimal",
    start: { lat: 37.6094, lng: -122.4913, label: "Pacifica" },
    end: { lat: 37.4636, lng: -122.4286, label: "Half Moon Bay" },
    sources: [
      {
        label: "Rennlist — SF Bay Area Best Driving Roads",
        url: "https://rennlist.com/forums/west-us-rennlist-region/998154-sf-bay-area-best-driving-roads-for-a-sunday-morning-blast.html",
      },
    ],
  },
  {
    slug: "hwy-84-la-honda",
    name: "Highway 84 — La Honda Road",
    region: "Santa Cruz Mountains",
    summary:
      "Redwood-canopied second- and third-gear corners from Sky Londa down to the coast.",
    description:
      "The classic La Honda run: tight, rhythmic corners under redwoods from Skyline down through La Honda to San Gregorio. A true Bay Area rite of passage.",
    distanceMiles: 12,
    elevationGainFt: 1700,
    estDriveMinutes: 25,
    difficulty: "spirited",
    surfaceQuality: "good",
    trafficNotes:
      "Motorcycle-heavy on weekends, CHP known to patrol — be visible and polite.",
    characteristics: ["redwoods", "technical", "tight corners", "low light"],
    hazards: ["damp patches", "gravel at driveway exits", "motorcycles"],
    bestTime: "Weekday mornings before 9am",
    start: { lat: 37.4206, lng: -122.2573, label: "Sky Londa (Hwy 35)" },
    end: { lat: 37.3193, lng: -122.4022, label: "San Gregorio" },
    sources: [
      {
        label: "Rennlist — SF Bay Area Best Driving Roads",
        url: "https://rennlist.com/forums/west-us-rennlist-region/998154-sf-bay-area-best-driving-roads-for-a-sunday-morning-blast.html",
      },
    ],
  },
  {
    slug: "hwy-9-saratoga-boulder-creek",
    name: "Highway 9 — Saratoga Gap to Boulder Creek",
    region: "Santa Cruz Mountains",
    summary:
      "Long, committed run dropping off Skyline into Boulder Creek — fast up top, tight at the bottom.",
    description:
      "Start at Saratoga Gap where Skyline, 9 and 35 converge. The top third is open and fast, the middle threads through Waterman Gap, and the final descent into Boulder Creek tightens up with off-camber surprises.",
    distanceMiles: 13,
    elevationGainFt: 1600,
    estDriveMinutes: 28,
    difficulty: "spirited",
    surfaceQuality: "fair",
    trafficNotes:
      "Heavy on summer weekends with beach traffic — weekday or very early weekend only.",
    characteristics: ["mixed pace", "elevation change", "forested"],
    hazards: ["broken pavement in spots", "debris after storms"],
    bestTime: "Weekday mornings; avoid summer afternoons",
    start: { lat: 37.2373, lng: -122.1326, label: "Saratoga Gap" },
    end: { lat: 37.1263, lng: -122.1225, label: "Boulder Creek" },
    sources: [
      {
        label: "Rennlist — SF Bay Area Best Driving Roads",
        url: "https://rennlist.com/forums/west-us-rennlist-region/998154-sf-bay-area-best-driving-roads-for-a-sunday-morning-blast.html",
      },
    ],
  },
  {
    slug: "skyline-35-sky-londa-saratoga",
    name: "Skyline Boulevard (Hwy 35) — Sky Londa to Saratoga Gap",
    region: "Skyline Ridge",
    summary:
      "Ridge-top cruiser with third- and fourth-gear sweepers and giant views.",
    description:
      "The spine of the Peninsula. Fast, flowing, and wide open for most of the length. Great for warm-up laps or for stringing together La Honda, Page Mill, Alpine and 9.",
    distanceMiles: 19,
    elevationGainFt: 1100,
    estDriveMinutes: 35,
    difficulty: "moderate",
    surfaceQuality: "good",
    trafficNotes: "Bikes everywhere on weekends — give them room.",
    characteristics: ["ridge", "sweepers", "viewpoints"],
    hazards: ["cyclists", "deer at dawn/dusk"],
    bestTime: "Early morning, any day",
    start: { lat: 37.4206, lng: -122.2573, label: "Sky Londa" },
    end: { lat: 37.2373, lng: -122.1326, label: "Saratoga Gap" },
    sources: [
      {
        label: "Rennlist — SF Bay Area Best Driving Roads",
        url: "https://rennlist.com/forums/west-us-rennlist-region/998154-sf-bay-area-best-driving-roads-for-a-sunday-morning-blast.html",
      },
    ],
  },
  {
    slug: "page-mill-road",
    name: "Page Mill Road",
    region: "Santa Cruz Mountains",
    summary:
      "Tight, narrow ascent from Palo Alto to Skyline — a proper technical climb.",
    description:
      "One-lane-feel switchbacks and blind corners most of the way up. Rewards smoothness over speed; punishes bravado. Classic hill climb for the Peninsula.",
    distanceMiles: 8.5,
    elevationGainFt: 2000,
    estDriveMinutes: 25,
    difficulty: "expert",
    surfaceQuality: "fair",
    trafficNotes:
      "Serious cyclist traffic — hairpins are often blind. Assume a bike in every corner.",
    characteristics: ["hill climb", "switchbacks", "narrow"],
    hazards: ["blind crests", "cyclists", "oncoming cars mid-corner"],
    bestTime: "Weekday mornings",
    start: { lat: 37.4123, lng: -122.1543, label: "Palo Alto foothills" },
    end: { lat: 37.3608, lng: -122.1952, label: "Skyline Blvd" },
    sources: [
      {
        label: "Rennlist — SF Bay Area Best Driving Roads",
        url: "https://rennlist.com/forums/west-us-rennlist-region/998154-sf-bay-area-best-driving-roads-for-a-sunday-morning-blast.html",
      },
    ],
  },
  {
    slug: "old-la-honda-road",
    name: "Old La Honda Road",
    region: "Santa Cruz Mountains",
    summary:
      "One-lane canopy climb — second gear, max attention. Strictly for small cars.",
    description:
      "A legendary cycling climb that doubles as a tiny, delicate car road. Redwoods overhead, no shoulder, no center line. Drive it once for the experience, and only in something narrow.",
    distanceMiles: 3.4,
    elevationGainFt: 1290,
    estDriveMinutes: 15,
    difficulty: "expert",
    surfaceQuality: "fair",
    trafficNotes:
      "You WILL meet cyclists and oncoming cars. There is no room. Be ready to yield.",
    characteristics: ["one-lane", "redwoods", "historic"],
    hazards: ["cyclists", "no shoulder", "blind corners"],
    bestTime: "Very early weekday — never on summer Saturdays",
    start: { lat: 37.401, lng: -122.2381, label: "Woodside side" },
    end: { lat: 37.339, lng: -122.2692, label: "Skyline Blvd" },
    sources: [
      {
        label: "Rennlist — SF Bay Area Best Driving Roads",
        url: "https://rennlist.com/forums/west-us-rennlist-region/998154-sf-bay-area-best-driving-roads-for-a-sunday-morning-blast.html",
      },
    ],
  },
  {
    slug: "alpine-road",
    name: "Alpine Road",
    region: "Santa Cruz Mountains",
    summary:
      "Portola Valley up to Skyline — flowing, varied, under-appreciated.",
    description:
      "More rhythm than Page Mill, more shoulder than Old La Honda. Mixes open sweepers with tighter sections climbing out of the valley. A perfect warm-up before tackling 84 or 9.",
    distanceMiles: 8.2,
    elevationGainFt: 1700,
    estDriveMinutes: 20,
    difficulty: "spirited",
    surfaceQuality: "good",
    trafficNotes: "Cyclist-heavy, but the shoulder is wider than Page Mill.",
    characteristics: ["flowing", "mixed pace", "climb"],
    hazards: ["cyclists", "gravel in shaded corners"],
    bestTime: "Weekday mornings",
    start: { lat: 37.383, lng: -122.199, label: "Portola Valley" },
    end: { lat: 37.3448, lng: -122.2592, label: "Skyline Blvd" },
    sources: [
      {
        label: "Rennlist — SF Bay Area Best Driving Roads",
        url: "https://rennlist.com/forums/west-us-rennlist-region/998154-sf-bay-area-best-driving-roads-for-a-sunday-morning-blast.html",
      },
    ],
  },
  {
    slug: "mt-hamilton-130",
    name: "Mt. Hamilton Road (Hwy 130)",
    region: "Diablo Range",
    summary:
      "Endless switchbacks up to Lick Observatory. A destination in itself.",
    description:
      "Thirty-plus miles of relentless, perfectly-engineered switchbacks climbing from San Jose to the observatory at 4,200 ft. Empty most weekdays. One of the great driving roads in the US, full stop.",
    distanceMiles: 18,
    elevationGainFt: 4200,
    estDriveMinutes: 55,
    difficulty: "spirited",
    surfaceQuality: "good",
    trafficNotes:
      "Lightly trafficked — biggest risk is a slow tourist in front of you.",
    characteristics: ["switchbacks", "destination drive", "summit"],
    hazards: ["livestock on road", "cattle guards", "no fuel up top"],
    bestTime: "Weekday mornings; fall for clearest air",
    start: { lat: 37.3373, lng: -121.8209, label: "Alum Rock / East SJ" },
    end: { lat: 37.3414, lng: -121.6429, label: "Lick Observatory" },
    sources: [
      {
        label: "Rennlist — SF Bay Area Best Driving Roads",
        url: "https://rennlist.com/forums/west-us-rennlist-region/998154-sf-bay-area-best-driving-roads-for-a-sunday-morning-blast.html",
      },
    ],
  },
  {
    slug: "mines-road",
    name: "Mines Road (Livermore to The Junction)",
    region: "Diablo Range",
    summary:
      "Fifty miles of solitude, cattle guards, and corners. No gas, no services, no excuses.",
    description:
      "From Livermore wine country down to The Junction (and optionally continuing on to Hamilton or San Antonio Valley). Remote, technical, and long. Pack snacks and a full tank.",
    distanceMiles: 50,
    elevationGainFt: 2400,
    estDriveMinutes: 100,
    difficulty: "spirited",
    surfaceQuality: "mixed",
    trafficNotes:
      "Almost none — occasional oncoming motorcyclist at speed, cattle loose on road.",
    characteristics: ["remote", "long run", "varied pace"],
    hazards: [
      "open-range cattle",
      "cattle guards",
      "no cell service",
      "no fuel",
    ],
    bestTime: "Anytime a weekday — start early for cool pavement",
    start: { lat: 37.6594, lng: -121.7221, label: "Livermore" },
    end: { lat: 37.4072, lng: -121.5133, label: "The Junction" },
    sources: [
      {
        label: "Rennlist — SF Bay Area Best Driving Roads",
        url: "https://rennlist.com/forums/west-us-rennlist-region/998154-sf-bay-area-best-driving-roads-for-a-sunday-morning-blast.html",
      },
    ],
  },
  {
    slug: "mt-diablo-south-gate",
    name: "Mt. Diablo — South Gate Road to Summit",
    region: "East Bay",
    summary:
      "Paved climb to 3,849 ft with hairpins, a cattle guard, and a 360° Bay view.",
    description:
      "Enter via the Danville gate, climb through oak savannah, switch into second gear for the final push to the summit. Clear days you can see the Sierra.",
    distanceMiles: 11,
    elevationGainFt: 3200,
    estDriveMinutes: 35,
    difficulty: "moderate",
    surfaceQuality: "good",
    trafficNotes:
      "State park — 25 mph posted. This is a view drive, not a speed run. Rangers patrol.",
    characteristics: ["summit", "scenic", "state park"],
    hazards: ["cyclists climbing", "15 mph hairpins", "bumpy summit road"],
    bestTime: "Clear winter mornings after a storm",
    start: { lat: 37.8335, lng: -121.9307, label: "South Gate (Danville)" },
    end: { lat: 37.8816, lng: -121.9143, label: "Summit" },
    sources: [
      {
        label: "Rennlist — SF Bay Area Best Driving Roads",
        url: "https://rennlist.com/forums/west-us-rennlist-region/998154-sf-bay-area-best-driving-roads-for-a-sunday-morning-blast.html",
      },
    ],
  },
  {
    slug: "kings-mountain-road",
    name: "Kings Mountain Road",
    region: "Santa Cruz Mountains",
    summary:
      "Woodside up to Skyline — smooth, technical, postcard-pretty.",
    description:
      "Shorter and friendlier than Old La Honda but more technical than Skyline. Great connector from 280 up to the ridge for a Skyline → 84 loop.",
    distanceMiles: 5.2,
    elevationGainFt: 1500,
    estDriveMinutes: 15,
    difficulty: "moderate",
    surfaceQuality: "good",
    trafficNotes: "Cyclists and locals — be chill through the hamlet up top.",
    characteristics: ["climb", "connector", "forested"],
    hazards: ["cyclists", "tight driveways"],
    bestTime: "Weekday mornings",
    start: { lat: 37.4301, lng: -122.2542, label: "Woodside" },
    end: { lat: 37.4518, lng: -122.3065, label: "Skyline Blvd" },
    sources: [
      {
        label: "Rennlist — SF Bay Area Best Driving Roads",
        url: "https://rennlist.com/forums/west-us-rennlist-region/998154-sf-bay-area-best-driving-roads-for-a-sunday-morning-blast.html",
      },
    ],
  },
  {
    slug: "hwy-152-hecker-pass",
    name: "Highway 152 — Hecker Pass",
    region: "South Bay",
    summary:
      "Gilroy to Watsonville over a wooded pass — fast, open, underrated.",
    description:
      "Wider and faster than the mountain roads up north, with long sightlines and a couple of genuinely great sequences. Good as the 'away' leg of a coast loop.",
    distanceMiles: 10,
    elevationGainFt: 1300,
    estDriveMinutes: 20,
    difficulty: "moderate",
    surfaceQuality: "good",
    trafficNotes: "Commuter traffic weekday mornings and evenings.",
    characteristics: ["pass", "sweepers", "open"],
    hazards: ["commuter traffic", "trucks"],
    bestTime: "Weekend mid-morning",
    start: { lat: 37.007, lng: -121.5685, label: "Gilroy" },
    end: { lat: 36.9597, lng: -121.7272, label: "Watsonville" },
    sources: [
      {
        label: "Rennlist — SF Bay Area Best Driving Roads",
        url: "https://rennlist.com/forums/west-us-rennlist-region/998154-sf-bay-area-best-driving-roads-for-a-sunday-morning-blast.html",
      },
    ],
  },
  {
    slug: "hwy-1-point-reyes-marshall",
    name: "Highway 1 — Point Reyes Station to Marshall",
    region: "Marin Coast",
    summary:
      "Tomales Bay shoreline cruise — flowing, photogenic, oysters at the end.",
    description:
      "Less technical than the Peninsula 1, but stunning. Runs the east shore of Tomales Bay with long arcing bends and zero stoplights. Great as a morning-coffee-to-oysters run.",
    distanceMiles: 9.5,
    elevationGainFt: 400,
    estDriveMinutes: 18,
    difficulty: "easy",
    surfaceQuality: "good",
    trafficNotes: "Weekend tourist traffic slow but manageable.",
    characteristics: ["coastal", "flowing", "scenic"],
    hazards: ["cyclists", "cows on shoulder"],
    bestTime: "Weekend mornings",
    start: { lat: 38.0684, lng: -122.806, label: "Point Reyes Station" },
    end: { lat: 38.172, lng: -122.891, label: "Marshall" },
    sources: [
      {
        label: "Rennlist — SF Bay Area Best Driving Roads",
        url: "https://rennlist.com/forums/west-us-rennlist-region/998154-sf-bay-area-best-driving-roads-for-a-sunday-morning-blast.html",
      },
    ],
  },
  {
    slug: "bohemian-highway",
    name: "Bohemian Highway — Occidental to Monte Rio",
    region: "Sonoma County",
    summary:
      "Redwood tunnel with the Russian River at the end. Slow, beautiful, essential.",
    description:
      "Not a speed road — a savor road. Canopied by redwoods most of the way, with bends smooth enough to keep momentum in third. Ideal for a top-down cruise.",
    distanceMiles: 6,
    elevationGainFt: 300,
    estDriveMinutes: 15,
    difficulty: "easy",
    surfaceQuality: "good",
    trafficNotes: "Light — occasional slow tourist.",
    characteristics: ["redwoods", "cruiser", "scenic"],
    hazards: ["damp shade patches"],
    bestTime: "Late afternoon when sun streaks through the redwoods",
    start: { lat: 38.4063, lng: -122.9487, label: "Occidental" },
    end: { lat: 38.4654, lng: -123.0093, label: "Monte Rio" },
    sources: [
      {
        label: "Rennlist — SF Bay Area Best Driving Roads",
        url: "https://rennlist.com/forums/west-us-rennlist-region/998154-sf-bay-area-best-driving-roads-for-a-sunday-morning-blast.html",
      },
    ],
  },
];
