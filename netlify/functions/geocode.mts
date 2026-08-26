import { jsonResponse, getJson, WeatherServiceError } from "./utils/http.mts";

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

export default async (req: Request) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) return jsonResponse({ success: false, message: "Query parameter 'q' is required." }, 400);

  let data: any;
  try {
    data = await getJson(GEOCODE_URL, { name: q, count: 8, language: "en", format: "json" });
  } catch (e) {
    if (e instanceof WeatherServiceError) return jsonResponse({ success: false, message: e.message }, 503);
    throw e;
  }

  const results = (data.results || []).map((r: any) => ({
    name: r.name,
    country: r.country,
    country_code: r.country_code,
    admin1: r.admin1,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
    elevation: r.elevation,
    population: r.population,
  }));

  if (!results.length) return jsonResponse({ success: false, message: `No locations found for '${q}'.` }, 404);
  return jsonResponse({ success: true, results });
};
