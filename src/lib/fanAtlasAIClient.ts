import type { FanAtlasAIRequest, FanAtlasAIResponse } from "./fanAtlasAIContracts";

export type SendFanAtlasAIOptions = {
  accessToken: string;
  signal?: AbortSignal;
};

export async function sendFanAtlasAIRequest(
  request: FanAtlasAIRequest,
  options: SendFanAtlasAIOptions
): Promise<FanAtlasAIResponse> {
  const response = await fetch("/api/fanatlas-ai", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request),
    signal: options.signal
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorCode = typeof data?.errorCode === "string" ? data.errorCode : "";
    const message = errorCode ? `fanAtlasAI.error.${errorCode}` : "fanAtlasAI.error.failed";
    throw Object.assign(new Error(message), { code: data?.errorCode, status: response.status });
  }
  return data as FanAtlasAIResponse;
}
