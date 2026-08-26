import { getJson, WeatherServiceError } from "./http.mts";
import { cacheGetOrSet } from "./cache.mts";

const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || "300");

const CURRENT_VARS = [
  "temperature_2m", "relative_humidity_2m", "apparent_temperature",
  "precipitation", "rain", "showers", "snowfall", "weather_code",
  "pressure_msl", "surface_pressure", "cloud_cover",
  "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
  "is_day",
];
const HOURLY_VARS = [
  "temperature_2m", "apparent_temperature", "weather_code",
  "precipitation_probability", "precipitation", "rain", "snowfall",
  "relative_humidity_2m", "wind_speed_10m", "wind_direction_10m",
  "cloud_cover", "uv_index", "visibility",
];
const DAILY_VARS = [
  "weather_code", "temperature_2m_max", "temperature_2m_min",
  "apparent_temperature_max", "apparent_temperature_min",
  "precipitation_sum", "precipitation_probability_max", "snowfall_sum",
  "wind_speed_10m_max", "wind_gusts_10m_max", "uv_index_max",
  "sunrise", "sunset", "shortwave_radiation_sum",
];

export const PROVIDER_NAME = "Open-Meteo";

async function fetchProvider(lat: number, lon: number, days: number) {
  return getJson(OPEN_METEO_FORECAST_URL, {
    latitude: lat,
    longitude: lon,
    current: CURRENT_VARS.join(","),
    hourly: HOURLY_VARS.join(","),
    daily: DAILY_VARS.join(","),
    forecast_days: Math.max(1, Math.min(16, days)),
    timezone: "auto",
  }, 20000);
}

export async function fetchForecastBundle(lat: number, lon: number, days = 16) {
  const key = `forecast:${lat.toFixed(3)}:${lon.toFixed(3)}:${days}`;
  return cacheGetOrSet(key, CACHE_TTL_SECONDS, () => fetchProvider(lat, lon, days));
}

export { WeatherServiceError };
