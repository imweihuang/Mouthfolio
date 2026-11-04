import test from "node:test";
import assert from "node:assert/strict";
import { siteMetadata } from "../lib/site-metadata.ts";

test("metadata keeps indexing disabled with or without a configured public origin", () => {
  for (const basePath of ["", "/mouthfolio"]) {
    const unconfigured = siteMetadata(undefined, basePath);
    assert.equal(unconfigured.metadataBase, undefined);
    assert.equal(unconfigured.openGraph?.images, undefined);
    for (const metadata of [unconfigured, siteMetadata("https://example.com", basePath)]) {
      assert.deepEqual(metadata.robots, { index: false, follow: false });
      assert.equal(metadata.alternates, undefined, "No misleading global canonical on research pages");
    }
    const configured = siteMetadata("https://example.com", basePath);
    assert.deepEqual(configured.twitter?.images, [`https://example.com${basePath}/social-preview`]);
  }
});

test("public metadata configuration rejects paths, credentials and unsafe origins", () => {
  for (const value of ["http://example.com", "https://user:password@example.com", "https://example.com/path", "https://example.com?query=1", "https://example.com#fragment", "invalid"]) {
    assert.throws(() => siteMetadata(value));
  }
  assert.throws(() => siteMetadata("https://example.com", "/other"));
});
