import type { Receipt } from "../../lib/contract";

// ASOF-authored summary text is separate from source excerpts and attributed views.
export function RecordTldr({ receipt, details = false }: { receipt?: Receipt; details?: boolean }) {
  const summary = receipt && "summary" in receipt ? receipt.summary : null;
  if (!summary) return null;
  return <section className="record-tldr" aria-label="Record TLDR">
    <div className="tldr-heading"><strong>Record TLDR</strong><span>AI-authored · AI-reviewed</span></div>
    <p>{summary.text}</p>
    <p className="tldr-context">{summary.framing === "summary_from_asof_capture" ? "Based on an ASOF capture." : "Based on the source at capture time."} Open the original source for full context.</p>
    <dl className="tldr-dates"><dt>Source captured</dt><dd><time dateTime={summary.capture_observed_at}>{summary.capture_observed_at}</time></dd><dt>Summary available</dt><dd><time dateTime={summary.available_at}>{summary.available_at}</time></dd></dl>
    {details ? <details><summary>Summary identity</summary><p>{summary.id}</p><p>Version: {summary.version_id}</p></details> : null}
  </section>;
}
