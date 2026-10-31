// Generated from mouthfolio-research.v0.4.schema.json. Do not edit.
export type Company = {
  "id": string;
  "name": string;
  "context": CompanyContext;
};

export type Voice = {
  "id": string;
  "name": string;
};

export type Period = {
  "label": string;
  "start": string;
  "end": string;
};

export type Receipt = {
  "id": string;
  "source_id": string;
  "snapshot_id": string;
  "title": string;
  "locator": string;
  "published_at": string;
  "ingested_at": string;
  "available_at": string;
  "content_sha256": string;
  "display_policy": "excerpt" | "link_only";
  "excerpt": string | null;
  "url": string | null;
  "summary": ReceiptSummary | null;
};

export type Observation = {
  "id": string;
  "version_id": string;
  "label": string;
  "amount": string | null;
  "missing_reason": string | null;
  "unit": string;
  "period": Period;
  "available_at": string;
  "receipt_id": string;
  "revision_kind": "initial" | "correction";
  "supersedes": string | null;
  "basis": string;
};

export type Question = {
  "id": string;
  "version_id": string;
  "company_id": string;
  "title": string;
  "finding": string;
  "available_at": string;
  "edition_date": string;
  "receipt_ids": Array<string>;
};

export type AttributedView = {
  "id": string;
  "version_id": string;
  "voice_id": string;
  "company_id": string;
  "statement": string;
  "published_at": string;
  "available_at": string;
  "receipt_id": string;
  "conditions": string | null;
  "horizon": string | null;
  "supersedes": string | null;
};

export type Coverage = {
  "state": "complete" | "partial";
  "note": string;
};

export type Mention = {
  "id": string;
  "version_id": string;
  "voice_id": string;
  "company_id": string;
  "published_at": string;
  "available_at": string;
  "receipt_id": string;
};

export type ReceiptSummary = {
  "id": string;
  "version_id": string;
  "text": string;
  "generated_by": "ai";
  "capture_observed_at": string;
  "available_at": string;
  "framing": "summary_from_asof_capture" | "summary_current_source_live";
};

export type ProductFact = {
  "id": string;
  "version_id": string;
  "disclosed_on": string;
  "available_at": string;
  "receipt_id": string;
  "revision_kind": "initial" | "correction";
  "supersedes": string | null;
  "kind": "product";
  "name": string;
};

export type DeliveryFact = {
  "id": string;
  "version_id": string;
  "disclosed_on": string;
  "available_at": string;
  "receipt_id": string;
  "revision_kind": "initial" | "correction";
  "supersedes": string | null;
  "kind": "delivery_channel";
  "channel": "consumption_based_access" | "subscription";
};

export type ListingApplicationFact = {
  "id": string;
  "version_id": string;
  "disclosed_on": string;
  "available_at": string;
  "receipt_id": string;
  "revision_kind": "initial" | "correction";
  "supersedes": string | null;
  "kind": "listing_application";
  "venue": string;
  "proposed_symbol": string;
};

export type CompanyContext = {
  "status": "available" | "unavailable" | "revoked";
  "facts": Array<ProductFact | DeliveryFact | ListingApplicationFact>;
};

export type MouthfolioResearch = {
  "schema_version": "asof.mouthfolio.research.v0.4";
  "data_mode": "synthetic" | "authorized";
  "status": "ready" | "no_record_found" | "revoked" | "unavailable";
  "as_of": string;
  "window": "all";
  "company": Company;
  "coverage": Coverage;
  "questions": Array<Question>;
  "voices": Array<Voice>;
  "views": Array<AttributedView>;
  "observations": Array<Observation>;
  "receipts": Array<Receipt>;
  "mentions": Array<Mention>;
};
