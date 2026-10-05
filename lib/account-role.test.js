import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAccountRole } from "./account-role.js";

test("the account service recognizes only an explicit admin role", () => {
  assert.equal(normalizeAccountRole("admin"), "admin");
  assert.equal(normalizeAccountRole("Admin"), "admin");
  assert.equal(normalizeAccountRole("user"), "user");
  assert.equal(normalizeAccountRole("owner"), "user");
  assert.equal(normalizeAccountRole(undefined), "user");
});
