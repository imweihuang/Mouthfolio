"use client";
import { ResearchLink } from "./research-link";
import { useState } from "react";
import type { Observation, Receipt } from "../../contracts/types";
import { barScale, buildFinancialComparisons, buildOperatingCashBridge, cashBridgeScale, financialSelection, periodLabel, revenueYearOverYear } from "../../lib/financial-comparisons";
import type { CashBridge, FinancialPoint, ReportingDuration } from "../../lib/financial-comparisons";
import { formatAmount } from "../../lib/format-amount";
import { headlineAmount } from "../../lib/observations";
import { companySectionUrl } from "../../lib/navigation";
import type { JourneyContext } from "../../lib/navigation";

type Display = "chart" | "table";
type LabeledPoint = { point: FinancialPoint; label: string; tone?: "result" | "cash" };

function DisplaySwitch({ display, setDisplay, label }: { display: Display; setDisplay: (value: Display) => void; label: string }) {
  return <div className="financial-switch" role="group" aria-label={`${label} display`}>
    <button type="button" aria-pressed={display === "chart"} onClick={() => setDisplay("chart")}>Chart</button>
    <button type="button" aria-pressed={display === "table"} onClick={() => setDisplay("table")}>Exact table</button>
  </div>;
}

function SourceLink({ point, context, children }: { point: FinancialPoint; context: JourneyContext; children: React.ReactNode }) {
  return <ResearchLink prefetch={false} scroll={false} data-receipt={point.row.receipt_id}
    href={companySectionUrl({ ...context, receipt: point.row.receipt_id }, context.section ?? "overview")} className="financial-source"
    aria-label={`Open source: ${point.row.label}, ${point.row.period.label}, ${formatAmount(point.row.amount, point.row.unit)}${point.unavailable ? `. ${point.unavailable}` : ""}${point.row.revision_kind === "correction" ? ". Corrected observation" : ""}`}>
    {children}<span className="financial-source-hint" aria-hidden="true">Source ↗</span>
  </ResearchLink>;
}

function compact(point: FinancialPoint): string {
  // Unsupported or unusually precise amounts remain exact and never enter the
  // compact formatter or numeric geometry.
  return point.value === null ? formatAmount(point.row.amount, point.row.unit)
    : headlineAmount(point.row.amount, point.row.unit).text;
}

function Bars({ rows, context, label }: { rows: LabeledPoint[]; context: JourneyContext; label: string }) {
  const scale = barScale(rows.map(row => row.point));
  const endpoint = (value: number) => {
    const source = rows.find(row => row.point.value === value);
    return source ? compact(source.point) : "0 USD";
  };
  return <div className="financial-bars" role="group" aria-label={label}>
    <div className="financial-axis" aria-hidden="true">
      <span>{endpoint(scale.min)}</span><span>{scale.max !== scale.min ? endpoint(scale.max) : ""}</span>
      {scale.zero > 12 && scale.zero < 88 ? <span className="financial-zero-label" style={{ left: `${scale.zero}%` }}>0</span> : null}
    </div>
    {rows.map(({ point, label: rowLabel, tone }) => <div className="financial-bar-row" key={point.row.version_id}>
      <SourceLink point={point} context={context}>
        <span className="financial-row-heading"><span>{rowLabel}</span><strong>{compact(point)}</strong></span>
        {point.value !== null ? <svg className={`financial-bar ${tone ?? "revenue"}`} width="100%" height="24" aria-hidden="true" focusable="false">
          <line className="financial-baseline" x1={`${scale.zero}%`} x2={`${scale.zero}%`} y1="0" y2="24"/>
          <rect x={`${scale.geometry(point.value).x}%`} y="5" width={`${scale.geometry(point.value).width}%`} height="14"/>
          {point.value === 0 ? <line className="financial-zero-mark" x1={`${scale.zero}%`} x2={`${scale.zero}%`} y1="5" y2="19"/> : null}
        </svg> : <span className="financial-unplotted">{point.unavailable}</span>}
        {point.row.revision_kind === "correction" ? <span className="financial-correction">Corrected observation</span> : null}
      </SourceLink>
    </div>)}
  </div>;
}

function ExactTable({ rows, context, caption }: { rows: LabeledPoint[]; context: JourneyContext; caption: string }) {
  return <div className="financial-table-scroll" tabIndex={0} role="region" aria-label={caption}>
    <table className="financial-table"><caption>{caption} · original USD values</caption>
      <thead><tr><th scope="col">Measure / period</th><th scope="col">Exact value</th><th scope="col">Source</th></tr></thead>
      <tbody>{rows.map(({ point, label }) => <tr key={point.row.version_id}>
        <th scope="row">{label}<small>{point.row.label}</small><small>{point.row.period.start} – {point.row.period.end}</small></th>
        <td className="amount">{formatAmount(point.row.amount, point.row.unit)}
          {point.unavailable ? <small>{point.unavailable}</small> : null}
          {point.row.revision_kind === "correction" ? <small>Corrected observation</small> : null}
          <details><summary>Reporting basis</summary><p>{point.row.basis}</p></details>
        </td><td><SourceLink point={point} context={context}>Open</SourceLink></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

const durationNames: Record<ReportingDuration, string> = { annual: "Full year", firstHalf: "First half" };
const durationNotes: Record<ReportingDuration, string> = { annual: "January–December", firstHalf: "January–June" };

type FinancialComparisonsProps = {
  observations: Observation[]; receipts?: Receipt[]; companyName: string; context: JourneyContext;
};

export function FinancialComparisons({ compact = false, ...props }: FinancialComparisonsProps & { compact?: boolean }) {
  return compact ? <CompactFinancialComparisons {...props}/> : <DetailedFinancialComparisons {...props}/>;
}

function RevenueChange({ points, companyName }: { points: FinancialPoint[]; companyName: string }) {
  const change = revenueYearOverYear(points, companyName);
  if (!change) return <p className="financial-change-unavailable">Year-over-year change needs comparable reported values for consecutive years.</p>;
  const currentLabel = periodLabel(change.current.row, change.duration);
  const previousLabel = periodLabel(change.previous.row, change.duration);
  return <div className="financial-change" data-testid="revenue-yoy">
    <p><strong>{change.percent ?? formatAmount(change.changeAmount, "USD")}</strong><span>{change.percent ? "year over year" : "reported revenue difference"}<small>{currentLabel} vs {previousLabel} · calculated</small></span></p>
    <details><summary>How this is calculated</summary>
      <p>{formatAmount(change.current.row.amount, "USD")} − {formatAmount(change.previous.row.amount, "USD")} = {formatAmount(change.changeAmount, "USD")}.</p>
      <p>{change.percent ? "Percentage change = (current − prior) ÷ prior × 100, rounded to one decimal. Both periods have the same duration and reporting basis."
        : "No percentage is shown when prior revenue is zero or either revenue value is negative."} Source links for both periods are in the chart and exact table.</p>
    </details>
  </div>;
}

function CashDefinitions({ hasBridge = false }: { hasBridge?: boolean }) {
  return <details className="financial-definitions"><summary>What these figures mean</summary>
    <p><strong>Net income (loss)</strong> is the reported accounting result. Its basis includes valuation and non-operating effects.</p>
    <p><strong>Operating cash flow</strong> is cash provided by or used in operating activities.</p>
    <p className="financial-reconciliation">{hasBridge ? "The reported adjustments reconcile these totals in the bridge below. They do not establish cash runway." : "A complete, source-matched reconciliation is not available here. These totals alone do not explain the difference or establish cash runway."}</p>
  </details>;
}

function CashFlowBridge({ bridge, context }: { bridge: CashBridge; context: JourneyContext }) {
  const [display, setDisplay] = useState<Display>("chart");
  const scale = cashBridgeScale(bridge);
  const endpoint = (value: number) => headlineAmount(bridge.steps.find(step => step.to === value)?.runningAmount ?? "0", "USD").text;
  return <details className="financial-bridge" data-testid="cash-flow-bridge">
    <summary>How does net income reconcile to operating cash flow?</summary>
    <div className="financial-bridge-heading"><h3>{bridge.pair.label} · Accounting result to cash flow</h3>
      <DisplaySwitch display={display} setDisplay={setDisplay} label="Cash-flow bridge"/>
    </div>
    <p className="financial-note">Start with net income, then apply each reported adjustment to reach operating cash flow. Filled bars add to the running total; outlined bars subtract. Dark bars are reported totals. These are accounting adjustments, not transfers of money.</p>
    {display === "chart" ? <div className="financial-waterfall" role="group" aria-label={`${bridge.pair.label} signed operating cash-flow reconciliation`}>
      <div className="financial-axis" aria-hidden="true"><span>{endpoint(scale.min)}</span><span>{endpoint(scale.max)}</span>
        {scale.zero > 12 && scale.zero < 88 ? <span className="financial-zero-label" style={{ left: `${scale.zero}%` }}>0</span> : null}
      </div>
      {bridge.steps.map((step, index) => <div className="financial-waterfall-row" key={step.point.row.version_id}>
        <SourceLink point={step.point} context={context}>
          <span className="financial-row-heading"><span>{step.label}</span><strong>{step.kind === "adjustment" && step.point.value! > 0 ? "+" : ""}{compact(step.point)}</strong></span>
          <svg className={`financial-bridge-bar ${step.kind} ${step.point.value! < 0 ? "subtract" : "add"}`} width="100%" height="28" aria-hidden="true" focusable="false">
            <line className="financial-baseline" x1={`${scale.zero}%`} x2={`${scale.zero}%`} y1="0" y2="28"/>
            {step.kind === "adjustment" ? <line className="financial-bridge-connector" x1={`${scale.position(step.from)}%`} x2={`${scale.position(step.from)}%`} y1="0" y2="8"/> : null}
            <rect x={`${scale.geometry(step).x}%`} y="8" width={`${scale.geometry(step).width}%`} height="12"/>
            {step.from === step.to ? <line className="financial-zero-mark" x1={`${scale.position(step.to)}%`} x2={`${scale.position(step.to)}%`} y1="8" y2="20"/> : null}
            {index < bridge.steps.length - 2 ? <line className="financial-bridge-connector" x1={`${scale.position(step.to)}%`} x2={`${scale.position(step.to)}%`} y1="20" y2="28"/> : null}
          </svg>
          {step.point.row.revision_kind === "correction" ? <span className="financial-correction">Corrected observation</span> : null}
        </SourceLink>
      </div>)}
    </div> : <ExactTable rows={bridge.steps.map(step => ({ point: step.point, label: step.label }))} context={context} caption={`${bridge.pair.label} reported cash-flow reconciliation`}/>}
    <p className="financial-note financial-compact-footnote">All 11 adjustments and both totals refer to the same reporting period and source content. Their exact sum reconciles; chart labels are rounded. The exact table preserves the reported labels, values and source links.</p>
  </details>;
}

function CompactFinancialComparisons({ observations, receipts = [], companyName, context }: FinancialComparisonsProps) {
  const comparisons = buildFinancialComparisons(observations, companyName);
  const [requestedDuration, setRequestedDuration] = useState<ReportingDuration>();
  const [revenueDisplay, setRevenueDisplay] = useState<Display>("chart");
  const [resultDisplay, setResultDisplay] = useState<Display>("chart");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const selection = financialSelection(comparisons, { metric: "revenue", duration: requestedDuration });
  const duration = selection.metric === "revenue" ? selection.duration : undefined;
  const points = duration ? comparisons.revenue[duration] : [];
  const revenueRows = duration ? points.map(point => ({ point, label: periodLabel(point.row, duration) })) : [];
  const pair = comparisons.pairs.find(item => item.key === selectedPeriod) ?? comparisons.pairs.at(-1);
  const bridge = pair ? buildOperatingCashBridge(observations, receipts, companyName, pair) : null;
  const pairRows: LabeledPoint[] = pair ? [
    { point: pair.netIncome, label: "Net income (loss)", tone: "result" },
    { point: pair.operatingCashFlow, label: "Operating cash flow", tone: "cash" },
  ] : [];
  return <div id="financial-comparisons" className="financial-comparisons financial-compact" data-testid="financial-comparisons">
    <div className="financial-overview-heading"><p className="eyebrow">Two questions for the reported figures</p>
      <ResearchLink href={companySectionUrl(context, "financials")} className="financial-detail-link">All financials ↗</ResearchLink>
    </div>
    <div className="financial-overview-grid">
      <section className="financial-overview-panel" aria-labelledby="financial-overview-question" data-comparison="revenue">
        <div className="financial-question-heading"><h2 id="financial-overview-question">How is reported revenue changing?</h2></div>
        {revenueRows.length && duration ? <>
          <div className="financial-compact-controls">
            <div className="financial-switch" role="group" aria-label="Reporting duration">
              {selection.durations.map(value => <button key={value} type="button" aria-pressed={duration === value}
                onClick={() => setRequestedDuration(value)}>{durationNames[value]}</button>)}
            </div>
            <DisplaySwitch display={revenueDisplay} setDisplay={setRevenueDisplay} label="Revenue"/>
          </div>
          <RevenueChange points={points} companyName={companyName}/>
          <p className="financial-period-note">{durationNotes[duration]} · reported USD</p>
          {revenueDisplay === "chart" ? <Bars rows={revenueRows} context={context} label={`${durationNames[duration]} reported revenue`}/>
            : <ExactTable rows={revenueRows} context={context} caption={`${durationNames[duration]} revenue`}/>}
          <p className="financial-note financial-compact-footnote">Same-duration comparison · zero baseline · rounded USD.</p>
        </> : <p className="financial-empty">No comparable reported revenue periods are available in this edition. Missing evidence is not zero.</p>}
      </section>
      <section className="financial-overview-panel" aria-labelledby="financial-overview-cash-question" data-comparison="result">
        <div className="financial-question-heading"><h2 id="financial-overview-cash-question">How does the result compare with cash flow?</h2></div>
        {pair ? <>
          <div className="financial-compact-controls">
            <label className="financial-compact-period">Reporting period
              <select aria-label="Reporting period" value={pair.key} onChange={event => setSelectedPeriod(event.target.value)}>
                {comparisons.pairs.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </label>
            <DisplaySwitch display={resultDisplay} setDisplay={setResultDisplay} label="Result and cash flow"/>
          </div>
          <p className="financial-period-note">{durationNotes[pair.duration]} {pair.netIncome.row.period.start.slice(0, 4)} · reported USD</p>
          {resultDisplay === "chart" ? <Bars rows={pairRows} context={context} label={`${pair.label}: net income and operating cash flow`}/>
            : <ExactTable rows={pairRows} context={context} caption={`${pair.label} result and operating cash flow`}/>}
          <p className="financial-note financial-compact-footnote">Same period · shared scale · negative values extend left of zero.</p>
          <CashDefinitions hasBridge={Boolean(bridge)}/>
          {bridge ? <CashFlowBridge bridge={bridge} context={context}/> : null}
      </> : <p className="financial-empty">No compatible result and operating cash flow pair is available for the same period. Missing evidence is not zero.</p>}
      </section>
    </div>
  </div>;
}

function DetailedFinancialComparisons({ observations, receipts = [], companyName, context }: FinancialComparisonsProps) {
  const comparisons = buildFinancialComparisons(observations, companyName);
  const [revenueDisplay, setRevenueDisplay] = useState<Display>("chart");
  const [resultDisplay, setResultDisplay] = useState<Display>("chart");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const pair = comparisons.pairs.find(item => item.key === selectedPeriod) ?? comparisons.pairs.at(-1);
  const bridge = pair ? buildOperatingCashBridge(observations, receipts, companyName, pair) : null;
  const pairRows = pair ? [
    { point: pair.netIncome, label: "Net income (loss)", tone: "result" as const },
    { point: pair.operatingCashFlow, label: "Operating cash flow", tone: "cash" as const },
  ] : [];
  const hasRevenue = Object.values(comparisons.revenue).some(rows => rows.length > 0);
  return <div id="financial-comparisons" className="financial-comparisons" data-testid="financial-comparisons">
    <section id="revenue-comparison" aria-labelledby="revenue-question">
      <div className="financial-question-heading"><div><p className="eyebrow">Revenue</p><h2 id="revenue-question">How is reported revenue changing?</h2></div>
        {hasRevenue ? <DisplaySwitch display={revenueDisplay} setDisplay={setRevenueDisplay} label="Revenue"/> : null}
      </div>
      <p className="financial-note">Full years and first halves are separate comparisons. Each chart starts at zero and has its own scale. USD labels are rounded; exact values are in the table.</p>
      {hasRevenue ? <div className="financial-revenue-panels">
        {(["annual", "firstHalf"] as const).map(duration => {
          const rows = comparisons.revenue[duration].map(point => ({ point, label: periodLabel(point.row, duration) }));
          return <div className="financial-panel" key={duration}>
            <h3>{durationNames[duration]}</h3>
            {rows.length ? <RevenueChange points={comparisons.revenue[duration]} companyName={companyName}/> : null}
            <p className="financial-period-note">{durationNotes[duration]} · USD</p>
            {rows.length ? revenueDisplay === "chart" ? <Bars rows={rows} context={context} label={`${durationNames[duration]} reported revenue`}/>
              : <ExactTable rows={rows} context={context} caption={`${durationNames[duration]} revenue`}/>
              : <p className="financial-empty">No comparable {durationNames[duration].toLowerCase()} revenue observations in this edition.</p>}
          </div>;
        })}
      </div> : <p className="financial-empty">The available records do not establish comparable full-year or first-half revenue. See the complete evidence table for reported values.</p>}
    </section>
    <section id="cash-flow-comparison" aria-labelledby="cash-flow-question">
      <div className="financial-question-heading"><div><p className="eyebrow">Reported result and cash flow</p><h2 id="cash-flow-question">How does the reported result compare with operating cash flow?</h2></div>
        {pair ? <DisplaySwitch display={resultDisplay} setDisplay={setResultDisplay} label="Result and cash flow"/> : null}
      </div>
      <CashDefinitions hasBridge={Boolean(bridge)}/>
      {pair ? <>
        {resultDisplay === "chart" ? <div className="financial-result-panel">
          <div className="financial-period-control"><label htmlFor="financial-period">Reporting period<select aria-label="Reporting period" id="financial-period" value={pair.key} onChange={event => setSelectedPeriod(event.target.value)}>
            {comparisons.pairs.map(item => <option key={item.key} value={item.key}>{item.label} · {durationNotes[item.duration]}</option>)}
          </select></label><p className="financial-period-note">{pair.netIncome.row.period.start} – {pair.netIncome.row.period.end}<br/>USD · zero baseline · scale follows selected period</p></div>
          <Bars rows={pairRows} context={context} label={`${pair.label}: net income and operating cash flow`}/>
          <p className="financial-note">Negative values extend left of zero; positive values extend right. Labels are rounded; use the exact table for original values.</p>
        </div> : <ExactTable rows={comparisons.pairs.flatMap(item => [
          { point: item.netIncome, label: `${item.label} · Net income (loss)` },
          { point: item.operatingCashFlow, label: `${item.label} · Operating cash flow` },
        ])} context={context} caption="Matched result and operating cash flow periods"/>}
        {bridge ? <CashFlowBridge bridge={bridge} context={context}/> : null}
      </> : <p className="financial-empty">No compatible result and operating cash flow pair is available for the same period. Missing evidence is not zero.</p>}
    </section>
    <p className="financial-note financial-method">Comparisons include only matching reported measures, units and reporting bases. Unmatched or ambiguous records remain in the complete evidence table below.</p>
  </div>;
}
