import { jsonResponse, parseLatLon, WeatherServiceError } from "./utils/http.mts";
import { fetchForecastBundle, PROVIDER_NAME } from "./utils/weather-service.mts";
import { normalizeDaily } from "./utils/normalize.mts";

export default async (req: Request) => {
  const url = new URL(req.url);
  const parsed = parseLatLon(url);
  if ("error" in parsed) return jsonResponse({ success: false, message: parsed.error[0] }, parsed.error[1]);
  const { lat, lon } = parsed;
  const days = Math.min(Math.max(Number(url.searchParams.get("days") || 7), 1), 16);

  let bundle: any;
  try {
    bundle = await fetchForecastBundle(lat, lon, days);
  } catch (e) {
    if (e instanceof WeatherServiceError) return jsonResponse({ success: false, message: e.message }, 503);
    throw e;
  }

  const data = normalizeDaily(bundle, days);
  return jsonResponse({ success: true, data, provider: PROVIDER_NAME });
};
