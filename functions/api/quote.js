const QUOTE_FIELDS = [
  "f43",
  "f44",
  "f45",
  "f46",
  "f47",
  "f48",
  "f57",
  "f58",
  "f60",
  "f84",
  "f85",
  "f86",
  "f107",
  "f111",
  "f113",
  "f114",
  "f115",
  "f116",
  "f117",
  "f152",
  "f162",
  "f167",
  "f168",
  "f169",
  "f170",
  "f171"
].join(",");

const QUOTE_ENDPOINTS = [
  "https://push2delay.eastmoney.com/api/qt/stock/get",
  "https://push2his.eastmoney.com/api/qt/stock/get",
  "https://push2.eastmoney.com/api/qt/stock/get"
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      ...corsHeaders,
      "Cache-Control": "public, max-age=8",
      ...(init.headers || {})
    }
  });
}

function asNumber(value) {
  if (value === "-" || value === undefined || value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeQuote(data) {
  const price = asNumber(data.f43);
  const previousClose = asNumber(data.f60);
  const change = asNumber(data.f169);
  const changePercent = asNumber(data.f170);
  const marketCap = asNumber(data.f116);
  const floatingMarketCap = asNumber(data.f117);

  return {
    code: data.f57,
    name: data.f58,
    secid: `${data.f107}.${data.f57}`,
    price,
    open: asNumber(data.f46),
    high: asNumber(data.f44),
    low: asNumber(data.f45),
    previousClose,
    change,
    changePercent,
    amplitude: asNumber(data.f171),
    volume: asNumber(data.f47),
    turnover: asNumber(data.f48),
    marketCap,
    floatingMarketCap,
    pe: asNumber(data.f162),
    pb: asNumber(data.f167),
    ps: asNumber(data.f168),
    totalShares: asNumber(data.f84),
    floatingShares: asNumber(data.f85),
    timestamp: asNumber(data.f86),
    source: "eastmoney"
  };
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Referer: "https://quote.eastmoney.com/",
        "User-Agent":
          "Mozilla/5.0 (compatible; seachat-valuation/1.0; +https://pages.dev)",
        ...(init.headers || {})
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const secid = url.searchParams.get("secid")?.trim();

  if (!secid || !/^\d{1,3}\.[A-Za-z0-9]+$/.test(secid)) {
    return json({ error: "Missing or invalid secid" }, { status: 400 });
  }

  let lastError = null;

  for (const endpoint of QUOTE_ENDPOINTS) {
    const upstream = new URL(endpoint);
    upstream.searchParams.set("invt", "2");
    upstream.searchParams.set("fltt", "2");
    upstream.searchParams.set("secid", secid);
    upstream.searchParams.set("fields", QUOTE_FIELDS);

    try {
      const response = await fetchWithTimeout(upstream);

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }

      const payload = await response.json();
      if (payload?.data?.f57) {
        return json({ quote: normalizeQuote(payload.data) });
      }

      lastError = "Empty quote payload";
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown error";
    }
  }

  return json(
    { error: "Eastmoney quote failed", detail: lastError },
    { status: 502 }
  );
}
