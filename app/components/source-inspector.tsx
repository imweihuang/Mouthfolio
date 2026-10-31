"use client";
import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Coverage, Observation } from "../../contracts/types";
import type { Receipt } from "../../lib/contract";
import { formatAmount } from "../../lib/format-amount";
import { companyFactText, disclosureDate, type CompanyFact } from "../../lib/company-orientation";
import { companySectionUrl, journeyUrl, type JourneyContext } from "../../lib/navigation";
import { recentEvidence, readerPeriod } from "../../lib/reader-context";
import { RecordTldr } from "./record-tldr";
import "./source-inspector.css";

const readableDate = (value: string) => new Date(value).toLocaleDateString("en-US", {
  year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
});

/** A useful docked starting point; every link still selects one exact receipt. */
export function EvidenceContext({ receipts, observations, companyName, context, coverage, synthetic, path }: {
  receipts: Receipt[]; observations: Observation[]; companyName: string; context: JourneyContext;
  coverage: Coverage; synthetic: boolean; path: string;
}) {
  const additions = recentEvidence(receipts, observations, context.asOf);
  return <aside className="source-context-pane" aria-labelledby="evidence-context-heading">
    <p className="eyebrow">{synthetic ? "Fictional evidence" : "Research notebook"}</p>
    <h2 id="evidence-context-heading">What changed</h2>
    <p className="evidence-context-intro">Recent additions to the evidence available here. Older sources can become available later.</p>
    <ol className="evidence-additions">{additions.map(event => <li key={event.receipt.id}>
      <p className="addition-kind">{event.label} · <time dateTime={event.availableAt}>{readableDate(event.availableAt)}</time></p>
      <Link prefetch={false} scroll={false} data-receipt={event.receipt.id} href={journeyUrl(path, context, event.receipt.id)}>{event.receipt.title}</Link>
      <p className="addition-source-date">Source published {readableDate(event.receipt.published_at)}</p>
    </li>)}</ol>
    <section className="evidence-context-section"><h3>Questions to follow</h3>
      <ul className="evidence-context-links">
        <li><Link prefetch={false} href={companySectionUrl(context, "financials")}>How is reported revenue changing?</Link></li>
        <li><Link prefetch={false} href={companySectionUrl(context, "financials")}>What connects the result to cash flow?</Link></li>
        <li><Link prefetch={false} href={companySectionUrl(context, "commentary")}>What are sources saying about {companyName}?</Link></li>
      </ul>
    </section>
    <details className="evidence-coverage"><summary>Sources and coverage</summary>
      <p>{coverage.state === "partial" ? "Coverage is partial. This archive does not include every source or reaction." : "The available evidence covers the supplied research scope."}</p>
      <p>Evidence available by <time dateTime={context.asOf}>{readableDate(context.asOf)} UTC</time>. This is the research cutoff, not a promise that sources were checked at that time.</p>
      <p>Publication dates, reporting periods and the date evidence became available describe different things. Each source retains those dates.</p>
    </details>
  </aside>;
}

// A receipt can live inside a collapsed evidence table after a reload.
// Attempt visible candidates, then return keyboard focus to the research region.
function focusReceiptOpener(opener: HTMLElement | null, requestedId: string) {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[data-receipt]")).filter(link => link.dataset.receipt === requestedId);
  for (const candidate of [opener, ...links, document.getElementById("research")]) {
    if (!candidate?.isConnected || !candidate.getClientRects().length) continue;
    candidate.focus({ preventScroll: true });
    if (document.activeElement === candidate) return;
  }
}

export function SourceInspector({ receipt, requestedId, closeUrl, observations, facts = [], synthetic }: {
  receipt: Receipt | undefined; requestedId: string; closeUrl: string; observations: Observation[]; facts?: CompanyFact[]; synthetic: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const opener = useRef<HTMLElement | null>(null);
  const dismissed = useRef(false);
  const focusRestored = useRef(false);
  const reopenIfCurrent = useRef(() => {});
  const [isPending, startTransition] = useTransition();
  const restoreFocus = () => {
    focusRestored.current = true;
    focusReceiptOpener(opener.current, requestedId);
  };
  const close = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    dialog.current?.close();
    restoreFocus();
    startTransition(() => { router.push(closeUrl, { scroll: false }); });
  };
  useEffect(() => {
    const pane = dialog.current;
    if (!pane) return;
    const active = document.activeElement;
    if (active instanceof HTMLAnchorElement && active.dataset.receipt === requestedId) opener.current = active;
    const media = matchMedia("(max-width: 1100px)");
    const defaults = new URL(closeUrl, location.href).searchParams;
    defaults.set("state", defaults.get("state") ?? "available");
    defaults.set("voice", defaults.get("voice") ?? "all");
    defaults.set("kind", defaults.get("kind") ?? "all");
    defaults.set("order", defaults.get("order") ?? "readable");
    // Query ordering and percent encoding do not change research context. Keep
    // each parameter's full value list: duplicates must not become valid singles.
    const currentContext = () => {
      const url = new URL(location.href);
      return JSON.stringify([url.pathname, ...["company", "asof", "window", "state", "receipt", "voice", "kind", "order", "section"].map(key => {
        const values = url.searchParams.getAll(key);
        return values.length ? values : defaults.getAll(key);
      })]);
    };
    const openedContext = currentContext();
    dismissed.current = false;
    const show = () => {
      if (dismissed.current) return;
      focusRestored.current = false;
      pane.close();
      if (media.matches) pane.showModal(); else pane.show();
      pane.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    };
    // History can restore this same mounted receipt while a close is still pending.
    // A cancelled navigation must not leave its dialog permanently dismissed.
    const restoreFromHistory = () => {
      dismissed.current = currentContext() !== openedContext;
      if (dismissed.current) { pane.close(); restoreFocus(); } else show();
    };
    reopenIfCurrent.current = () => {
      if (dismissed.current && currentContext() === openedContext) restoreFromHistory();
    };
    show();
    media.addEventListener("change", show);
    window.addEventListener("popstate", restoreFromHistory);
    return () => {
      media.removeEventListener("change", show);
      window.removeEventListener("popstate", restoreFromHistory);
      reopenIfCurrent.current = () => {};
      const focusAlreadyRestored = focusRestored.current;
      pane.close();
      requestAnimationFrame(() => {
        if (focusAlreadyRestored || new URL(location.href).searchParams.has("receipt")) return;
        focusReceiptOpener(opener.current, requestedId);
      });
    };
  }, [requestedId, closeUrl]);
  useEffect(() => {
    if (!isPending) reopenIfCurrent.current();
  }, [isPending]);
  return <dialog ref={dialog} className="source-inspector" aria-labelledby="source-heading"
    onCancel={event => { event.preventDefault(); close(); }} onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key === "Tab" && event.currentTarget.matches(":modal")) {
        const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex='-1'])",
        )).filter(element => element.getClientRects().length && element.checkVisibility());
        const first = targets[0], last = targets.at(-1);
        if (first && last && ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last))) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    }}>
    <div className="inspector-top"><span className="eyebrow">Source &amp; context{synthetic ? " · fictional" : ""}</span><button className="quiet-button" onClick={close} aria-label="Close source">Close</button></div>
    <h2 id="source-heading">{receipt?.title ?? "Source unavailable"}</h2>
    {receipt ? <>
      <p className="receipt-publication">Published <time dateTime={receipt.published_at} title={receipt.published_at}>{readableDate(receipt.published_at)} UTC</time></p>
      <RecordTldr receipt={receipt} details/>
      {receipt.excerpt ? <p className="source-excerpt">{receipt.excerpt}</p> : !("summary" in receipt && receipt.summary) && !observations.length && !facts.length ? <p className="source-excerpt">{receipt.url ? "Open the original source for full context." : "Source text is not displayed here."}</p> : null}
      {facts.map(fact => <div className="receipt-measure" data-company-fact={fact.version_id} key={fact.version_id}>
        <strong>{fact.kind === "product" ? "Product" : fact.kind === "delivery_channel" ? "Access" : "Listing application"}</strong>
        <p>{companyFactText(fact)}</p>
        <p>Disclosed <time dateTime={fact.disclosed_on}>{disclosureDate(fact.disclosed_on)}</time>.</p>
        {fact.kind === "listing_application" ? <p>This does not establish current listing status.</p> : null}
        <details><summary>Fact record</summary><small>Evidence version: {fact.version_id}{fact.supersedes ? ` · supersedes ${fact.supersedes}` : ""}</small></details>
      </div>)}
      {observations.map(row => <div className="receipt-measure" key={row.version_id}><strong>{row.label}</strong><p className="receipt-amount">Reported value: {formatAmount(row.amount, row.unit)}</p>{row.missing_reason !== null ? <p>{row.missing_reason}</p> : null}<p>{readerPeriod(row)}</p><details><summary>Definition and reporting basis</summary><p>{row.period.start} – {row.period.end}</p><p>Unit: {row.unit} · {row.basis}</p><small>Evidence version: {row.version_id}{row.supersedes ? ` · supersedes ${row.supersedes}` : ""}</small></details></div>)}
      {receipt.url ? <a className="source-link" href={receipt.url} rel="noreferrer">Open original source</a> : <p className="muted">{synthetic ? "Original fictional text; there is no external source." : "The original source link is unavailable. Source text is not displayed."}</p>}
      <details className="record-details"><summary>Record details</summary>
      <dl className="receipt-details"><dt>Source location</dt><dd>{receipt.locator}</dd><dt>Published</dt><dd><time dateTime={receipt.published_at}>{receipt.published_at}</time></dd>
        <dt>Ingested</dt><dd>{receipt.ingested_at}</dd><dt>Available</dt><dd>{receipt.available_at}</dd><dt>Receipt display</dt><dd>{receipt.display_policy === "excerpt" ? "Excerpt" : "Link only"}</dd>
        <dt>Receipt identity</dt><dd>{receipt.id}</dd><dt>Source identity</dt><dd>{receipt.source_id}</dd><dt>Snapshot</dt><dd data-testid="snapshot">{receipt.snapshot_id}</dd></dl>
      <p>Content fingerprint</p><code>{receipt.content_sha256}</code>
      </details>
    </> : <p>This exact receipt is absent or no longer eligible at the selected cutoff. Another version has not been substituted.</p>}
  </dialog>;
}
