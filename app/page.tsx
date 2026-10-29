import { createDemoAdapter, DEMO_COMPANY, INITIAL_AS_OF, LATEST_AS_OF } from "../lib/demo-adapter";
import { formatAmount } from "../lib/contract";
import type { MouthfolioResearch, Receipt } from "../contracts/types";

export const dynamic = "force-dynamic";
const unavailableCopy = {
  no_record_found: "No record found for this cutoff. A source's publication date does not establish when it became available.",
  revoked: "This evidence is no longer available for display. Earlier dates do not restore access.",
  unavailable: "Research could not be loaded. This does not mean that nothing changed.",
};
const dateLabel = (value: string) => new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
function Source({ receipt }: { receipt: Receipt }) {
  return <article id={receipt.id} className="source">
    <h3>{receipt.title}</h3>
    <p>{receipt.excerpt ?? "This receipt permits a link only."}</p>
    <dl><dt>Source location</dt><dd>{receipt.locator}</dd>
      <dt>Published</dt><dd>{dateLabel(receipt.published_at)}</dd>
      <dt>Available</dt><dd>{receipt.available_at}</dd>
      <dt>Snapshot</dt><dd>{receipt.snapshot_id}</dd></dl>
    {receipt.url ? <a href={receipt.url} rel="noreferrer">Open source</a> : <p className="muted">Original fictional text; there is no external source.</p>}
  </article>;
}

export default async function Home({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const params = await searchParams;
  const asOf = typeof params.asof === "string" ? params.asof : LATEST_AS_OF;
  const scenario = params.state === "revoked" || params.state === "unavailable" ? params.state : "available";
  let data: MouthfolioResearch | null = null;
  try { data = await createDemoAdapter(scenario).read({ companyId: DEMO_COMPANY, asOf, window: "all" }); }
  catch { /* Invalid or unavailable data has its own visible state. */ }
  const ready = data?.status === "ready" ? data : null;
  const question = ready?.questions[0];
  const status = data && data.status !== "ready" ? data.status : "unavailable";
  return <>
    <a className="skip-link" href="#research">Skip to research</a>
    <header className="topbar"><a href="/" className="brand">Mouthfolio</a><span>Company and voice research · ASOF Data</span></header>
    <div className="demo-notice">Synthetic demo. All companies, voices, values and source text are fictional.</div>
    <div className="workspace">
      <nav className="sidebar" aria-label="Research navigation"><p className="nav-label">Companies</p>
        <a href="#research" aria-current="page">Aster Compute</a>
        <p className="nav-label">Voices</p><a href="#voice">Demo researcher</a>
        <p className="nav-label">On this page</p><a href="#evidence">Reported evidence</a><a href="#sources">Source receipts</a>
      </nav>
      <main id="research">
        <div className="page-heading"><div><p className="muted">Aster Compute</p><h1>{question?.title ?? "What evidence was available?"}</h1></div></div>
        <form className="filters" method="get" action="/" aria-label="Demo examples">
          <label>Evidence cutoff<select name="asof" defaultValue={asOf}>
            <option value="2026-10-25T12:00:00Z">Before availability · Oct 25</option>
            <option value={INITIAL_AS_OF}>Original edition · Oct 26</option>
            <option value={LATEST_AS_OF}>Corrected edition · Oct 27</option>
          </select></label>
          <label>Demo state<select name="state" defaultValue={scenario}><option value="available">Available</option><option value="revoked">Revoked</option><option value="unavailable">Service unavailable</option></select></label>
          <button type="submit">Apply</button>
        </form>
        {ready && question ? <>
          <section aria-labelledby="reading"><p className="edition">Edition {question.edition_date} · cutoff {ready.as_of}</p>
            <h2 id="reading">What does the evidence support?</h2><p className="finding">{question.finding}</p>
            <p className="muted">{ready.coverage.note}</p></section>
          <section id="evidence" aria-labelledby="reported"><h2 id="reported">What has been reported?</h2>
            <div className="table-scroll"><table><caption>Fictional Q3 2026 evidence</caption><thead><tr><th scope="col">Measure</th><th scope="col">Reported value</th><th scope="col">Evidence</th></tr></thead>
              <tbody>{ready.observations.map(row => <tr key={row.version_id}><th scope="row">{row.label}<small>{row.period.label}</small></th>
                <td><span className="amount">{formatAmount(row.amount, row.unit)}</span>{row.missing_reason ? <small>{row.missing_reason}</small> : null}
                  {row.revision_kind === "correction" ? <small>Corrected in the later edition</small> : null}</td>
                <td><a href={`#${row.receipt_id}`}>Inspect receipt</a></td></tr>)}</tbody></table></div>
          </section>
          <section id="voice" aria-labelledby="attribution"><h2 id="attribution">What did this voice say?</h2>
            {ready.views.map(view => <article key={view.version_id}><p className="voice-name">{ready.voices.find(voice => voice.id === view.voice_id)?.name} <span>· fictional voice · {dateLabel(view.published_at)}</span></p>
              <blockquote>{view.statement}</blockquote><p className="muted">{view.conditions}</p><a href={`#${view.receipt_id}`}>Inspect supporting receipt</a></article>)}
          </section>
          <section id="sources" aria-labelledby="receipts"><h2 id="receipts">Where did this come from?</h2>{ready.receipts.map(receipt => <Source key={receipt.id} receipt={receipt}/>)}</section>
        </> : <section className="empty" role="status"><h2>{status === "no_record_found" ? "No record found" : status === "revoked" ? "Evidence revoked" : "Research unavailable"}</h2><p>{unavailableCopy[status]}</p></section>}
        <footer>Fictional research examples · evidence availability is distinct from publication time.</footer>
      </main>
    </div>
  </>;
}
