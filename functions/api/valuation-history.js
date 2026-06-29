const VALUATION_URL = "https://datacenter-web.eastmoney.com/api/data/v1/get";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const metricFields = {
  pe: "PE_TTM",
  pb: "PB_MRQ",
  ps: "PS_TTM"
};

function json(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      ...corsHeaders,
      "Cache-Control": "public, max-age=3600",
      ...(init.headers || {})
    }
  });
}

function percentile(sortedValues, ratio) {
  if (!sortedValues.length) {
    return null;
  }
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.floor((sortedValues.length - 1) * ratio))
  );
  return sortedValues[index];
}

function rankPercentile(values, current) {
  if (!values.length || current === null) {
    return null;
  }
  const belowOrEqual = values.filter((value) => value <= current).length;
  return (belowOrEqual / values.length) * 100;
}

function stateFromPercentile(value) {
  if (value === null) {
    return "暂无分位";
  }
  if (value <= 30) {
    return "低估值";
  }
  if (value >= 70) {
    return "高估值";
  }
  return "正常区";
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Referer: "https://data.eastmoney.com/",
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
  const code = url.searchParams.get("code")?.trim();
  const metric = url.searchParams.get("metric") || "pe";
  const field = metricFields[metric];

  if (!code || !/^\d{6}$/.test(code)) {
    return json({ error: "Only A-share stock codes are supported" }, { status: 400 });
  }

  if (!field) {
    return json({ error: "Invalid metric" }, { status: 400 });
  }

  const upstream = new URL(VALUATION_URL);
  upstream.searchParams.set("reportName", "RPT_VALUEANALYSIS_DET");
  upstream.searchParams.set("columns", "ALL");
  upstream.searchParams.set("filter", `(SECURITY_CODE="${code}")`);
  upstream.searchParams.set("pageNumber", "1");
  upstream.searchParams.set("pageSize", "760");
  upstream.searchParams.set("sortColumns", "TRADE_DATE");
  upstream.searchParams.set("sortTypes", "-1");

  const response = await fetchWithTimeout(upstream);
  if (!response.ok) {
    return json({ error: "Eastmoney valuation failed" }, { status: 502 });
  }

  const payload = await response.json();
  const rows = payload?.result?.data || [];
  const series = rows
    .map((row) => ({
      date: String(row.TRADE_DATE || "").slice(0, 10),
      value: Number(row[field]),
      close: Number(row.CLOSE_PRICE)
    }))
    .filter((row) => row.date && Number.isFinite(row.value) && row.value > 0)
    .reverse();

  if (!series.length) {
    return json({ supported: false, reason: "No historical valuation data" });
  }

  const values = series.map((row) => row.value);
  const sorted = [...values].sort((a, b) => a - b);
  const current = series[series.length - 1].value;
  const rank = rankPercentile(values, current);

  return json({
    supported: true,
    metric,
    code,
    name: rows[0]?.SECURITY_NAME_ABBR || code,
    current,
    percentile: rank,
    state: stateFromPercentile(rank),
    lowLine: percentile(sorted, 0.3),
    highLine: percentile(sorted, 0.7),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    updatedAt: series[series.length - 1].date,
    series
  });
}
