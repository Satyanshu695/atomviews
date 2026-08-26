export class WeatherServiceError extends Error {}

export async function getJson(url: string, params: Record<string, string | number>, timeoutMs = 15000): Promise<any> {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(u.toString(), { signal: controller.signal });
    if (!res.ok) {
      throw new WeatherServiceError(`Weather service returned an error (${res.status})`);
    }
    return await res.json();
  } catch (e: any) {
    if (e.name === "AbortError") throw new WeatherServiceError("Weather service timed out");
    if (e instanceof WeatherServiceError) throw e;
    throw new WeatherServiceError("Weather service is currently unavailable");
  } finally {
    clearTimeout(timer);
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" },
  });
}

export function parseLatLon(url: URL): { lat: number; lon: number } | { error: [string, number] } {
  const latStr = url.searchParams.get("lat");
  const lonStr = url.searchParams.get("lon");
  const lat = Number(latStr);
  const lon = Number(lonStr);
  if (latStr === null || lonStr === null || Number.isNaN(lat) || Number.isNaN(lon)) {
    return { error: ["Query parameters 'lat' and 'lon' are required and must be numbers.", 400] };
  }
  if (lat < -90 || lat > 90) return { error: ["'lat' must be between -90 and 90.", 422] };
  if (lon < -180 || lon > 180) return { error: ["'lon' must be between -180 and 180.", 422] };
  return { lat, lon };
}
