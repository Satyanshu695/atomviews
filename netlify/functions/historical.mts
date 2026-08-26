import { jsonResponse, parseLatLon, WeatherServiceError } from "./utils/http.mts";
import { getHistoricalRange } from "./utils/historical-service.mts";

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const parsed = parseLatLon(url);
  if ("error" in parsed) return jsonResponse({ success: false, message: parsed.error[0] }, parsed.error[1]);
  const { lat, lon } = parsed;

  const endDate = url.searchParams.get("end_date") || isoDaysAgo(6);
  const startDate = url.searchParams.get("start_date") || isoDaysAgo(36);

  try {
    const rows = await getHistoricalRange(lat, lon, startDate, endDate);
    return jsonResponse({ success: true, data: rows, source: "Open-Meteo Historical Weather API" });
  } catch (e) {
    if (e instanceof WeatherServiceError) return jsonResponse({ success: false, message: e.message }, 503);
    throw e;
  }
};
