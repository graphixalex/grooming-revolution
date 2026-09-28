import test from "node:test";
import assert from "node:assert/strict";
import { salonJson } from "@/lib/salon-response";

test("salon responses omit access tokens at every depth without modifying server records", async () => {
  const salon = Object.freeze({ id: "salon-a", whatsappApiAccessToken: "synthetic-private-token", createdAt: new Date("2026-01-01T00:00:00Z") });
  const response = salonJson({ salon, list: [salon], whatsappApiAccessToken: "another-synthetic-token", ok: true }, { status: 201 });
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.deepEqual(body, { salon: { id: "salon-a", createdAt: "2026-01-01T00:00:00.000Z" }, list: [{ id: "salon-a", createdAt: "2026-01-01T00:00:00.000Z" }], ok: true });
  assert.equal(salon.whatsappApiAccessToken, "synthetic-private-token");
});

test("direct salon, null and error responses retain their public data", async () => {
  assert.deepEqual(await salonJson({ id: "a", whatsappApiAccessToken: "private" }).json(), { id: "a" });
  assert.equal(await salonJson(null).json(), null);
  const error = salonJson({ error: "Non autorizzato" }, { status: 403 });
  assert.equal(error.status, 403);
  assert.deepEqual(await error.json(), { error: "Non autorizzato" });
});
