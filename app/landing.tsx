import Link from "next/link";
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
        <p className="landing-kicker"><span aria-hidden="true"/>Early alpha · Starting with Anthropic</p>
        <h1 id="landing-title">What’s in a <span>Mouthfolio?</span></h1>
        <p className="landing-intro">A person’s public views on investments, with the dates and sources behind them.</p>
        <p className="landing-start">Start with Anthropic. Explore its reported numbers, see who’s talking about the company, and follow a voice back to what they said.</p>
        <div className="landing-actions"><Link className="landing-primary" href="/companies/anthropic" prefetch={false}>Explore Anthropic <span aria-hidden="true">↗</span></Link><a className="landing-secondary" href={repository}>View the open-source client <span aria-hidden="true">↗</span></a></div>
        <p className="landing-powered">Powered by ASOF Data</p>
        {process.env.MOUTHFOLIO_SERVICE_ONLY !== "1" ? <p className="landing-demo"><Link href="/companies/aster-compute" prefetch={false}>Try the fictional demo <span aria-hidden="true">↗</span></Link><span>No service connection needed.</span></p> : null}
      </section>
      <section id="how-it-works" className="landing-journey" aria-labelledby="journey-title">
        <div className="landing-section-heading"><div><p className="landing-kicker">The idea</p><h2 id="journey-title">People and the investments they talk about.</h2></div><p>What has one person said about different investments? Who has discussed a company or asset you follow?<br/>In this alpha, explore Anthropic and open an author’s remarks about the company.</p></div>
        <figure className="landing-preview" aria-labelledby="preview-caption">
          <div className="preview-bar"><span>Mouthfolio</span><span>Reading Anthropic</span></div>
          <div className="preview-workspace">
            <div className="preview-navigation"><p className="preview-eyebrow">Company</p><p className="preview-company">Anthropic</p><span className="preview-selected">Overview</span><span>Commentary</span><div className="preview-nav-bottom">Financials<br/>Sources</div></div>
            <div className="preview-reading"><p className="preview-eyebrow">Company</p><h3>What did Anthropic report?</h3><p>Reported figures with their periods and sources. Missing evidence stays visible.</p><div className="preview-measures"><span>Revenue <span aria-hidden="true">↗</span></span><span>Cash flow <span aria-hidden="true">↗</span></span><span>Reporting period <span aria-hidden="true">↗</span></span></div><div className="preview-commentary"><p className="preview-eyebrow">Voice</p><h3>Who’s talking about Anthropic?</h3><p>Select an author in Commentary to see their dated remarks about this company.</p><span className="preview-source-label">Source &amp; context <span aria-hidden="true">↗</span></span></div></div>
            <div className="preview-evidence"><p className="preview-eyebrow">Evidence</p><h3>Open the source.</h3><p>Check the original filing or commentary alongside what you’re reading.</p><div className="preview-evidence-fields"><span>Original source</span><span>Publication date</span><span>Evidence available by</span></div><p className="preview-evidence-note">Source context opens on demand in the client.</p></div>
          </div>
          <figcaption id="preview-caption">Illustrative reading flow — not live company data. Explore Anthropic for available evidence and coverage dates.</figcaption>
        </figure>
      </section>
      <section id="alpha" className="landing-alpha" aria-labelledby="alpha-title"><p className="landing-kicker">A focused beginning</p><div><h2 id="alpha-title">An early alpha. An open-source client.</h2><p>Anthropic is our first hosted company. Coverage is partial, and the archive is not a current-news feed. Check the company page for the latest available commentary.</p><p>Mentioning an investment doesn’t tell us whether someone favors it. Even an expressed view doesn’t tell us what they own.</p><a href={`${repository}#early-alpha`}>What is available today <span aria-hidden="true">↗</span></a></div></section>
    </main>
    <footer className="landing-footer"><div><Link href="/" className="landing-brand" prefetch={false}>Mouthfolio<span className="landing-brand-dot" aria-hidden="true">.</span></Link><p>Powered by ASOF Data</p></div><nav aria-label="Project information"><a href="#alpha">Alpha &amp; coverage</a><a href={`${repository}/blob/main/LICENSE`}>Client license</a><a href={`${repository}/blob/main/SECURITY.md`}>Security</a><a href={`${repository}/blob/main/docs/SOURCE_BOUNDARY.md`}>Client &amp; data boundary</a></nav></footer>
  </div>;
}
