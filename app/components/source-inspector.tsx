"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Observation, Receipt } from "../../contracts/types";

export function SourceInspector({ receipt, requestedId, closeUrl, observations, synthetic }: {
  receipt: Receipt | undefined; requestedId: string; closeUrl: string; observations: Observation[]; synthetic: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const opener = useRef<HTMLElement | null>(null);
  const close = () => { router.push(closeUrl, { scroll: false }); };
  useEffect(() => {
    const pane = dialog.current;
    if (!pane) return;
    const active = document.activeElement;
    if (active instanceof HTMLAnchorElement && active.dataset.receipt === requestedId) opener.current = active;
    const media = matchMedia("(max-width: 1100px)");
    const show = () => { pane.close(); if (media.matches) pane.showModal(); else pane.show(); };
    show();
    pane.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    media.addEventListener("change", show);
    return () => {
      media.removeEventListener("change", show); pane.close();
      requestAnimationFrame(() => {
        if (new URL(location.href).searchParams.has("receipt")) return;
        const fallback = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[data-receipt]")).find(link => link.dataset.receipt === requestedId);
        (opener.current?.isConnected ? opener.current : fallback ?? document.getElementById("research"))?.focus({ preventScroll: true });
      });
    };
  }, [requestedId]);
  return <dialog ref={dialog} className="source-inspector" aria-labelledby="source-heading"
    onCancel={event => { event.preventDefault(); close(); }} onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
    }}>
    <div className="inspector-top"><span className="eyebrow">Source receipt{synthetic ? " · fictional" : ""}</span><button className="quiet-button" onClick={close} aria-label="Close source">Close ×</button></div>
    <h2 id="source-heading">{receipt?.title ?? "Source unavailable"}</h2>
    {receipt ? <>
      <p className="source-excerpt">{receipt.excerpt ?? "This source permits a link only. Its text is not available for display."}</p>
      {observations.map(row => <div className="receipt-measure" key={row.version_id}><strong>{row.label}</strong><p>{row.period.label} · {row.period.start} – {row.period.end}</p><p>Unit: {row.unit} · {row.basis}</p><small>Evidence version: {row.version_id}{row.supersedes ? ` · supersedes ${row.supersedes}` : ""}</small></div>)}
      <dl className="receipt-details"><dt>Source location</dt><dd>{receipt.locator}</dd><dt>Published</dt><dd><time dateTime={receipt.published_at}>{receipt.published_at}</time></dd>
        <dt>Ingested</dt><dd>{receipt.ingested_at}</dd><dt>Available</dt><dd>{receipt.available_at}</dd><dt>Display permission</dt><dd>{receipt.display_policy === "excerpt" ? "Permitted excerpt" : "Link only"}</dd>
        <dt>Receipt identity</dt><dd>{receipt.id}</dd><dt>Source identity</dt><dd>{receipt.source_id}</dd><dt>Snapshot</dt><dd data-testid="snapshot">{receipt.snapshot_id}</dd></dl>
      <details><summary>Content fingerprint</summary><code>{receipt.content_sha256}</code></details>
      {receipt.url ? <a className="source-link" href={receipt.url} rel="noreferrer">Open original source ↗</a> : <p className="muted">Original fictional text; there is no external source.</p>}
    </> : <p>This exact receipt is absent or no longer eligible at the selected cutoff. Another version has not been substituted.</p>}
  </dialog>;
}
