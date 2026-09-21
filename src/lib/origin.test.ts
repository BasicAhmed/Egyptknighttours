import test from "node:test";
import assert from "node:assert/strict";
import { pickOrigin } from "./origin";
const SITE = "https://egyptknight.com";

test("links follow the address the team is really using", () => {
  assert.equal(pickOrigin("egyptknight.com", "https", SITE), "https://egyptknight.com");
  assert.equal(pickOrigin("www.egyptknight.com", null, SITE), "https://www.egyptknight.com");
  assert.equal(pickOrigin("egyptknighttours.vercel.app", "https", SITE), "https://egyptknighttours.vercel.app");
  assert.equal(pickOrigin("egyptknight-git-main-team.vercel.app", null, SITE), "https://egyptknight-git-main-team.vercel.app");
  assert.equal(pickOrigin("localhost:3000", null, SITE), "http://localhost:3000");
  assert.equal(pickOrigin("egyptknight.com", "http", SITE), "https://egyptknight.com"); assert.equal(pickOrigin("egyptknighttours.vercel.app", "http", SITE), "https://egyptknighttours.vercel.app");
});
test("a forged or unknown host can never put another website into a link", () => {
  for (const bad of ["evil.example", "egyptknight.com.evil.example", "evil.example/egyptknight.com", "user@egyptknight.com", "", "  "]) assert.equal(pickOrigin(bad, "https", SITE), SITE, bad);
  assert.equal(pickOrigin(null, null, SITE), SITE); assert.equal(pickOrigin(undefined, "https", SITE), SITE);
});
