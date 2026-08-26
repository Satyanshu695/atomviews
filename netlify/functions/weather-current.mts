import { jsonResponse, parseLatLon, WeatherServiceError } from "./utils/http.mts";
import { fetchForecastBundle, PROVIDER_NAME } from "./utils/weather-service.mts";
import { normalizeCurrent } from "./utils/normalize.mts";

export default async (req: Request) => {
  const url = new URL(req.url);
  const parsed = parseLatLon(url);
  if ("error" in parsed) return jsonResponse({ success: false, message: parsed.error[0] }, parsed.error[1]);
  const { lat, lon } = parsed;

  let bundle: any;
  try {
    bundle = await fetchForecastBundle(lat, lon, 1);
  } catch (e) {
    if (e instanceof WeatherServiceError) return jsonResponse({ success: false, message: e.message }, 503);
    throw e;
  }

  const location = {
    name: url.searchParams.get("name") || "",
    country: url.searchParams.get("country") || "",
    latitude: lat,
    longitude: lon,
    timezone: null,
  };
  const data = normalizeCurrent(bundle, location);
  return jsonResponse({ success: true, data, provider: PROVIDER_NAME });
};
