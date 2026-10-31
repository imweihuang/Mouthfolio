"use client";

import { useState } from "react";
import Link from "next/link";
import type { Observation } from "../../contracts/types";
import { barScale, buildFinancialComparisons, financialSelection, periodLabel } from "../../lib/financial-comparisons";
import type { FinancialPoint, FinancialView, ReportingDuration } from "../../lib/financial-comparisons";
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
  return <Link prefetch={false} scroll={false} data-receipt={point.row.receipt_id}
    href={companySectionUrl({ ...context, receipt: point.row.receipt_id }, context.section ?? "overview")} className="financial-source"
    aria-label={`Open source: ${point.row.label}, ${point.row.period.label}, ${formatAmount(point.row.amount, point.row.unit)}${point.unavailable ? `. ${point.unavailable}` : ""}${point.row.revision_kind === "correction" ? ". Corrected observation" : ""}`}>
    {children}<span className="financial-source-hint" aria-hidden="true">Source ↗</span>
  </Link>;
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
  observations: Observation[]; companyName: string; context: JourneyContext;
};

export function FinancialComparisons({ compact = false, ...props }: FinancialComparisonsProps & { compact?: boolean }) {
  return compact ? <CompactFinancialComparisons {...props}/> : <DetailedFinancialComparisons {...props}/>;
}

function CompactFinancialComparisons({ observations, companyName, context }: FinancialComparisonsProps) {
  const comparisons = buildFinancialComparisons(observations, companyName);
  const [requested, setRequested] = useState<{ metric?: FinancialView; duration?: ReportingDuration }>({});
  const [display, setDisplay] = useState<Display>("chart");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const { metric, metrics, duration, durations } = financialSelection(comparisons, requested);
  const pairs = comparisons.pairs.filter(pair => pair.duration === duration);
  const pair = pairs.find(item => item.key === selectedPeriod) ?? pairs.at(-1);
  const rows: LabeledPoint[] = metric === "revenue" && duration
    ? comparisons.revenue[duration].map(point => ({ point, label: periodLabel(point.row, duration) }))
    : pair ? [
      { point: pair.netIncome, label: "Net income (loss)", tone: "result" },
      { point: pair.operatingCashFlow, label: "Operating cash flow", tone: "cash" },
    ] : [];
  const question = metric === "result" ? "How does the result compare with cash flow?" : "How is reported revenue changing?";
  const caption = `${duration ? durationNames[duration] : "Reported"} ${metric === "result" ? `${pair?.label ?? ""} result and operating cash flow` : "revenue"}`;

  return <div id="financial-comparisons" className="financial-comparisons financial-compact" data-testid="financial-comparisons" data-comparison={metric}>
    <section aria-labelledby="financial-overview-question">
      <div className="financial-question-heading"><h2 id="financial-overview-question">{question}</h2>
        <Link prefetch={false} href={companySectionUrl(context, "financials")} className="financial-detail-link">All financials ↗</Link>
      </div>
      {rows.length ? <>
        <div className="financial-compact-controls">
          <div className="financial-switch" role="group" aria-label="Financial comparison">
            {metrics.map(value => <button key={value} type="button" aria-pressed={metric === value}
              onClick={() => { setRequested({ metric: value }); setSelectedPeriod(""); }}>
              {value === "revenue" ? "Revenue" : "Result & cash flow"}
            </button>)}
          </div>
          <div className="financial-switch" role="group" aria-label="Reporting duration">
            {durations.map(value => <button key={value} type="button" aria-pressed={duration === value}
              onClick={() => { setRequested({ metric, duration: value }); setSelectedPeriod(""); }}>{durationNames[value]}</button>)}
          </div>
          <DisplaySwitch display={display} setDisplay={setDisplay} label={metric === "result" ? "Result and cash flow" : "Revenue"}/>
        </div>
        <div className="financial-compact-meta">
          {metric === "result" && pair ? <label className="financial-compact-period">Reporting period
            <select aria-label="Reporting period" value={pair.key} onChange={event => setSelectedPeriod(event.target.value)}>
              {pairs.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          </label> : <p className="financial-period-note">{duration ? durationNotes[duration] : ""} · reported USD</p>}
        </div>
        {display === "chart" ? <Bars rows={rows} context={context} label={caption}/>
          : <ExactTable rows={rows} context={context} caption={caption}/>}
        <p className="financial-note financial-compact-footnote">{metric === "revenue"
          ? "Full years and first halves are separate. Each selection has its own zero-based scale."
          : "Same reporting period. Net income can include valuation and non-operating effects; this is not a cash-flow reconciliation."}
          {display === "chart" ? " Rounded USD labels; open the exact table for original values." : ""}</p>
      </> : <p className="financial-empty">No comparable reported periods are available in this edition. Missing evidence is not zero.</p>}
    </section>
  </div>;
}

function DetailedFinancialComparisons({ observations, companyName, context }: FinancialComparisonsProps) {
  const comparisons = buildFinancialComparisons(observations, companyName);
  const [revenueDisplay, setRevenueDisplay] = useState<Display>("chart");
  const [resultDisplay, setResultDisplay] = useState<Display>("chart");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const pair = comparisons.pairs.find(item => item.key === selectedPeriod) ?? comparisons.pairs.at(-1);
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
            <h3>{durationNames[duration]}</h3><p className="financial-period-note">{durationNotes[duration]} · USD</p>
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
      <p className="financial-note">Compare the two reported measures for the same period. Net income can include valuation and non-operating effects. These figures do not explain the accounting-to-cash difference or establish cash runway.</p>
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
      </> : <p className="financial-empty">No compatible result and operating cash flow pair is available for the same period. Missing evidence is not zero.</p>}
    </section>
    <p className="financial-note financial-method">Comparisons include only matching reported measures, units and reporting bases. Unmatched or ambiguous records remain in the complete evidence table below.</p>
  </div>;
}
