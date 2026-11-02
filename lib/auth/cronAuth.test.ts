import assert from "node:assert/strict";
import { test } from "node:test";
import { isAuthorized } from "@/lib/auth/cronAuth";

const SECRET = "test-secret";

test("accepts the exact bearer token", () => {
  assert.equal(isAuthorized({ authorizationHeader: `Bearer ${SECRET}`, secret: SECRET }), true);
});

test("rejects missing, wrong, wrong-length and non-bearer headers", () => {
  assert.equal(isAuthorized({ authorizationHeader: null, secret: SECRET }), false);
  assert.equal(isAuthorized({ authorizationHeader: "Bearer wrong-secret", secret: SECRET }), false);
  assert.equal(isAuthorized({ authorizationHeader: "Bearer x", secret: SECRET }), false);
  assert.equal(isAuthorized({ authorizationHeader: SECRET, secret: SECRET }), false);
});

test("rejects everything when no secret is configured", () => {
  assert.equal(isAuthorized({ authorizationHeader: "Bearer ", secret: "" }), false);
});
