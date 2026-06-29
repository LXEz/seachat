import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as echarts from "echarts/core";
import { GridComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { LineChart as ELineChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import {
  BarChart3,
  BookOpen,
  Calculator,
  Gauge,
  LineChart,
  Percent,
  RefreshCw,
  Search,
  Scale,
  TrendingUp
} from "lucide-react";
import "./styles.css";

echarts.use([GridComponent, TooltipComponent, VisualMapComponent, ELineChart, CanvasRenderer]);

const initialInputs = {
  ticker: "600519",
  company: "贵州茅台",
  price: 1194.96,
  shares: 1250.08,
  netCash: 0,
  revenue: 174100,
  freeCashFlow: 84000,
  fcfMargin: 48.2,
  growthYears: 8,
  growthRate: 7,
  discountRate: 9,
  terminalGrowth: 2.5,
  targetPe: 24,
  eps: 87.15,
  targetEvFcf: 22,
  marginOfSafety: 25
};

const scenarios = [
  { name: "保守", growthDelta: -2, discountDelta: 1.5, terminalDelta: -0.5 },
  { name: "基准", growthDelta: 0, discountDelta: 0, terminalDelta: 0 },
  { name: "乐观", growthDelta: 2, discountDelta: -1, terminalDelta: 0.4 }
];

const securityFilters = [
  { id: "all", label: "全部" },
  { id: "stock", label: "股票" },
  { id: "index", label: "指数" },
  { id: "sector", label: "行业" }
];

const valuationMetrics = [
  { id: "pe", label: "PE市盈率", quoteKey: "pe" },
  { id: "pb", label: "PB市净率", quoteKey: "pb" },
  { id: "ps", label: "PS市销率", quoteKey: "ps" }
];

const academySections = [
  {
    title: "DCF 估值",
    points: [
      "DCF 的核心是把未来自由现金流折现到今天。增长率、折现率、永续增长率三个假设决定大部分结果。",
      "折现率不是装饰变量。风险越高，折现率越高，今天愿意支付的价格越低。",
      "永续增长率不能长期高于经济名义增速。这里做了保护：永续增长率必须低于折现率。"
    ]
  },
  {
    title: "相对估值",
    points: [
      "PE 适合盈利稳定的公司，PB 常用于银行、保险和周期资产，PS 常用于利润暂时失真的成长公司。",
      "同一行业内部比较才有意义。拿银行 PB 和半导体 PE 混比，结论通常没有可操作性。",
      "倍数估值是市场价格锚，不是内在价值本身。它适合做交叉验证。"
    ]
  },
  {
    title: "安全边际",
    points: [
      "安全边际不是悲观，是承认模型会错。输入假设越不确定，需要的折扣越大。",
      "高质量公司可以给更低折扣，周期股、强监管行业、技术替代风险高的公司需要更高折扣。",
      "买入价低于估值不等于一定赚钱，关键还要看基本面是否持续兑现。"
    ]
  },
  {
    title: "行情数据",
    points: [
      "本工具的行情来自东方财富接口，适合辅助分析，不作为交易系统的报价源。",
      "指数和行业更适合观察市场温度；个股估值仍需要财报数据、现金流和竞争格局判断。",
      "实时价格会自动进入模型，但收入、现金流、EPS 等财务假设需要你手动校准。"
    ]
  }
];

const yuan = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 2
});

const compactYuan = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  notation: "compact",
  maximumFractionDigits: 2
});

const number = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 2
});

function pct(value) {
  return value / 100;
}

function clampTerminalGrowth(discountRate, terminalGrowth) {
  return Math.min(terminalGrowth, discountRate - 0.5);
}

function calculateDcf(inputs, scenario = scenarios[1]) {
  const growthRate = pct(inputs.growthRate + scenario.growthDelta);
  const discountRate = pct(inputs.discountRate + scenario.discountDelta);
  const terminalGrowth = pct(
    clampTerminalGrowth(
      inputs.discountRate + scenario.discountDelta,
      inputs.terminalGrowth + scenario.terminalDelta
    )
  );
  const years = Math.max(1, Math.round(inputs.growthYears));
  let presentValue = 0;
  const yearlyCashFlows = [];

  for (let year = 1; year <= years; year += 1) {
    const cashFlow = inputs.freeCashFlow * (1 + growthRate) ** year;
    const discounted = cashFlow / (1 + discountRate) ** year;
    presentValue += discounted;
    yearlyCashFlows.push({ year, cashFlow, discounted });
  }

  const finalCashFlow = yearlyCashFlows[yearlyCashFlows.length - 1].cashFlow;
  const terminalValue =
    (finalCashFlow * (1 + terminalGrowth)) / (discountRate - terminalGrowth);
  const discountedTerminal = terminalValue / (1 + discountRate) ** years;
  const enterpriseValue = presentValue + discountedTerminal;
  const equityValue = enterpriseValue + inputs.netCash;
  const intrinsicValue = equityValue / inputs.shares;
  const upside = (intrinsicValue / inputs.price - 1) * 100;

  return {
    growthRate,
    discountRate,
    terminalGrowth,
    presentValue,
    discountedTerminal,
    enterpriseValue,
    equityValue,
    intrinsicValue,
    upside,
    yearlyCashFlows
  };
}

function calculateMultiples(inputs) {
  const peValue = inputs.eps * inputs.targetPe;
  const evFcfValue =
    (inputs.freeCashFlow * inputs.targetEvFcf + inputs.netCash) / inputs.shares;
  const blendedValue = (peValue + evFcfValue) / 2;

  return {
    peValue,
    evFcfValue,
    blendedValue,
    blendedUpside: (blendedValue / inputs.price - 1) * 100,
    buyBelow: blendedValue * (1 - pct(inputs.marginOfSafety))
  };
}

function calculateValuationBands(inputs, dcf, multiples) {
  const fairValue = (dcf.intrinsicValue * 0.55) + (multiples.blendedValue * 0.45);
  const lowValue = fairValue * (1 - pct(inputs.marginOfSafety));
  const highValue = fairValue * 1.18;
  let state = "合理区间";

  if (inputs.price <= lowValue) {
    state = "低估区";
  } else if (inputs.price >= highValue) {
    state = "高估区";
  }

  return {
    lowValue,
    fairValue,
    highValue,
    state,
    position: Math.max(
      0,
      Math.min(100, ((inputs.price - lowValue) / (highValue - lowValue)) * 100)
    )
  };
}

function inputValue(value) {
  return Number.isFinite(value) ? value : 0;
}

function formatRatio(value, suffix = "x") {
  return Number.isFinite(value) && value !== null ? `${number.format(value)}${suffix}` : "-";
}

function formatPercent(value) {
  return Number.isFinite(value) && value !== null ? `${number.format(value)}%` : "-";
}

function Field({ label, name, value, suffix, onChange, step = "1" }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="fieldControl">
        <input
          type="number"
          name={name}
          value={value}
          step={step}
          onChange={onChange}
        />
        {suffix && <strong>{suffix}</strong>}
      </div>
    </label>
  );
}

function Metric({ icon, label, value, tone }) {
  const MetricIcon = icon;

  return (
    <section className={`metric ${tone || ""}`}>
      <div>
        <MetricIcon size={18} />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
    </section>
  );
}

function getSecurityCategory(item) {
  if (item.type === "Index" || item.market === "指数") {
    return "index";
  }
  if (item.type === "BK" || item.market === "板块" || item.market === "行业") {
    return "sector";
  }
  return "stock";
}

function AssetPicker({ open, selected, onClose, onSelect }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();
    const keyword = query.trim();
    setStatus("loading");

    const endpoint =
      keyword.length >= 2
        ? `/api/search?q=${encodeURIComponent(keyword)}`
        : `/api/list?category=${filter === "all" ? "stock" : filter}&size=50`;

    fetch(endpoint, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error("list failed");
        }
        return response.json();
      })
      .then((payload) => {
        const nextItems = payload.items || [];
        setItems(
          nextItems.filter(
            (item) => filter === "all" || getSecurityCategory(item) === filter
          )
        );
        setStatus("ready");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [open, filter, query]);

  if (!open) {
    return null;
  }

  return (
    <div className="pickerOverlay" role="presentation" onClick={onClose}>
      <section className="assetRail pickerSheet" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
      <div className="pickerHandle" />
      <div className="pickerTitle">
        <div>
          <span>选择标的</span>
          <strong>{selected.name}</strong>
        </div>
        <button type="button" onClick={onClose}>关闭</button>
      </div>
      <div className="assetSearch">
        <Search size={18} />
        <input
          value={query}
          placeholder="筛选标的名称或代码"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="assetFilters">
        {securityFilters.map((item) => (
          <button
            key={item.id}
            className={filter === item.id ? "active" : ""}
            type="button"
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="assetList">
        {status === "loading" && <p className="listStatus">加载真实行情列表</p>}
        {status === "error" && <p className="listStatus">列表加载失败</p>}
        {items.map((item) => (
          <button
            key={item.quoteId}
            type="button"
            onClick={() => {
              onSelect(item);
              onClose();
            }}
          >
            <span>
              <strong>{item.name}</strong>
              <small>{item.code}</small>
            </span>
            <b>{item.market}</b>
          </button>
        ))}
        {status === "ready" && items.length === 0 && <p className="listStatus">没有匹配结果</p>}
      </div>
      </section>
    </div>
  );
}

function Academy() {
  return (
    <section className="academyGrid">
      <div className="academyIntro">
        <BookOpen size={22} />
        <div>
          <p>Valuation Academy</p>
          <h2>估值学堂</h2>
        </div>
      </div>
      {academySections.map((section) => (
        <article key={section.title} className="academyCard">
          <h3>{section.title}</h3>
          {section.points.map((point) => (
            <p key={point}>{point}</p>
          ))}
        </article>
      ))}
    </section>
  );
}

function ValuationBand({ bands, price }) {
  return (
    <section className="panel bandPanel">
      <div className="panelHeader">
        <h2>估值区间</h2>
        <Gauge size={18} />
      </div>
      <div className="bandStatus">
        <span>当前判断</span>
        <strong>{bands.state}</strong>
      </div>
      <div className="bandTrack">
        <div className="bandSegment undervalued">低估</div>
        <div className="bandSegment fair">合理</div>
        <div className="bandSegment overvalued">高估</div>
        <i style={{ left: `${bands.position}%` }} />
      </div>
      <div className="bandValues">
        <span>低估线 {yuan.format(bands.lowValue)}</span>
        <span>中枢 {yuan.format(bands.fairValue)}</span>
        <span>高估线 {yuan.format(bands.highValue)}</span>
      </div>
      <p>
        当前价格 {yuan.format(price)}。区间由 DCF 内在价值和倍数估值混合得到，
        再按安全边际切出低估线。
      </p>
    </section>
  );
}

function MarketValuationChart({ selectedSecurity, quote }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [metric, setMetric] = useState("pe");
  const [history, setHistory] = useState(null);
  const [status, setStatus] = useState("idle");

  const currentMetric = valuationMetrics.find((item) => item.id === metric);
  const isStock = selectedSecurity.type === "AStock" && /^\d{6}$/.test(selectedSecurity.code);

  useEffect(() => {
    if (!isStock) {
      setHistory(null);
      setStatus("unsupported");
      return;
    }

    const controller = new AbortController();
    setStatus("loading");

    fetch(
      `/api/valuation-history?code=${encodeURIComponent(selectedSecurity.code)}&metric=${metric}`,
      { signal: controller.signal }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("valuation history failed");
        }
        return response.json();
      })
      .then((payload) => {
        setHistory(payload);
        setStatus(payload.supported ? "ready" : "unsupported");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [isStock, metric, selectedSecurity.code]);

  useEffect(() => {
    if (!chartRef.current || status !== "ready" || !history?.series?.length) {
      return undefined;
    }

    chartInstance.current = chartInstance.current || echarts.init(chartRef.current);
    const dates = history.series.map((item) => item.date);
    const values = history.series.map((item) => item.value);

    chartInstance.current.setOption({
      grid: { left: 38, right: 16, top: 18, bottom: 34 },
      tooltip: {
        trigger: "axis",
        borderWidth: 0,
        backgroundColor: "rgba(15, 23, 42, 0.92)",
        textStyle: { color: "#fff" },
        valueFormatter: (value) => Number(value).toFixed(2)
      },
      xAxis: {
        type: "category",
        data: dates,
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#94a3b8", hideOverlap: true }
      },
      yAxis: {
        type: "value",
        min: Math.max(0, Math.floor(history.min * 0.9)),
        max: Math.ceil(history.max * 1.08),
        splitLine: { lineStyle: { color: "#e2e8f0" } },
        axisLabel: { color: "#94a3b8" }
      },
      visualMap: {
        show: false,
        dimension: 1,
        pieces: [
          { lte: history.lowLine, color: "#16a34a" },
          { gt: history.lowLine, lte: history.highLine, color: "#f59e0b" },
          { gt: history.highLine, color: "#ef4444" }
        ]
      },
      series: [
        {
          type: "line",
          data: values,
          smooth: true,
          symbol: "none",
          lineStyle: { width: 3 },
          areaStyle: { opacity: 0.08 },
          markArea: {
            silent: true,
            itemStyle: { opacity: 0.14 },
            data: [
              [
                { yAxis: history.min, itemStyle: { color: "#22c55e" } },
                { yAxis: history.lowLine }
              ],
              [
                { yAxis: history.lowLine, itemStyle: { color: "#facc15" } },
                { yAxis: history.highLine }
              ],
              [
                { yAxis: history.highLine, itemStyle: { color: "#ef4444" } },
                { yAxis: history.max }
              ]
            ]
          }
        }
      ]
    });

    const resize = () => chartInstance.current?.resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [history, status]);

  const currentValue = history?.current ?? quote?.[currentMetric?.quoteKey];

  return (
    <section className="panel marketValuation">
      <div className="panelHeader">
        <div>
          <h2>市场估值</h2>
          <span>历史分位来自东方财富历史估值数据</span>
        </div>
        <LineChart size={18} />
      </div>
      <div className="valuationTabs">
        {valuationMetrics.map((item) => (
          <button
            key={item.id}
            className={metric === item.id ? "active" : ""}
            type="button"
            onClick={() => setMetric(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="valuationSummary">
        <span>当前估值：{status === "ready" ? history.state : "暂无分位"}</span>
        <strong>{currentMetric?.label.slice(0, 2)}：{formatRatio(currentValue, "")}</strong>
        <b>百分位：{status === "ready" ? `${number.format(history.percentile)}%` : "-"}</b>
      </div>

      {status === "ready" && <div ref={chartRef} className="valuationChart" />}
      {status === "loading" && <p className="chartState">正在加载历史估值</p>}
      {status === "unsupported" && (
        <p className="chartState">当前标的暂无可验证的历史估值分位，仅展示实时 PE/PB/PS。</p>
      )}
      {status === "error" && <p className="chartState">历史估值加载失败。</p>}
    </section>
  );
}

function AppNav({ activePage, onChange }) {
  const items = [
    { id: "analysis", label: "估值", icon: Calculator },
    { id: "academy", label: "学堂", icon: BookOpen }
  ];

  return (
    <nav className="appNav">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={activePage === item.id ? "active" : ""}
            type="button"
            onClick={() => onChange(item.id)}
          >
            <Icon size={19} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function App() {
  const [activePage, setActivePage] = useState("analysis");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [inputs, setInputs] = useState(initialInputs);
  const [selectedSecurity, setSelectedSecurity] = useState({
    code: "600519",
    name: "贵州茅台",
    quoteId: "1.600519",
    type: "AStock",
    market: "沪A"
  });
  const [quote, setQuote] = useState(null);
  const [quoteStatus, setQuoteStatus] = useState("idle");
  const [quoteError, setQuoteError] = useState("");

  const dcf = useMemo(() => calculateDcf(inputs), [inputs]);
  const multiples = useMemo(() => calculateMultiples(inputs), [inputs]);
  const valuationBands = useMemo(
    () => calculateValuationBands(inputs, dcf, multiples),
    [inputs, dcf, multiples]
  );
  const scenarioResults = useMemo(
    () =>
      scenarios.map((scenario) => ({
        ...scenario,
        result: calculateDcf(inputs, scenario)
      })),
    [inputs]
  );

  const loadQuote = async (security = selectedSecurity) => {
    if (!security?.quoteId) {
      return;
    }

    setQuoteStatus("loading");
    setQuoteError("");

    try {
      const response = await fetch(
        `/api/quote?secid=${encodeURIComponent(security.quoteId)}`
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      const nextQuote = payload.quote;

      setQuote(nextQuote);
      setQuoteStatus("ready");
      setInputs((current) => ({
        ...current,
        ticker: nextQuote.code || security.code,
        company: nextQuote.name || security.name,
        price: inputValue(nextQuote.price ?? current.price),
        shares: nextQuote.totalShares
          ? Number((nextQuote.totalShares / 1000000).toFixed(2))
          : current.shares,
        targetPe: nextQuote.pe ? Number(nextQuote.pe.toFixed(2)) : current.targetPe
      }));
    } catch (error) {
      setQuoteStatus("error");
      setQuoteError(error instanceof Error ? error.message : "行情获取失败");
    }
  };

  useEffect(() => {
    loadQuote(selectedSecurity);
    const timer = setInterval(() => loadQuote(selectedSecurity), 30000);
    return () => clearInterval(timer);
    // selectedSecurity is intentionally the refresh boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSecurity]);

  const handleSelectSecurity = (security) => {
    setSelectedSecurity(security);
    setActivePage("analysis");
  };

  const handleNumberChange = (event) => {
    const { name, value } = event.target;
    setInputs((current) => ({
      ...current,
      [name]: inputValue(Number(value))
    }));
  };

  const maxCashFlow = Math.max(...dcf.yearlyCashFlows.map((row) => row.cashFlow));
  const isIndex = selectedSecurity.type === "Index" || selectedSecurity.market === "指数";
  const isSector = selectedSecurity.type === "BK" || selectedSecurity.market === "行业";
  const quoteTone = quote?.changePercent >= 0 ? "positive" : "negative";

  return (
    <main className="appShell appFrame">
      <header className="appHeader">
        <div>
          <p>Seachat Valuation</p>
          <h1>投资估值</h1>
        </div>
        <button
          className="refreshButton"
          type="button"
          onClick={() => loadQuote()}
          disabled={quoteStatus === "loading"}
          title="刷新行情"
        >
          <RefreshCw size={18} />
        </button>
      </header>

      <AppNav activePage={activePage} onChange={setActivePage} />
      <AssetPicker
        open={pickerOpen}
        selected={selectedSecurity}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectSecurity}
      />

      {activePage === "analysis" && (
        <section className="pageStack">
            <section className="quotePanel">
              <div>
                <span>{selectedSecurity.market || selectedSecurity.type}</span>
                <h2>
                  {inputs.company}
                  <small>{inputs.ticker}</small>
                </h2>
              </div>
              <button className="selectAssetButton" type="button" onClick={() => setPickerOpen(true)}>
                选择标的
              </button>
              <div className="quotePrice">
                <strong>{yuan.format(inputs.price)}</strong>
                <b className={quoteTone}>{formatPercent(quote?.changePercent)}</b>
              </div>
              <div className="quoteStats">
                <span>涨跌额 {quote?.change ? yuan.format(quote.change) : "-"}</span>
                <span>开盘 {quote?.open ? yuan.format(quote.open) : "-"}</span>
                <span>最高 {quote?.high ? yuan.format(quote.high) : "-"}</span>
                <span>最低 {quote?.low ? yuan.format(quote.low) : "-"}</span>
                <span>成交额 {quote?.turnover ? compactYuan.format(quote.turnover) : "-"}</span>
                <span>总市值 {quote?.marketCap ? compactYuan.format(quote.marketCap) : "-"}</span>
              </div>
              {quoteStatus === "error" && <p className="statusText">行情失败：{quoteError}</p>}
            </section>

            <ValuationBand bands={valuationBands} price={inputs.price} />
            <MarketValuationChart selectedSecurity={selectedSecurity} quote={quote} />

            <section className="metricsGrid">
              <Metric
                icon={Calculator}
                label="DCF 内在价值"
                value={yuan.format(dcf.intrinsicValue)}
                tone={dcf.upside >= 0 ? "positive" : "negative"}
              />
              <Metric
                icon={TrendingUp}
                label="DCF 潜在空间"
                value={`${number.format(dcf.upside)}%`}
                tone={dcf.upside >= 0 ? "positive" : "negative"}
              />
              <Metric
                icon={Scale}
                label={isIndex || isSector ? "当前点位" : "实时 PE"}
                value={isIndex || isSector ? number.format(inputs.price) : formatRatio(quote?.pe)}
              />
              <Metric
                icon={Gauge}
                label={isIndex || isSector ? "今日振幅" : "实时 PB"}
                value={isIndex || isSector ? formatPercent(quote?.amplitude) : formatRatio(quote?.pb)}
              />
            </section>

      <div className="workspaceGrid">
        <section className="panel assumptions">
          <div className="panelHeader">
            <h2>估值假设</h2>
            <Percent size={18} />
          </div>
          <div className="liveNotice">
            行情来自东方财富，价格和股本会自动更新；财务预测仍需手动输入。
          </div>
          <div className="formGrid">
            <Field
              label="当前价格"
              name="price"
              value={inputs.price}
              suffix="元"
              onChange={handleNumberChange}
              step="0.01"
            />
            <Field
              label="稀释股数"
              name="shares"
              value={inputs.shares}
              suffix="百万股"
              onChange={handleNumberChange}
              step="0.01"
            />
            <Field
              label="净现金"
              name="netCash"
              value={inputs.netCash}
              suffix="百万元"
              onChange={handleNumberChange}
            />
            <Field
              label="收入"
              name="revenue"
              value={inputs.revenue}
              suffix="百万元"
              onChange={handleNumberChange}
            />
            <Field
              label="自由现金流"
              name="freeCashFlow"
              value={inputs.freeCashFlow}
              suffix="百万元"
              onChange={handleNumberChange}
            />
            <Field
              label="FCF 利润率"
              name="fcfMargin"
              value={inputs.fcfMargin}
              suffix="%"
              onChange={handleNumberChange}
              step="0.1"
            />
            <Field
              label="显性预测期"
              name="growthYears"
              value={inputs.growthYears}
              suffix="年"
              onChange={handleNumberChange}
            />
            <Field
              label="FCF 增长率"
              name="growthRate"
              value={inputs.growthRate}
              suffix="%"
              onChange={handleNumberChange}
              step="0.1"
            />
            <Field
              label="折现率"
              name="discountRate"
              value={inputs.discountRate}
              suffix="%"
              onChange={handleNumberChange}
              step="0.1"
            />
            <Field
              label="永续增长率"
              name="terminalGrowth"
              value={inputs.terminalGrowth}
              suffix="%"
              onChange={handleNumberChange}
              step="0.1"
            />
            <Field
              label="目标 PE"
              name="targetPe"
              value={inputs.targetPe}
              suffix="x"
              onChange={handleNumberChange}
              step="0.1"
            />
            <Field
              label="EPS"
              name="eps"
              value={inputs.eps}
              suffix="元"
              onChange={handleNumberChange}
              step="0.01"
            />
            <Field
              label="目标 EV/FCF"
              name="targetEvFcf"
              value={inputs.targetEvFcf}
              suffix="x"
              onChange={handleNumberChange}
              step="0.1"
            />
            <Field
              label="安全边际"
              name="marginOfSafety"
              value={inputs.marginOfSafety}
              suffix="%"
              onChange={handleNumberChange}
              step="1"
            />
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <h2>实时指标</h2>
            <BarChart3 size={18} />
          </div>
          <div className="comparisonGrid">
            <article>
              <span>PE / PB</span>
              <strong>
                {formatRatio(quote?.pe)} / {formatRatio(quote?.pb)}
              </strong>
              <small>东方财富实时行情字段</small>
            </article>
            <article>
              <span>总市值</span>
              <strong>{quote?.marketCap ? compactYuan.format(quote.marketCap) : "-"}</strong>
              <small>流通市值 {quote?.floatingMarketCap ? compactYuan.format(quote.floatingMarketCap) : "-"}</small>
            </article>
            <article>
              <span>更新时间</span>
              <strong>{quoteStatus === "loading" ? "刷新中" : "已同步"}</strong>
              <small>每 30 秒自动刷新一次</small>
            </article>
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <h2>DCF 拆解</h2>
            <LineChart size={18} />
          </div>
          <div className="valuationTable">
            <div>
              <span>显性现金流现值</span>
              <strong>{yuan.format(dcf.presentValue)}</strong>
            </div>
            <div>
              <span>终值现值</span>
              <strong>{yuan.format(dcf.discountedTerminal)}</strong>
            </div>
            <div>
              <span>企业价值</span>
              <strong>{yuan.format(dcf.enterpriseValue)}</strong>
            </div>
            <div>
              <span>股权价值</span>
              <strong>{yuan.format(dcf.equityValue)}</strong>
            </div>
          </div>

          <div className="cashFlowChart">
            {dcf.yearlyCashFlows.map((row) => (
              <div key={row.year} className="barRow">
                <span>Y{row.year}</span>
                <div>
                  <i style={{ width: `${(row.cashFlow / maxCashFlow) * 100}%` }} />
                </div>
                <strong>{yuan.format(row.cashFlow)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <h2>相对估值</h2>
            <BarChart3 size={18} />
          </div>
          <div className="comparisonGrid">
            <article>
              <span>PE 估值</span>
              <strong>{yuan.format(multiples.peValue)}</strong>
              <small>{inputs.targetPe}x × EPS {yuan.format(inputs.eps)}</small>
            </article>
            <article>
              <span>EV/FCF 估值</span>
              <strong>{yuan.format(multiples.evFcfValue)}</strong>
              <small>
                {inputs.targetEvFcf}x × FCF，加入净现金
              </small>
            </article>
            <article>
              <span>安全边际买入价</span>
              <strong>{yuan.format(multiples.buyBelow)}</strong>
              <small>混合估值潜在空间 {number.format(multiples.blendedUpside)}%</small>
            </article>
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <h2>情景矩阵</h2>
            <Scale size={18} />
          </div>
          <div className="scenarioList">
            {scenarioResults.map((scenario) => (
              <article key={scenario.name}>
                <div>
                  <strong>{scenario.name}</strong>
                  <span>
                    增长 {number.format(scenario.result.growthRate * 100)}% · 折现{" "}
                    {number.format(scenario.result.discountRate * 100)}%
                  </span>
                </div>
                <b>{yuan.format(scenario.result.intrinsicValue)}</b>
              </article>
            ))}
          </div>
        </section>
      </div>
        </section>
      )}

      {activePage === "academy" && (
        <section className="pageStack">
          <div className="mobileHero">
            <span>Valuation Academy</span>
            <h2>从模型到判断</h2>
            <p>用短课程理解 DCF、相对估值、安全边际和行情数据边界。</p>
          </div>
          <Academy />
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
