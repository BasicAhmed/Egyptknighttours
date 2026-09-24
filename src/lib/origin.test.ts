import test from "node:test";
import assert from "node:assert/strict";
import { pickOrigin } from "./origin";
const SITE = "https://egyptknight.com";

test("links always use the real domain, whatever address the request came in on", () => {
  assert.equal(pickOrigin("egyptknight.com", "https", SITE), "https://egyptknight.com");
  assert.equal(pickOrigin("www.egyptknight.com", null, SITE), "https://www.egyptknight.com");
  assert.equal(pickOrigin("localhost:3000", null, SITE), "http://localhost:3000");
  assert.equal(pickOrigin("egyptknight.com", "http", SITE), "https://egyptknight.com");
});
test("a Vercel deployment address, a forged host, or an unknown host can never put the wrong address into a link", () => {
  for (const bad of ["egyptknighttours.vercel.app", "egyptknight-git-main-team.vercel.app", "evil.example", "egyptknight.com.evil.example", "evil.example/egyptknight.com", "user@egyptknight.com", "", "  "]) assert.equal(pickOrigin(bad, "https", SITE), SITE, bad);
  assert.equal(pickOrigin(null, null, SITE), SITE); assert.equal(pickOrigin(undefined, "https", SITE), SITE);
});
