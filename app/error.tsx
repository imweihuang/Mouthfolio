"use client";
import { ReloadPage } from "./components/reload-page";

export default function ResearchError() {
  return <main>
    <p className="eyebrow">Mouthfolio</p>
    <section className="empty" aria-labelledby="recovery-heading">
      <h1 id="recovery-heading">Research could not be displayed</h1>
      <p>The page did not finish loading. This does not mean that no evidence exists.</p>
      <p>Reload to try this page again. Any selected cutoff and receipt stay in the URL.</p>
      <ReloadPage/>
    </section>
  </main>;
}
