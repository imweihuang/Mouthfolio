"use client";

export function ReloadPage() {
  // A full navigation clears a failed route response while retaining its exact URL.
  // Only the reader initiates a retry; an error never starts an automatic loop.
  return <button type="button" onClick={() => window.location.reload()}>Reload this page</button>;
}
