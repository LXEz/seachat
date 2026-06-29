import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3,
  Calculator,
  Gauge,
  LineChart,
  Percent,
  Scale,
  TrendingUp
} from "lucide-react";
import "./styles.css";

const initialInputs = {
  ticker: "AAPL",
  company: "样例公司",
  price: 198,
  shares: 15400,
  netCash: 52000,
  revenue: 390000,
  freeCashFlow: 104000,
  fcfMargin: 26.7,
  growthYears: 8,
  growthRate: 7,
  discountRate: 9,
  terminalGrowth: 2.5,
  targetPe: 24,
  eps: 6.4,
  targetEvFcf: 22,
  marginOfSafety: 25
};

const scenarios = [
  { name: "保守", growthDelta: -2, discountDelta: 1.5, terminalDelta: -0.5 },
  { name: "基准", growthDelta: 0, discountDelta: 0, terminalDelta: 0 },
  { name: "乐观", growthDelta: 2, discountDelta: -1, terminalDelta: 0.4 }
];

const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

const number = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 1
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

function App() {
  const [inputs, setInputs] = useState(initialInputs);
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

  const handleNumberChange = (event) => {
    const { name, value } = event.target;
    setInputs((current) => ({
      ...current,
      [name]: inputValue(Number(value))
    }));
  };

  const handleTextChange = (event) => {
    const { name, value } = event.target;
    setInputs((current) => ({ ...current, [name]: value }));
  };

  const maxCashFlow = Math.max(...dcf.yearlyCashFlows.map((row) => row.cashFlow));

  return (
    <main className="appShell">
      <header className="topBar">
        <div>
          <p>Valuation Workbench</p>
          <h1>投资估值分析台</h1>
        </div>
        <div className="identity">
          <input
            aria-label="股票代码"
            name="ticker"
            value={inputs.ticker}
            onChange={handleTextChange}
          />
          <input
            aria-label="公司名称"
            name="company"
            value={inputs.company}
            onChange={handleTextChange}
          />
        </div>
      </header>

      <section className="metricsGrid">
        <Metric
          icon={Calculator}
          label="DCF 内在价值"
          value={currency.format(dcf.intrinsicValue)}
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
          label="倍数混合价值"
          value={currency.format(multiples.blendedValue)}
        />
        <Metric
          icon={Gauge}
          label="安全边际买入价"
          value={currency.format(multiples.buyBelow)}
        />
      </section>

      <div className="workspaceGrid">
        <section className="panel assumptions">
          <div className="panelHeader">
            <h2>核心假设</h2>
            <Percent size={18} />
          </div>
          <div className="formGrid">
            <Field
              label="当前股价"
              name="price"
              value={inputs.price}
              suffix="$"
              onChange={handleNumberChange}
              step="0.01"
            />
            <Field
              label="稀释股数"
              name="shares"
              value={inputs.shares}
              suffix="百万"
              onChange={handleNumberChange}
            />
            <Field
              label="净现金"
              name="netCash"
              value={inputs.netCash}
              suffix="百万$"
              onChange={handleNumberChange}
            />
            <Field
              label="收入"
              name="revenue"
              value={inputs.revenue}
              suffix="百万$"
              onChange={handleNumberChange}
            />
            <Field
              label="自由现金流"
              name="freeCashFlow"
              value={inputs.freeCashFlow}
              suffix="百万$"
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
              suffix="$"
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
            <h2>DCF 拆解</h2>
            <LineChart size={18} />
          </div>
          <div className="valuationTable">
            <div>
              <span>显性现金流现值</span>
              <strong>{currency.format(dcf.presentValue)}</strong>
            </div>
            <div>
              <span>终值现值</span>
              <strong>{currency.format(dcf.discountedTerminal)}</strong>
            </div>
            <div>
              <span>企业价值</span>
              <strong>{currency.format(dcf.enterpriseValue)}</strong>
            </div>
            <div>
              <span>股权价值</span>
              <strong>{currency.format(dcf.equityValue)}</strong>
            </div>
          </div>

          <div className="cashFlowChart">
            {dcf.yearlyCashFlows.map((row) => (
              <div key={row.year} className="barRow">
                <span>Y{row.year}</span>
                <div>
                  <i style={{ width: `${(row.cashFlow / maxCashFlow) * 100}%` }} />
                </div>
                <strong>{currency.format(row.cashFlow)}</strong>
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
              <strong>{currency.format(multiples.peValue)}</strong>
              <small>{inputs.targetPe}x × EPS {currency.format(inputs.eps)}</small>
            </article>
            <article>
              <span>EV/FCF 估值</span>
              <strong>{currency.format(multiples.evFcfValue)}</strong>
              <small>
                {inputs.targetEvFcf}x × FCF，加入净现金
              </small>
            </article>
            <article>
              <span>混合潜在空间</span>
              <strong>{number.format(multiples.blendedUpside)}%</strong>
              <small>相对当前价格 {currency.format(inputs.price)}</small>
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
                <b>{currency.format(scenario.result.intrinsicValue)}</b>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
