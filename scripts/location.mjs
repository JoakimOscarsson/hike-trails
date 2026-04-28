export const swedishCounties = [
  "Blekinge län",
  "Dalarnas län",
  "Gotlands län",
  "Gävleborgs län",
  "Hallands län",
  "Jämtlands län",
  "Jönköpings län",
  "Kalmar län",
  "Kronobergs län",
  "Norrbottens län",
  "Skåne län",
  "Stockholms län",
  "Södermanlands län",
  "Uppsala län",
  "Värmlands län",
  "Västerbottens län",
  "Västernorrlands län",
  "Västmanlands län",
  "Västra Götalands län",
  "Örebro län",
  "Östergötlands län"
];

const countyCentroids = [
  { label: "Blekinge län", lat: 56.25, lon: 15.25 },
  { label: "Dalarnas län", lat: 60.85, lon: 14.55 },
  { label: "Gotlands län", lat: 57.5, lon: 18.55 },
  { label: "Gävleborgs län", lat: 61.35, lon: 16.35 },
  { label: "Hallands län", lat: 56.95, lon: 12.85 },
  { label: "Jämtlands län", lat: 63.15, lon: 14.65 },
  { label: "Jönköpings län", lat: 57.55, lon: 14.35 },
  { label: "Kalmar län", lat: 57.2, lon: 16.05 },
  { label: "Kronobergs län", lat: 56.85, lon: 14.65 },
  { label: "Norrbottens län", lat: 67.15, lon: 20.85 },
  { label: "Skåne län", lat: 55.95, lon: 13.45 },
  { label: "Stockholms län", lat: 59.35, lon: 18.2 },
  { label: "Södermanlands län", lat: 59.05, lon: 16.75 },
  { label: "Uppsala län", lat: 60.0, lon: 17.7 },
  { label: "Värmlands län", lat: 59.75, lon: 13.15 },
  { label: "Västerbottens län", lat: 64.75, lon: 18.6 },
  { label: "Västernorrlands län", lat: 63.05, lon: 17.65 },
  { label: "Västmanlands län", lat: 59.85, lon: 16.35 },
  { label: "Västra Götalands län", lat: 58.25, lon: 12.9 },
  { label: "Örebro län", lat: 59.45, lon: 15.15 },
  { label: "Östergötlands län", lat: 58.35, lon: 15.75 }
];

const countyAliases = new Map([
  ["blekinge county", "Blekinge län"],
  ["dalarna county", "Dalarnas län"],
  ["gotland county", "Gotlands län"],
  ["gävleborg county", "Gävleborgs län"],
  ["gavleborg county", "Gävleborgs län"],
  ["halland county", "Hallands län"],
  ["jämtland county", "Jämtlands län"],
  ["jamtland county", "Jämtlands län"],
  ["jönköping county", "Jönköpings län"],
  ["jonkoping county", "Jönköpings län"],
  ["kalmar county", "Kalmar län"],
  ["kronoberg county", "Kronobergs län"],
  ["norrbotten county", "Norrbottens län"],
  ["scania county", "Skåne län"],
  ["skåne county", "Skåne län"],
  ["skane county", "Skåne län"],
  ["stockholm county", "Stockholms län"],
  ["södermanland county", "Södermanlands län"],
  ["sodermanland county", "Södermanlands län"],
  ["uppsala county", "Uppsala län"],
  ["värmland county", "Värmlands län"],
  ["varmland county", "Värmlands län"],
  ["västerbotten county", "Västerbottens län"],
  ["vasterbotten county", "Västerbottens län"],
  ["västernorrland county", "Västernorrlands län"],
  ["vasternorrland county", "Västernorrlands län"],
  ["västmanland county", "Västmanlands län"],
  ["vastmanland county", "Västmanlands län"],
  ["västra götaland county", "Västra Götalands län"],
  ["vastra gotaland county", "Västra Götalands län"],
  ["örebro county", "Örebro län"],
  ["orebro county", "Örebro län"],
  ["östergötland county", "Östergötlands län"],
  ["ostergotland county", "Östergötlands län"]
]);

function isProbablyInSweden(lat, lon) {
  return lat >= 55.0 && lat <= 69.2 && lon >= 10.5 && lon <= 24.5;
}

function normalizeCountyName(value) {
  if (!value) return undefined;
  const normalized = value.trim();
  if (swedishCounties.includes(normalized)) return normalized;
  return countyAliases.get(normalized.toLowerCase());
}

function distanceSquared(latA, lonA, latB, lonB) {
  const latScale = 111;
  const lonScale = Math.cos((latA * Math.PI) / 180) * 111;
  return ((latA - latB) * latScale) ** 2 + ((lonA - lonB) * lonScale) ** 2;
}

function nearestCounty(lat, lon) {
  return countyCentroids.reduce((best, county) => {
    const distance = distanceSquared(lat, lon, county.lat, county.lon);
    return distance < best.distance ? { label: county.label, distance } : best;
  }, { label: "Stockholms län", distance: Number.POSITIVE_INFINITY }).label;
}

export async function resolveLocationFromStart(start) {
  const [lat, lon] = start;

  if (!isProbablyInSweden(lat, lon)) {
    return { type: "abroad", label: "Abroad", start };
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("zoom", "10");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url, {
      headers: {
        "User-Agent": "hike-library/0.1 (local import tool)"
      }
    });

    if (response.ok) {
      const data = await response.json();
      const label = normalizeCountyName(data.address?.county) ?? normalizeCountyName(data.address?.state);
      if (label) return { type: "swedish-county", label, start };
    }
  } catch {
    // Network lookup is best-effort; the local fallback keeps imports usable offline.
  }

  return { type: "swedish-county", label: nearestCounty(lat, lon), start };
}
