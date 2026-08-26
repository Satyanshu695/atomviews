import { jsonResponse, getJson, parseLatLon, WeatherServiceError } from "./utils/http.mts";

const AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const VARS = [
  "pm10", "pm2_5", "carbon_monoxide", "nitrogen_dioxide", "sulphur_dioxide",
  "ozone", "us_aqi", "european_aqi",
];

function aqiCategory(usAqi: number | null) {
  if (usAqi === null || usAqi === undefined) return "Unknown";
  if (usAqi <= 50) return "Good";
  if (usAqi <= 100) return "Moderate";
  if (usAqi <= 150) return "Unhealthy for Sensitive Groups";
  if (usAqi <= 200) return "Unhealthy";
  if (usAqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const parsed = parseLatLon(url);
  if ("error" in parsed) return jsonResponse({ success: false, message: parsed.error[0] }, parsed.error[1]);
  const { lat, lon } = parsed;

  let data: any;
  try {
    data = await getJson(AIR_QUALITY_URL, { latitude: lat, longitude: lon, current: VARS.join(","), timezone: "auto" }, 15000);
  } catch (e) {
    if (e instanceof WeatherServiceError) return jsonResponse({ success: false, message: e.message }, 503);
    throw e;
  }

  const c = data.current || {};
  const usAqi = c.us_aqi ?? null;

  return jsonResponse({
    success: true,
    data: {
      us_aqi: usAqi,
      european_aqi: c.european_aqi ?? null,
      category: aqiCategory(usAqi),
      pm10: c.pm10 ?? null,
      pm2_5: c.pm2_5 ?? null,
      carbon_monoxide: c.carbon_monoxide ?? null,
      nitrogen_dioxide: c.nitrogen_dioxide ?? null,
      sulphur_dioxide: c.sulphur_dioxide ?? null,
      ozone: c.ozone ?? null,
      observed_at: c.time ?? null,
      source: "Open-Meteo Air Quality API",
    },
  });
};
