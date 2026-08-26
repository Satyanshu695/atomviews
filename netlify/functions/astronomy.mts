import { jsonResponse, parseLatLon, WeatherServiceError } from "./utils/http.mts";
import { fetchForecastBundle } from "./utils/weather-service.mts";

function moonPhase(refDate: string | null) {
  const known = new Date("2000-01-06T18:14:00Z").getTime();
  const synodic = 29.530588853;
  const ref = refDate ? new Date(refDate + "T12:00:00Z").getTime() : Date.now();
  const days = (ref - known) / 86400000;
  const phase = ((days % synodic) + synodic) % synodic;
  const fraction = phase / synodic;
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * fraction)) / 2 * 100);

  let name = "New Moon";
  if (fraction < 0.03 || fraction > 0.97) name = "New Moon";
  else if (fraction < 0.22) name = "Waxing Crescent";
  else if (fraction < 0.28) name = "First Quarter";
  else if (fraction < 0.47) name = "Waxing Gibbous";
  else if (fraction < 0.53) name = "Full Moon";
  else if (fraction < 0.72) name = "Waning Gibbous";
  else if (fraction < 0.78) name = "Last Quarter";
  else name = "Waning Crescent";

  return { phase_name: name, illumination_pct: illumination, age_days: Math.round(phase * 10) / 10 };
}

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

  const daily = bundle.daily || {};
  const sunrise = (daily.sunrise || [null])[0];
  const sunset = (daily.sunset || [null])[0];
  const refDate = (daily.time || [null])[0];

  let solarNoon = null;
  let daylightHours = null;
  if (sunrise && sunset) {
    const sr = new Date(sunrise).getTime();
    const ss = new Date(sunset).getTime();
    solarNoon = new Date((sr + ss) / 2).toISOString();
    daylightHours = Math.round(((ss - sr) / 3600000) * 100) / 100;
  }

  const moon = moonPhase(refDate);

  return jsonResponse({
    success: true,
    data: {
      sunrise, sunset, solar_noon: solarNoon, daylight_duration_hours: daylightHours,
      moon_phase: moon.phase_name, moon_illumination_pct: moon.illumination_pct, moon_age_days: moon.age_days,
      moonrise: null, moonset: null,
      note: "Moonrise/moonset are not available in this build. Moon phase is computed via the standard synodic-month formula.",
    },
  });
};
