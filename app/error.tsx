"use client";
import { ReloadPage } from "./components/reload-page";

export default function ResearchError() {
  return <main>
    <p className="eyebrow">Mouthfolio</p>
    <section className="empty" aria-labelledby="recovery-heading">
      <h1 id="recovery-heading">Research could not be displayed</h1>
      <p>The page did not finish loading. This does not mean that no evidence exists.</p>
      <p>Reload to try the same page, cutoff and selected receipt again.</p>
      <ReloadPage/>
    </section>
  </main>;
}
