// Server-only. Never import this file from src/ or expose its environment variables to Vite.
export const sites = [
  [12.9177099, 77.6237863],
  [12.9565787, 77.7058866],
  [13.0428177, 77.5904027],
  [13.0004, 77.677299],
  [12.8452145, 77.6601695],
  [12.974724, 77.609468],
];
const headers = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
};
const answer = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers });
export function normalize(flow) {
  const keys = [
    "currentSpeed",
    "freeFlowSpeed",
    "currentTravelTime",
    "freeFlowTravelTime",
    "confidence",
  ];
  if (
    !flow ||
    keys.some(
      (k) =>
        typeof flow[k] !== "number" || !Number.isFinite(flow[k]) || flow[k] < 0,
    ) ||
    flow.confidence > 1 ||
    typeof flow.roadClosure !== "boolean"
  )
    throw new Error("Invalid provider data");
  return Object.fromEntries([...keys, "roadClosure"].map((k) => [k, flow[k]]));
}
export async function handle(
  req,
  {
    key = process.env.TOMTOM_API_KEY,
    access = process.env.LIVE_ACCESS_TOKEN,
    fetcher = fetch,
  } = {},
) {
  if (req.method !== "POST") return answer({ error: "Use POST." }, 405);
  // Optional operator-set password. A public endpoint is otherwise accessible to visitors.
  if (access && req.headers.get("Authorization") !== `Bearer ${access}`)
    return answer(
      { error: "Live access password required or incorrect." },
      401,
    );
  if (!key)
    return answer(
      {
        error:
          "Live traffic is not configured. Add TOMTOM_API_KEY in Netlify and redeploy. The synthetic simulator remains available.",
      },
      503,
    );
  let body;
  try {
    if (Number(req.headers.get("content-length") || 0) > 256) throw Error();
    body = await req.json();
  } catch {
    return answer({ error: "Invalid request." }, 400);
  }
  const index = body?.junction;
  if (!Number.isInteger(index) || index < 0 || index >= sites.length)
    return answer({ error: "Choose one of the six supported locations." }, 400);
  const endpoint = new URL(
    "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/14/json",
  );
  endpoint.searchParams.set("key", key);
  endpoint.searchParams.set("point", sites[index].join(","));
  endpoint.searchParams.set("unit", "kmph");
  try {
    const upstream = await fetcher(endpoint, {
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok)
      return answer(
        {
          error:
            upstream.status === 429
              ? "Provider quota/rate limit reached. Try later."
              : upstream.status === 401 || upstream.status === 403
                ? "Provider rejected the key or its product entitlement. Check the server-side key."
                : "Provider could not return this road segment.",
        },
        upstream.status === 429 ? 429 : 502,
      );
    const value = normalize((await upstream.json()).flowSegmentData);
    return answer({
      provider: "TomTom",
      retrievedAt: new Date().toISOString(),
      junction: index,
      point: sites[index],
      ...value,
    });
  } catch {
    return answer(
      {
        error:
          "Live traffic timed out or returned invalid data. No synthetic data is substituted as live.",
      },
      502,
    );
  }
}
export default async (req) => handle(req);
export const config = {
  path: "/api/traffic",
  rateLimit: { windowLimit: 6, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
