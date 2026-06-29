import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
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

const commonIndexes = [
  { code: "000001", name: "上证指数", quoteId: "1.000001", type: "Index", market: "指数" },
  { code: "399001", name: "深证成指", quoteId: "0.399001", type: "Index", market: "指数" },
  { code: "399006", name: "创业板指", quoteId: "0.399006", type: "Index", market: "指数" },
  { code: "000300", name: "沪深300", quoteId: "1.000300", type: "Index", market: "指数" },
  { code: "000905", name: "中证500", quoteId: "1.000905", type: "Index", market: "指数" },
  { code: "000852", name: "中证1000", quoteId: "1.000852", type: "Index", market: "指数" }
];

const commonStocks = [
  { code: "600519", name: "贵州茅台", quoteId: "1.600519", type: "AStock", market: "沪A" },
  { code: "000858", name: "五粮液", quoteId: "0.000858", type: "AStock", market: "深A" },
  { code: "601318", name: "中国平安", quoteId: "1.601318", type: "AStock", market: "沪A" },
  { code: "600036", name: "招商银行", quoteId: "1.600036", type: "AStock", market: "沪A" },
  { code: "300750", name: "宁德时代", quoteId: "0.300750", type: "AStock", market: "深A" },
  { code: "002594", name: "比亚迪", quoteId: "0.002594", type: "AStock", market: "深A" },
  { code: "600276", name: "恒瑞医药", quoteId: "1.600276", type: "AStock", market: "沪A" },
  { code: "601899", name: "紫金矿业", quoteId: "1.601899", type: "AStock", market: "沪A" }
];

const commonSectors = [
  { code: "BK0896", name: "白酒", quoteId: "90.BK0896", type: "BK", market: "行业" },
  { code: "BK0475", name: "银行", quoteId: "90.BK0475", type: "BK", market: "行业" },
  { code: "BK0473", name: "证券", quoteId: "90.BK0473", type: "BK", market: "行业" },
  { code: "BK1036", name: "半导体", quoteId: "90.BK1036", type: "BK", market: "行业" },
  { code: "BK0427", name: "医药商业", quoteId: "90.BK0427", type: "BK", market: "行业" },
  { code: "BK0437", name: "房地产开发", quoteId: "90.BK0437", type: "BK", market: "行业" }
];

const defaultSecurities = [...commonStocks, ...commonIndexes, ...commonSectors];

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

function SecuritySearch({ onSelect }) {
  const [query, setQuery] = useState("贵州茅台");
  const [items, setItems] = useState(defaultSecurities);
  const [status, setStatus] = useState("idle");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const keyword = query.trim();
    if (keyword.length < 2) {
      setItems(defaultSecurities);
      setStatus("idle");
      return;
    }

    const controller = new AbortController();
    setStatus("loading");

    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(keyword)}`, {
        signal: controller.signal
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("search failed");
          }
          return response.json();
        })
        .then((payload) => {
          setItems(payload.items || []);
          setStatus("ready");
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            setStatus("error");
          }
        });
    }, 240);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const filteredItems = items.filter(
    (item) => filter === "all" || getSecurityCategory(item) === filter
  );
  const visibleItems = filteredItems.slice(0, 16);

  return (
    <div className="searchBox">
      <div className="filterTabs">
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
      <label>
        <Search size={18} />
        <input
          placeholder="选择或搜索标的"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {open && (
        <div className="searchResults">
          {status === "loading" && query.trim().length >= 2 && <p>搜索中</p>}
          {status === "error" && <p>搜索失败</p>}
          {visibleItems.map((item) => (
              <button
                key={item.quoteId}
                type="button"
                onClick={() => {
                  onSelect(item);
                  setQuery(`${item.name} ${item.code}`);
                  setOpen(false);
                }}
              >
                <span>
                  {item.name}
                  <small>{item.code}</small>
                </span>
                <b>{item.market}</b>
              </button>
            ))}
          {visibleItems.length === 0 && <p>没有匹配结果</p>}
        </div>
      )}
    </div>
  );
}

function QuickPick({ title, items, onSelect }) {
  return (
    <section className="quickPick">
      <div className="quickPickHeader">
        <span>{title}</span>
      </div>
      <div className="quickPickList">
        {items.map((item) => (
          <button key={item.quoteId} type="button" onClick={() => onSelect(item)}>
            <strong>{item.name}</strong>
            <small>{item.code}</small>
          </button>
        ))}
      </div>
    </section>
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

function App() {
  const [activePage, setActivePage] = useState("analysis");
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
    <main className="appShell">
      <header className="topBar">
        <div>
          <p>Eastmoney Live Valuation</p>
          <h1>实时投资估值分析台</h1>
        </div>
        <div className="marketTools">
          <div className="pageTabs">
            <button
              className={activePage === "analysis" ? "active" : ""}
              type="button"
              onClick={() => setActivePage("analysis")}
            >
              分析台
            </button>
            <button
              className={activePage === "academy" ? "active" : ""}
              type="button"
              onClick={() => setActivePage("academy")}
            >
              学堂
            </button>
          </div>
          {activePage === "analysis" && (
            <>
              <SecuritySearch onSelect={handleSelectSecurity} />
              <button
                className="refreshButton"
                type="button"
                onClick={() => loadQuote()}
                disabled={quoteStatus === "loading"}
                title="刷新行情"
              >
                <RefreshCw size={18} />
              </button>
            </>
          )}
        </div>
      </header>

      {activePage === "academy" && <Academy />}

      {activePage === "analysis" && (
        <>
      <section className="categoryPanel">
        <QuickPick title="常用股票" items={commonStocks} onSelect={handleSelectSecurity} />
        <QuickPick title="常用指数" items={commonIndexes} onSelect={handleSelectSecurity} />
        <QuickPick title="常用行业" items={commonSectors} onSelect={handleSelectSecurity} />
      </section>

      <section className="quotePanel">
        <div>
          <span>{selectedSecurity.market || selectedSecurity.type}</span>
          <h2>
            {inputs.company}
            <small>{inputs.ticker}</small>
          </h2>
        </div>
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

        <ValuationBand bands={valuationBands} price={inputs.price} />

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
        </>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
