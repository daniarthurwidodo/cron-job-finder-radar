import assert from "node:assert/strict";
import { test } from "node:test";
import { formDataToQuery } from "@/lib/dashboard/formQuery";

test("drops empty and whitespace-only fields", () => {
  const formData = new FormData();
  formData.set("q", "   ");
  formData.set("country", "");
  formData.set("status", "new");
  assert.equal(formDataToQuery(formData), "status=new");
});

test("trims values", () => {
  const formData = new FormData();
  formData.set("q", "  engineer ");
  assert.equal(formDataToQuery(formData), "q=engineer");
});

test("returns an empty string for an empty form", () => {
  assert.equal(formDataToQuery(new FormData()), "");
});
