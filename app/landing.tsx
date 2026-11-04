import Link from "next/link";
import { definition, headline } from "../lib/site-metadata";
import "./landing.css";

const repository = "https://github.com/imweihuang/Mouthfolio";

export function Landing() {
  return <div className="landing">
    <a className="skip-link" href="#introduction">Skip to introduction</a>
    <header className="landing-header">
      <Link href="/" className="landing-brand" prefetch={false}>Mouthfolio<span className="landing-brand-dot" aria-hidden="true">.</span></Link>
      <nav aria-label="Main navigation"><a href="#how-it-works">The idea</a><a href={repository}>Open source <span aria-hidden="true">↗</span></a></nav>
    </header>
    <main id="introduction" tabIndex={-1} className="landing-main">
      <section className="landing-hero" aria-labelledby="landing-title">
        <h1 id="landing-title">{headline}</h1>
        <p className="landing-intro">{definition}</p>
        <div className="landing-actions"><Link className="landing-primary" href="/companies/anthropic" prefetch={false}>Explore Anthropic <span aria-hidden="true">↗</span></Link><a className="landing-secondary" href={repository}>View the open-source client <span aria-hidden="true">↗</span></a></div>
        <p className="landing-powered">Powered by ASOF Data</p>
        {process.env.MOUTHFOLIO_SERVICE_ONLY !== "1" ? <p className="landing-demo"><Link href="/companies/aster-compute" prefetch={false}>Try the fictional demo <span aria-hidden="true">↗</span></Link><span>No service connection needed.</span></p> : null}
      </section>
      <section id="how-it-works" className="landing-journey" aria-labelledby="journey-title">
        <div className="landing-section-heading"><div><p className="landing-kicker">The idea</p><h2 id="journey-title">Two ways to read the record.</h2></div><p>What has one person said about an investment over time? Who else has discussed a company or asset you follow?</p></div>
        <figure className="landing-preview" aria-labelledby="preview-caption">
          <div className="preview-bar"><span>Mouthfolio</span><span>Company and commentary</span></div>
          <div className="preview-workspace">
            <div className="preview-navigation"><p className="preview-eyebrow">Company</p><p className="preview-company">Anthropic</p><span className="preview-selected">Overview</span><span>Commentary</span><div className="preview-nav-bottom">Financials<br/>Sources</div></div>
            <div className="preview-reading"><p className="preview-eyebrow">Company</p><h3>What did the company report?</h3><p>Reported figures with their periods and sources. Missing evidence stays visible.</p><div className="preview-measures"><span>Revenue <span aria-hidden="true">↗</span></span><span>Cash flow <span aria-hidden="true">↗</span></span><span>Reporting period <span aria-hidden="true">↗</span></span></div><div className="preview-commentary"><p className="preview-eyebrow">Voice</p><h3>Who’s talking about it?</h3><p>Select an author in Commentary to see their dated remarks about this company.</p><span className="preview-source-label">Source &amp; context <span aria-hidden="true">↗</span></span></div></div>
            <div className="preview-evidence"><p className="preview-eyebrow">Evidence</p><h3>Open the source.</h3><p>Check the original filing or commentary alongside what you’re reading.</p><div className="preview-evidence-fields"><span>Original source</span><span>Publication date</span><span>Evidence available by</span></div><p className="preview-evidence-note">Look for the date of the source and when it became available.</p></div>
          </div>
          <figcaption id="preview-caption">Illustration of a company page and its sources. <Link href="/voices/jim-cramer?company=anthropic" prefetch={false}>Read Jim Cramer’s remarks about Anthropic <span aria-hidden="true">↗</span></Link></figcaption>
        </figure>
      </section>
      <section id="reading" className="landing-reading" aria-labelledby="reading-title"><p className="landing-kicker">Reading the record</p><div><h2 id="reading-title">What did they actually say?</h2><p>A person can mention an investment without taking a position on it. When they do express a view, the source lets you read it in context. What someone says in public doesn’t tell you what they own.</p><a href={`${repository}#reading-a-company-page`}>How to read a company page <span aria-hidden="true">↗</span></a></div></section>
    </main>
    <footer className="landing-footer"><div><Link href="/" className="landing-brand" prefetch={false}>Mouthfolio<span className="landing-brand-dot" aria-hidden="true">.</span></Link><p>Powered by ASOF Data</p></div><nav aria-label="Project information"><a href="#reading">Reading the record</a><a href={`${repository}/blob/main/LICENSE`}>Client license</a><a href={`${repository}/blob/main/SECURITY.md`}>Security</a><a href={`${repository}/blob/main/docs/SOURCE_BOUNDARY.md`}>Client &amp; data boundary</a></nav></footer>
  </div>;
}
