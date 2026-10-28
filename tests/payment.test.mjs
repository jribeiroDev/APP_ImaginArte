import assert from "node:assert/strict";
import test from "node:test";
import { paidCentsFor } from "../src/lib/payment.ts";

test("calculates paid cents for each payment status", () => {
  assert.equal(paidCentsFor("pending", 1200), 0);
  assert.equal(paidCentsFor("paid", 1200), 1200);
  assert.equal(paidCentsFor("refunded", 1200), 0);
  assert.equal(paidCentsFor("notpaidyet", 1200, 5.25), 525);
});

test("rejects partial payments outside the order total", () => {
  for (const amount of [undefined, 0, -1, 12, 13, NaN, Infinity]) {
    assert.equal(paidCentsFor("notpaidyet", 1200, amount), null);
  }
});
