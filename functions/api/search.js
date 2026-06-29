const EASTMONEY_SEARCH_URL = "https://searchapi.eastmoney.com/api/suggest/get";

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

function normalizeSecurity(row) {
  return {
    code: row.Code,
    name: row.Name,
    quoteId: row.QuoteID,
    market: row.SecurityTypeName || row.Classify || "",
    type: row.Classify || row.SecurityTypeName || "",
    pinyin: row.PinYin || ""
  };
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const keyword = url.searchParams.get("q")?.trim();

  if (!keyword) {
    return json({ items: [] });
  }

  const upstream = new URL(EASTMONEY_SEARCH_URL);
  upstream.searchParams.set("input", keyword);
  upstream.searchParams.set("type", "14");
  upstream.searchParams.set("count", "12");

  const response = await fetchWithTimeout(upstream);

  if (!response.ok) {
    return json(
      { error: "Eastmoney search failed", status: response.status },
      { status: 502 }
    );
  }

  const payload = await response.json();
  const rows = payload?.QuotationCodeTable?.Data || [];

  return json({
    items: rows
      .filter((row) => row?.QuoteID && row?.Code && row?.Name)
      .map(normalizeSecurity)
  });
}
