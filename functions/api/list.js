const LIST_ENDPOINTS = [
  "https://push2delay.eastmoney.com/api/qt/clist/get",
  "https://push2his.eastmoney.com/api/qt/clist/get"
];

const CATEGORY_CONFIG = {
  stock: {
    label: "股票",
    fs: "m:1+t:2,m:0+t:6,m:0+t:80,m:1+t:23,m:0+t:81,m:1+t:3"
  },
  index: {
    label: "指数",
    fs: "m:1+s:2,m:0+t:5,m:0+t:13,m:1+t:5"
  },
  sector: {
    label: "行业",
    fs: "m:90+t:2"
  }
};

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
      "Cache-Control": "public, max-age=60",
      ...(init.headers || {})
    }
  });
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

function normalize(row, categoryLabel) {
  return {
    code: row.f12,
    name: row.f14,
    quoteId: `${row.f13}.${row.f12}`,
    market: categoryLabel,
    type: categoryLabel === "股票" ? "AStock" : categoryLabel === "指数" ? "Index" : "BK",
    price: row.f2,
    changePercent: row.f3,
    turnover: row.f6
  };
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const category = url.searchParams.get("category") || "stock";
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const size = Math.min(80, Math.max(10, Number(url.searchParams.get("size") || "30")));
  const config = CATEGORY_CONFIG[category];

  if (!config) {
    return json({ error: "Invalid category" }, { status: 400 });
  }

  let lastError = null;

  for (const endpoint of LIST_ENDPOINTS) {
    const upstream = new URL(endpoint);
    upstream.searchParams.set("pn", String(page));
    upstream.searchParams.set("pz", String(size));
    upstream.searchParams.set("po", "1");
    upstream.searchParams.set("np", "1");
    upstream.searchParams.set("ut", "bd1d9ddb04089700cf9c27f6f7426281");
    upstream.searchParams.set("fltt", "2");
    upstream.searchParams.set("invt", "2");
    upstream.searchParams.set("fs", config.fs);
    upstream.searchParams.set("fields", "f12,f13,f14,f2,f3,f4,f5,f6");

    try {
      const response = await fetchWithTimeout(upstream);
      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }

      const payload = await response.json();
      const rows = payload?.data?.diff || [];
      return json({
        items: rows
          .filter((row) => row?.f12 && row?.f13 !== undefined && row?.f14 && row?.f2 !== "-")
          .map((row) => normalize(row, config.label)),
        total: payload?.data?.total || rows.length
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown error";
    }
  }

  return json({ error: "Eastmoney list failed", detail: lastError }, { status: 502 });
}
