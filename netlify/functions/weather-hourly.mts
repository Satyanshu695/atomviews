import { jsonResponse, parseLatLon, WeatherServiceError } from "./utils/http.mts";
import { fetchForecastBundle, PROVIDER_NAME } from "./utils/weather-service.mts";
import { normalizeHourly } from "./utils/normalize.mts";

export default async (req: Request) => {
  const url = new URL(req.url);
  const parsed = parseLatLon(url);
  if ("error" in parsed) return jsonResponse({ success: false, message: parsed.error[0] }, parsed.error[1]);
  const { lat, lon } = parsed;
  const hours = Math.min(Math.max(Number(url.searchParams.get("hours") || 72), 1), 384);

  let bundle: any;
  try {
    bundle = await fetchForecastBundle(lat, lon, Math.min(16, Math.floor(hours / 24) + 1));
  } catch (e) {
    if (e instanceof WeatherServiceError) return jsonResponse({ success: false, message: e.message }, 503);
    throw e;
  }

  const data = normalizeHourly(bundle, hours);
  return jsonResponse({ success: true, data, provider: PROVIDER_NAME });
};
