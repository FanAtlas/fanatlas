export default async function handler(_req: any, res: any) {
  return res.status(410).json({
    error: "This legacy AI endpoint has been retired. Use the authenticated FanAtlas AI endpoint.",
    errorCode: "legacy_ai_endpoint_retired"
  });
}
