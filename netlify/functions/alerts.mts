import { jsonResponse, parseLatLon } from "./utils/http.mts";

const NWS_ALERTS_URL = "https://api.weather.gov/alerts/active";

const SEVERITY_MAP: Record<string, string> = {
  Extreme: "Emergency", Severe: "Warning", Moderate: "Watch", Minor: "Advisory", Unknown: "Information",
};

async function fetchNwsAlerts(lat: number, lon: number) {
  // Rough US bounding box -- avoids calling a US-only API for obviously non-US coordinates.
  if (!(lat >= 18 && lat <= 72 && lon >= -180 && lon <= -65)) return null;
  try {
    const u = new URL(NWS_ALERTS_URL);
    u.searchParams.set("point", `${lat},${lon}`);
    const res = await fetch(u.toString(), { headers: { "User-Agent": "AtmosWeatherPlatform/1.0" } });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.features || []).map((feature: any) => {
      const props = feature.properties || {};
      return {
        title: props.event || "Weather Alert",
        severity: SEVERITY_MAP[props.severity] || "Information",
        area: props.areaDesc || "",
        start_time: props.onset,
        end_time: props.ends || props.expires,
        description: (props.description || "").slice(0, 600),
        instructions: props.instruction || "",
        issuing_authority: "US National Weather Service",
        alert_type: props.event || "",
      };
    });
  } catch {
    return null; // fail open to "no alerts available" rather than erroring the whole page
  }
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const parsed = parseLatLon(url);
  if ("error" in parsed) return jsonResponse({ success: false, message: parsed.error[0] }, parsed.error[1]);
  const { lat, lon } = parsed;

  const alerts = await fetchNwsAlerts(lat, lon);

  if (alerts === null) {
    return jsonResponse({
      success: true,
      data: {
        available: false,
        alerts: [],
        message: "No official alerts provider is available for this location yet.",
      },
    });
  }

  return jsonResponse({
    success: true,
    data: { available: true, alerts, source: "US National Weather Service" },
  });
};
