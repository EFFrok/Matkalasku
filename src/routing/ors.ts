import { ORS_API_KEY } from "./orsKey";

type GeocodeResponse = {
  features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
};

type DirectionsResponse = {
  routes?: Array<{ summary?: { distance?: number } }>;
};

export async function drivingDistanceKmTenths(from: string, to: string): Promise<number> {
  const apiKey = ORS_API_KEY.trim();
  if (!apiKey) {
    throw new Error("Kilometrejä ei voitu hakea. Kirjoita ne käsin.");
  }
  const origin = await geocode(from, apiKey);
  const destination = await geocode(to, apiKey);
  const response = await fetch("https://api.heigit.org/openrouteservice/v2/directions/driving-car", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ coordinates: [origin, destination] }),
  });
  if (!response.ok) throw new Error("Reittiä ei saatu. Tarkista osoitteet tai kirjoita kilometrit itse.");
  const body = (await response.json()) as DirectionsResponse;
  const meters = body.routes?.[0]?.summary?.distance;
  if (meters == null) throw new Error("Reittiä ei löytynyt. Kirjoita kilometrit itse.");
  return Math.round(meters / 1000) * 10;
}

async function geocode(text: string, apiKey: string): Promise<[number, number]> {
  const query = text.trim();
  if (!query) throw new Error("Kirjoita molemmat osoitteet.");
  const url = new URL("https://api.heigit.org/pelias/v1/search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("text", query);
  url.searchParams.set("boundary.country", "FI");
  url.searchParams.set("size", "1");
  const response = await fetch(url);
  if (!response.ok) throw new Error("Osoitetta ei voitu hakea.");
  const body = (await response.json()) as GeocodeResponse;
  const coordinates = body.features?.[0]?.geometry?.coordinates;
  if (!coordinates) throw new Error(`Osoitetta ei löytynyt: ${query}`);
  return coordinates;
}
