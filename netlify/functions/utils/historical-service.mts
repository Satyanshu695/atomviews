import { getJson, WeatherServiceError } from "./http.mts";
import { atValue } from "./normalize.mts";

const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const DAILY_VARS = [
  "temperature_2m_max", "temperature_2m_min", "temperature_2m_mean",
  "precipitation_sum", "relative_humidity_2m_mean", "wind_speed_10m_max",
  "surface_pressure_mean", "cloud_cover_mean", "sunshine_duration", "weather_code",
];

export async function getHistoricalRange(lat: number, lon: number, startDate: string, endDate: string) {
  const data = await getJson(ARCHIVE_URL, {
    latitude: lat, longitude: lon, start_date: startDate, end_date: endDate,
    daily: DAILY_VARS.join(","), timezone: "auto",
  }, 30000);

  const daily = data.daily || {};
  const dates: string[] = daily.time || [];
  return dates.map((date, i) => ({
    date,
    temp_max: atValue(daily, "temperature_2m_max", i),
    temp_min: atValue(daily, "temperature_2m_min", i),
    temp_mean: atValue(daily, "temperature_2m_mean", i),
    precipitation: atValue(daily, "precipitation_sum", i),
    humidity_mean: atValue(daily, "relative_humidity_2m_mean", i),
    wind_speed_max: atValue(daily, "wind_speed_10m_max", i),
    pressure_mean: atValue(daily, "surface_pressure_mean", i),
    cloud_cover_mean: atValue(daily, "cloud_cover_mean", i),
    sunshine_seconds: atValue(daily, "sunshine_duration", i),
    weather_code: atValue(daily, "weather_code", i),
  }));
}

export { WeatherServiceError };
