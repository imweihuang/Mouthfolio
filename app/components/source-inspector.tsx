"use client";
import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Observation } from "../../contracts/types";
import type { Receipt } from "../../lib/contract";
import { formatAmount } from "../../lib/format-amount";
import { RecordTldr } from "./record-tldr";

export function SourceInspector({ receipt, requestedId, closeUrl, observations, synthetic }: {
  receipt: Receipt | undefined; requestedId: string; closeUrl: string; observations: Observation[]; synthetic: boolean;
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
    const fallback = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[data-receipt]")).find(link => link.dataset.receipt === requestedId);
    (opener.current?.isConnected ? opener.current : fallback ?? document.getElementById("research"))?.focus({ preventScroll: true });
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
    // Query ordering and percent encoding do not change research context. Keep
    // each parameter's full value list: duplicates must not become valid singles.
    const currentContext = () => {
      const url = new URL(location.href);
      return JSON.stringify([url.pathname, ...["company", "asof", "window", "state", "receipt"].map(key => {
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
        const fallback = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[data-receipt]")).find(link => link.dataset.receipt === requestedId);
        (opener.current?.isConnected ? opener.current : fallback ?? document.getElementById("research"))?.focus({ preventScroll: true });
      });
    };
  }, [requestedId, closeUrl]);
  useEffect(() => {
    if (!isPending) reopenIfCurrent.current();
  }, [isPending]);
  return <dialog ref={dialog} className="source-inspector" aria-labelledby="source-heading"
    onCancel={event => { event.preventDefault(); close(); }} onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
    }}>
    <div className="inspector-top"><span className="eyebrow">Source receipt{synthetic ? " · fictional" : ""}</span><button className="quiet-button" onClick={close} aria-label="Close source">Close ×</button></div>
    <h2 id="source-heading">{receipt?.title ?? "Source unavailable"}</h2>
    {receipt ? <>
      <RecordTldr receipt={receipt} details/>
      <p className="source-excerpt">{receipt.excerpt ?? (receipt.url ? "Open the original source for full context." : "Source text is not displayed here.")}</p>
      {observations.map(row => <div className="receipt-measure" key={row.version_id}><strong>{row.label}</strong><p className="receipt-amount">Reported value: {formatAmount(row.amount, row.unit)}</p>{row.missing_reason !== null ? <p>{row.missing_reason}</p> : null}<p>{row.period.label} · {row.period.start} – {row.period.end}</p><p>Unit: {row.unit} · {row.basis}</p><small>Evidence version: {row.version_id}{row.supersedes ? ` · supersedes ${row.supersedes}` : ""}</small></div>)}
      <dl className="receipt-details"><dt>Source location</dt><dd>{receipt.locator}</dd><dt>Published</dt><dd><time dateTime={receipt.published_at}>{receipt.published_at}</time></dd>
        <dt>Ingested</dt><dd>{receipt.ingested_at}</dd><dt>Available</dt><dd>{receipt.available_at}</dd><dt>Receipt display</dt><dd>{receipt.display_policy === "excerpt" ? "Excerpt" : "Link only"}</dd>
        <dt>Receipt identity</dt><dd>{receipt.id}</dd><dt>Source identity</dt><dd>{receipt.source_id}</dd><dt>Snapshot</dt><dd data-testid="snapshot">{receipt.snapshot_id}</dd></dl>
      <details><summary>Content fingerprint</summary><code>{receipt.content_sha256}</code></details>
      {receipt.url ? <a className="source-link" href={receipt.url} rel="noreferrer">Open original source ↗</a> : <p className="muted">{synthetic ? "Original fictional text; there is no external source." : "The original source link is unavailable. Source text is not displayed."}</p>}
    </> : <p>This exact receipt is absent or no longer eligible at the selected cutoff. Another version has not been substituted.</p>}
  </dialog>;
}
