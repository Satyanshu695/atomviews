import { jsonResponse, getJson, parseLatLon, WeatherServiceError } from "./utils/http.mts";
import { atValue } from "./utils/normalize.mts";

const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
const HOURLY_VARS = [
  "wave_height", "wave_direction", "wave_period",
  "wind_wave_height", "wind_wave_direction", "wind_wave_period",
  "swell_wave_height", "swell_wave_direction", "swell_wave_period",
  "sea_surface_temperature",
];

export default async (req: Request) => {
  const url = new URL(req.url);
  const parsed = parseLatLon(url);
  if ("error" in parsed) return jsonResponse({ success: false, message: parsed.error[0] }, parsed.error[1]);
  const { lat, lon } = parsed;

  let data: any;
  try {
    data = await getJson(MARINE_URL, { latitude: lat, longitude: lon, hourly: HOURLY_VARS.join(","), forecast_days: 3, timezone: "auto" }, 15000);
  } catch {
    return jsonResponse({ success: true, data: { available: false, message: "Marine weather data is not available for this location.", hours: [] } });
  }

  const hourly = data.hourly || {};
  const times: string[] = hourly.time || [];
  const waveHeights: any[] = hourly.wave_height || [];
  const hasData = times.length > 0 && waveHeights.some((v) => v !== null && v !== undefined);

  if (!hasData) {
    return jsonResponse({ success: true, data: { available: false, message: "Marine weather data is not available for this location.", hours: [] } });
  }

  const hours = times.slice(0, 72).map((t, i) => ({
    time: t,
    wave_height: atValue(hourly, "wave_height", i),
    wave_direction: atValue(hourly, "wave_direction", i),
    wave_period: atValue(hourly, "wave_period", i),
    swell_wave_height: atValue(hourly, "swell_wave_height", i),
    swell_wave_direction: atValue(hourly, "swell_wave_direction", i),
    sea_surface_temperature: atValue(hourly, "sea_surface_temperature", i),
  }));

  return jsonResponse({ success: true, data: { available: true, hours, source: "Open-Meteo Marine Weather API" } });
};
