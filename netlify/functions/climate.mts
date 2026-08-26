import { jsonResponse, parseLatLon, WeatherServiceError } from "./utils/http.mts";
import { getHistoricalRange } from "./utils/historical-service.mts";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

export default async (req: Request) => {
  const url = new URL(req.url);
  const parsed = parseLatLon(url);
  if ("error" in parsed) return jsonResponse({ success: false, message: parsed.error[0] }, parsed.error[1]);
  const { lat, lon } = parsed;
  const years = Math.min(Math.max(Number(url.searchParams.get("years") || 10), 1), 20);

  const today = new Date();
  const endMonthFirst = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const startYear = endMonthFirst.getUTCFullYear() - years;
  const start = new Date(Date.UTC(startYear, 0, 1));
  const endFull = endMonthFirst.getUTCMonth() === 0
    ? new Date(Date.UTC(endMonthFirst.getUTCFullYear() - 1, 11, 31))
    : new Date(Date.UTC(endMonthFirst.getUTCFullYear(), endMonthFirst.getUTCMonth() - 1, 28));

  let rows: any[];
  try {
    rows = await getHistoricalRange(lat, lon, start.toISOString().slice(0, 10), endFull.toISOString().slice(0, 10));
  } catch (e) {
    if (e instanceof WeatherServiceError) return jsonResponse({ success: false, message: e.message }, 503);
    throw e;
  }

  const buckets = new Map<number, any[]>();
  for (const r of rows) {
    if (r.temp_max === null) continue;
    const month = Number(r.date.split("-")[1]);
    if (!buckets.has(month)) buckets.set(month, []);
    buckets.get(month)!.push(r);
  }

  const months = [];
  for (let m = 1; m <= 12; m++) {
    const recs = buckets.get(m) || [];
    if (!recs.length) {
      months.push({ month: MONTH_NAMES[m - 1], no_data: true });
      continue;
    }
    const n = recs.length;
    const avgHigh = recs.reduce((s, r) => s + r.temp_max, 0) / n;
    const avgLow = recs.reduce((s, r) => s + r.temp_min, 0) / n;
    const avgTemp = recs.reduce((s, r) => s + (r.temp_mean ?? (r.temp_max + r.temp_min) / 2), 0) / n;
    const totalRain = recs.reduce((s, r) => s + (r.precipitation || 0), 0);
    const rainyDays = recs.filter((r) => (r.precipitation || 0) >= 1.0).length;
    const humidityRecs = recs.filter((r) => r.humidity_mean !== null);
    const avgHumidity = humidityRecs.reduce((s, r) => s + (r.humidity_mean || 0), 0) / Math.max(1, humidityRecs.length);
    const windRecs = recs.filter((r) => r.wind_speed_max !== null);
    const avgWind = windRecs.reduce((s, r) => s + (r.wind_speed_max || 0), 0) / Math.max(1, windRecs.length);
    const sunshineHours = recs.reduce((s, r) => s + (r.sunshine_seconds || 0), 0) / n / 3600;
    const distinctYears = new Set(recs.map((r) => r.date.slice(0, 4))).size;

    months.push({
      month: MONTH_NAMES[m - 1],
      avg_high: Math.round(avgHigh * 10) / 10,
      avg_low: Math.round(avgLow * 10) / 10,
      avg_temp: Math.round(avgTemp * 10) / 10,
      avg_rainfall_mm: Math.round((totalRain / Math.max(1, distinctYears)) * 10) / 10,
      avg_rainy_days: Math.round((rainyDays / Math.max(1, distinctYears)) * 10) / 10,
      avg_humidity_pct: Math.round(avgHumidity * 10) / 10,
      avg_wind_kmh: Math.round(avgWind * 10) / 10,
      avg_sunshine_hours_per_day: Math.round(sunshineHours * 10) / 10,
      years_of_data: distinctYears,
    });
  }

  return jsonResponse({
    success: true,
    data: {
      months,
      period: `${start.getUTCFullYear()}-${endFull.getUTCFullYear()}`,
      note: `Computed as a simple average across ${endFull.getUTCFullYear() - start.getUTCFullYear() + 1} years of historical daily data (${start.getUTCFullYear()}-${endFull.getUTCFullYear()}). This is NOT an official 30-year WMO climate normal.`,
      source: "Computed from Open-Meteo Historical Weather API",
    },
  });
};
