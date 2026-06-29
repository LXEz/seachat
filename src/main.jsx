import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3,
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

function SecuritySearch({ onSelect }) {
  const [query, setQuery] = useState("贵州茅台");
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const keyword = query.trim();
    if (keyword.length < 2) {
      setItems([]);
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

  return (
    <div className="searchBox">
      <label>
        <Search size={18} />
        <input
          placeholder="搜索股票或指数"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {query.trim().length >= 2 && (
        <div className="searchResults">
          {status === "loading" && <p>搜索中</p>}
          {status === "error" && <p>搜索失败</p>}
          {status === "ready" &&
            items.map((item) => (
              <button
                key={item.quoteId}
                type="button"
                onClick={() => {
                  onSelect(item);
                  setQuery(`${item.name} ${item.code}`);
                  setItems([]);
                }}
              >
                <span>
                  {item.name}
                  <small>{item.code}</small>
                </span>
                <b>{item.market}</b>
              </button>
            ))}
          {status === "ready" && items.length === 0 && <p>没有匹配结果</p>}
        </div>
      )}
    </div>
  );
}

function App() {
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
  const quoteTone = quote?.changePercent >= 0 ? "positive" : "negative";

  return (
    <main className="appShell">
      <header className="topBar">
        <div>
          <p>Eastmoney Live Valuation</p>
          <h1>实时投资估值分析台</h1>
        </div>
        <div className="marketTools">
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
        </div>
      </header>

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
          label={isIndex ? "指数点位" : "实时 PE"}
          value={isIndex ? number.format(inputs.price) : formatRatio(quote?.pe)}
        />
        <Metric
          icon={Gauge}
          label={isIndex ? "今日振幅" : "实时 PB"}
          value={isIndex ? formatPercent(quote?.amplitude) : formatRatio(quote?.pb)}
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
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
