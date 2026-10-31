import { ResearchLink } from "./research-link";
import type { CompanyContext } from "../../contracts/types.v0.4";
import { companyFactText, disclosureDate } from "../../lib/company-orientation";
import type { CompanyFact } from "../../lib/company-orientation";
import { companySectionUrl } from "../../lib/navigation";
import type { JourneyContext } from "../../lib/navigation";

export function CompanyOrientation({ profile, context }: { profile?: CompanyContext; context: JourneyContext }) {
  if (!profile) return null;
  if (profile.status !== "available") return <p className="company-orientation-unavailable" data-testid="company-orientation-unavailable">
    {profile.status === "revoked" ? "Company background is no longer available for display." : "Company background is unavailable at this cutoff."}
  </p>;
  const dates = [...new Set(profile.facts.map(fact => fact.disclosed_on))];
  const commonDate = dates.length === 1 ? dates[0] : null;
  const factsOf = (kind: CompanyFact["kind"]) => profile.facts.filter(fact => fact.kind === kind);
  const sourceLink = (fact: CompanyFact) => <ResearchLink key={fact.version_id} prefetch={false} scroll={false}
    href={companySectionUrl({ ...context, receipt: fact.receipt_id }, "overview")} data-receipt={fact.receipt_id}
    aria-label={`Source for ${companyFactText(fact)} Disclosed ${disclosureDate(fact.disclosed_on)}${fact.revision_kind === "correction" ? ". Corrected fact" : ""}`}>
    {companyFactText(fact)} <span aria-hidden="true">↗</span>
    {fact.revision_kind === "correction" ? <small>Corrected</small> : null}
    {!commonDate ? <small>Disclosed {disclosureDate(fact.disclosed_on)}</small> : null}
  </ResearchLink>;
  const products = factsOf("product"), channels = factsOf("delivery_channel"), listings = factsOf("listing_application");
  return <div className="company-orientation" data-testid="company-orientation" role="region" aria-label="Company disclosures">
    <p className="company-orientation-date">Company disclosures{commonDate ? <> · {disclosureDate(commonDate)}</> : null}</p>
    <dl>
      {products.length ? <><dt>Products</dt><dd className="company-fact-links">{products.map(sourceLink)}</dd></> : null}
      {channels.length ? <><dt>Access</dt><dd className="company-fact-links">{channels.map(sourceLink)}</dd></> : null}
      {listings.length ? <><dt>Listing application</dt><dd className="company-listing-facts">{listings.map(fact => <div key={fact.version_id}>
        {sourceLink(fact)}<small>As disclosed {disclosureDate(fact.disclosed_on)}. This does not establish current listing status.</small>
      </div>)}</dd></> : null}
    </dl>
  </div>;
}
