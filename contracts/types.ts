// Generated from mouthfolio-research.v0.1.schema.json. Do not edit.
export type Company = {
  "id": string;
  "name": string;
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

export type MouthfolioResearch = {
  "schema_version": "asof.mouthfolio.research.v0.1";
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
};
