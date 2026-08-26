export const WEATHER_CODES: Record<number, [string, string]> = {
  0: ["Clear sky", "clear"], 1: ["Mainly clear", "mostly-clear"], 2: ["Partly cloudy", "partly-cloudy"],
  3: ["Overcast", "overcast"], 45: ["Fog", "fog"], 48: ["Depositing rime fog", "fog"],
  51: ["Light drizzle", "drizzle"], 53: ["Moderate drizzle", "drizzle"], 55: ["Dense drizzle", "drizzle"],
  56: ["Light freezing drizzle", "sleet"], 57: ["Dense freezing drizzle", "sleet"],
  61: ["Slight rain", "rain"], 63: ["Moderate rain", "rain"], 65: ["Heavy rain", "rain"],
  66: ["Light freezing rain", "sleet"], 67: ["Heavy freezing rain", "sleet"],
  71: ["Slight snowfall", "snow"], 73: ["Moderate snowfall", "snow"], 75: ["Heavy snowfall", "snow"],
  77: ["Snow grains", "snow"],
  80: ["Slight rain showers", "rain"], 81: ["Moderate rain showers", "rain"], 82: ["Violent rain showers", "rain"],
  85: ["Slight snow showers", "snow"], 86: ["Heavy snow showers", "snow"],
  95: ["Thunderstorm", "thunder"], 96: ["Thunderstorm with slight hail", "thunder"], 99: ["Thunderstorm with heavy hail", "thunder"],
};

export function describeWeatherCode(code: number | null | undefined) {
  const [text, icon] = (code !== null && code !== undefined && WEATHER_CODES[code]) || ["Unknown", "unknown"];
  return { code: code ?? null, condition: text, icon };
}

function at(block: Record<string, any[]>, key: string, i: number) {
  const values = block[key];
  if (!values || i >= values.length) return null;
  return values[i];
}

export function normalizeCurrent(bundle: any, location: any) {
  const c = bundle.current || {};
  const wc = describeWeatherCode(c.weather_code);
  return {
    location,
    temperature: c.temperature_2m ?? null,
    feels_like: c.apparent_temperature ?? null,
    humidity: c.relative_humidity_2m ?? null,
    pressure: c.pressure_msl ?? null,
    surface_pressure: c.surface_pressure ?? null,
    wind_speed: c.wind_speed_10m ?? null,
    wind_direction: c.wind_direction_10m ?? null,
    wind_gusts: c.wind_gusts_10m ?? null,
    cloud_cover: c.cloud_cover ?? null,
    precipitation: c.precipitation ?? null,
    rain: c.rain ?? null,
    snowfall: c.snowfall ?? null,
    is_day: Boolean(c.is_day),
    condition: wc.condition,
    icon: wc.icon,
    weather_code: wc.code,
    observed_at: c.time ?? null,
    source: "Open-Meteo",
  };
}

export function normalizeHourly(bundle: any, hours = 72) {
  const h = bundle.hourly || {};
  const times: string[] = (h.time || []).slice(0, hours);
  return times.map((t, i) => {
    const wc = describeWeatherCode(at(h, "weather_code", i));
    return {
      time: t,
      temperature: at(h, "temperature_2m", i),
      feels_like: at(h, "apparent_temperature", i),
      precipitation_probability: at(h, "precipitation_probability", i),
      precipitation: at(h, "precipitation", i),
      rain: at(h, "rain", i),
      snowfall: at(h, "snowfall", i),
      humidity: at(h, "relative_humidity_2m", i),
      wind_speed: at(h, "wind_speed_10m", i),
      wind_direction: at(h, "wind_direction_10m", i),
      cloud_cover: at(h, "cloud_cover", i),
      uv_index: at(h, "uv_index", i),
      visibility: at(h, "visibility", i),
      condition: wc.condition,
      icon: wc.icon,
    };
  });
}

export function normalizeDaily(bundle: any, days = 16) {
  const d = bundle.daily || {};
  const dates: string[] = (d.time || []).slice(0, days);
  return dates.map((date, i) => {
    const wc = describeWeatherCode(at(d, "weather_code", i));
    return {
      date,
      temp_max: at(d, "temperature_2m_max", i),
      temp_min: at(d, "temperature_2m_min", i),
      feels_like_max: at(d, "apparent_temperature_max", i),
      feels_like_min: at(d, "apparent_temperature_min", i),
      precipitation: at(d, "precipitation_sum", i),
      precipitation_probability: at(d, "precipitation_probability_max", i),
      snowfall: at(d, "snowfall_sum", i),
      wind_speed_max: at(d, "wind_speed_10m_max", i),
      wind_gusts_max: at(d, "wind_gusts_10m_max", i),
      uv_index_max: at(d, "uv_index_max", i),
      sunrise: at(d, "sunrise", i),
      sunset: at(d, "sunset", i),
      solar_radiation: at(d, "shortwave_radiation_sum", i),
      condition: wc.condition,
      icon: wc.icon,
    };
  });
}

export function atValue(block: Record<string, any[]>, key: string, i: number) {
  return at(block, key, i);
}
