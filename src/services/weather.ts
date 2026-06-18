export type FanAtlasWeather = {
  temperature: number | null;
  rainProbability: number | null;
  windSpeed: number | null;
  recommendation: string;
  updatedAt: string;
};

function recommendationFor(
  temperature: number | null,
  rainProbability: number | null,
  windSpeed: number | null
) {
  if (rainProbability !== null && rainProbability >= 55) return "Bring a rain jacket.";
  if (temperature !== null && temperature >= 30) return "High heat expected. Hydrate early and wear sunscreen.";
  if (windSpeed !== null && windSpeed >= 35) return "Windy conditions. Secure hats, scarves, and loose items.";
  if (temperature !== null && temperature <= 10) return "Cool weather expected. Bring a warm layer.";
  return "Weather looks manageable. Check again before leaving.";
}

export function emptyWeather(): FanAtlasWeather {
  return {
    temperature: null,
    rainProbability: null,
    windSpeed: null,
    recommendation: "Weather unavailable. Check again before leaving.",
    updatedAt: ""
  };
}

export function formatWeatherValue(value: number | null, suffix: string) {
  return value === null ? "--" : `${Math.round(value)}${suffix}`;
}

export async function getWeather(latitude: number, longitude: number): Promise<FanAtlasWeather> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,wind_speed_10m",
    daily: "precipitation_probability_max,wind_speed_10m_max",
    forecast_days: "1",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    timezone: "auto"
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Weather API returned ${response.status}`);
  }

  const data = await response.json();
  const temperature = Number(data?.current?.temperature_2m);
  const currentWind = Number(data?.current?.wind_speed_10m);
  const dailyWind = Number(data?.daily?.wind_speed_10m_max?.[0]);
  const rain = Number(data?.daily?.precipitation_probability_max?.[0]);
  const windSpeed = Number.isFinite(currentWind) ? currentWind : dailyWind;

  const safeTemperature = Number.isFinite(temperature) ? temperature : null;
  const safeRain = Number.isFinite(rain) ? rain : null;
  const safeWind = Number.isFinite(windSpeed) ? windSpeed : null;

  return {
    temperature: safeTemperature,
    rainProbability: safeRain,
    windSpeed: safeWind,
    recommendation: recommendationFor(safeTemperature, safeRain, safeWind),
    updatedAt: data?.current?.time || new Date().toISOString()
  };
}
