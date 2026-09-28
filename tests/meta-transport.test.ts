import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { sendMetaText } from "@/lib/meta-cloud";
import { encryptMetaToken } from "@/lib/meta-token";
import { getTransport } from "@/lib/whatsapp-transport";
import { prisma } from "@/lib/prisma";
import { initLinkedGatewaySession, getLinkedGatewayQr, disconnectLinkedGatewaySession, syncConnectionWithGateway } from "@/lib/whatsapp-connection";
const key = "ab".repeat(32);
function stubDelegate(target: object, name: string, implementation: () => Promise<unknown>) {
  const delegate = target as Record<string, unknown>;
  const original = delegate[name];
  const fn = mock.fn(implementation);
  delegate[name] = fn;
  return { mock: fn.mock, restore: () => { delegate[name] = original; } };
}
test("Meta transport uses exactly the requested salon credentials, no global fallback", async () => {
  const previous = process.env.META_TOKEN_ENCRYPTION_KEY; process.env.META_TOKEN_ENCRYPTION_KEY = key;
  try {
    const lookups: string[] = [], requests: string[] = [];
    const get = async (id: string) => { lookups.push(id); return id === "salon-b" ? {
      whatsappApiEnabled: true, whatsappApiPhoneNumberId: "222", whatsappApiVersion: "v26.0",
      whatsappApiAccessToken: encryptMetaToken("token-b", id, key),
      whatsappConnection: { providerType: "META_EMBEDDED", status: "CONNECTED" },
    } : null; };
    const request: typeof fetch = async (url, init) => {
      requests.push(String(url)); assert.equal(new Headers(init?.headers).get("authorization"), "Bearer token-b");
      assert.equal(JSON.parse(String(init?.body)).type, "text");
      return Response.json({ messages: [{ id: "wamid.b" }] });
    };
    assert.equal((await sendMetaText({ salonId: "salon-b", phone: "+390123456789", text: "hello" }, get, request)).ok, true);
    assert.equal((await sendMetaText({ salonId: "missing", phone: "+390123456789", text: "hello" }, get, request)).ok, false);
    assert.deepEqual(lookups, ["salon-b", "missing"]); assert.deepEqual(requests, ["https://graph.facebook.com/v26.0/222/messages"]);
  } finally { if (previous === undefined) delete process.env.META_TOKEN_ENCRYPTION_KEY; else process.env.META_TOKEN_ENCRYPTION_KEY = previous; }
});
test("Meta never sends plaintext, wrong-provider, disabled or corrupt credentials", async () => {
  for (const [providerType, status, token] of [["META_EMBEDDED", "CONNECTED", "plaintext"], ["LINKED_SESSION", "CONNECTED", "plaintext"], ["META_EMBEDDED", "DISABLED", "plaintext"]]) {
    const result = await sendMetaText({ salonId: "b", phone: "+390123456789", text: "hello" }, async () => ({
      whatsappApiEnabled: true, whatsappApiPhoneNumberId: "222", whatsappApiVersion: "v26.0", whatsappApiAccessToken: token,
      whatsappConnection: { providerType, status },
    }), async () => { throw Error("network must never be reached"); });
    assert.equal(result.ok, false);
  }
});
test("Linked transport preserves Production gateway payload and accepted result", async () => {
  const previous = process.env.WHATSAPP_LINKED_GATEWAY_URL;
  process.env.WHATSAPP_LINKED_GATEWAY_URL = "https://gateway.test";
  const calls: { url: string; body: unknown }[] = [];
  const stub = mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init.body)) });
    return Response.json({ accepted: true, externalId: "linked-123", providerStatus: "accepted" });
  });
  try {
    const result = await getTransport("LINKED_SESSION").send({ salonId: "salon-a", messageId: "m", recipientPhone: "+390123456789", messageText: "original text", metadata: { a: 1 } });
    assert.equal(result.accepted, true);
    assert.deepEqual(calls, [{ url: "https://gateway.test/session/salon-a/send", body: { number: "+390123456789", message: "original text", messageId: "m", metadata: { a: 1 } } }]);
    assert.equal(getTransport("META_EMBEDDED").providerType, "META_EMBEDDED");
    assert.equal(getTransport("LEGACY_META").providerType, "LEGACY_META");
  } finally { stub.mock.restore(); if (previous === undefined) delete process.env.WHATSAPP_LINKED_GATEWAY_URL; else process.env.WHATSAPP_LINKED_GATEWAY_URL = previous; }
});
test("QR init/get/disconnect and sync with Meta never call gateway or update connection", async () => {
  const lookup = stubDelegate(prisma.whatsAppConnection, "findUnique", async () => ({ id: "c", salonId: "b", providerType: "META_EMBEDDED", status: "CONNECTED" }));
  const write = stubDelegate(prisma.whatsAppConnection, "update", async () => { throw Error("no writes"); });
  const network = mock.method(globalThis, "fetch", async () => { throw Error("no gateway"); });
  try {
    for (const action of [initLinkedGatewaySession, getLinkedGatewayQr, disconnectLinkedGatewaySession]) {
      const result = await action("b"); assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.code, "META_PROVIDER_ACTIVE");
    }
    assert.equal((await syncConnectionWithGateway("b")).connection.providerType, "META_EMBEDDED");
    assert.equal(network.mock.callCount(), 0); assert.equal(write.mock.callCount(), 0);
  } finally { lookup.restore(); write.restore(); network.mock.restore(); }
});
test("QR init with Linked still calls the baseline gateway", async () => {
  const previous = process.env.WHATSAPP_LINKED_GATEWAY_URL; process.env.WHATSAPP_LINKED_GATEWAY_URL = "https://gateway.test";
  const lookup = stubDelegate(prisma.whatsAppConnection, "findUnique", async () => ({ id: "c", salonId: "a", providerType: "LINKED_SESSION", status: "DISCONNECTED" }));
  const network = mock.method(globalThis, "fetch", async () => Response.json({ success: true }));
  try { assert.equal((await initLinkedGatewaySession("a")).ok, true); assert.equal(network.mock.callCount(), 1); }
  finally { lookup.restore(); network.mock.restore(); if (previous === undefined) delete process.env.WHATSAPP_LINKED_GATEWAY_URL; else process.env.WHATSAPP_LINKED_GATEWAY_URL = previous; }
});

test("full META adapter resolves the requested salon and decrypts only for Graph", async () => {
  const previous = process.env.META_TOKEN_ENCRYPTION_KEY; process.env.META_TOKEN_ENCRYPTION_KEY = key;
  let salonRequested = "";
  const original = prisma.salon.findUnique;
  prisma.salon.findUnique = (async (args: { where: { id: string } }) => {
    salonRequested = args.where.id;
    return { whatsappApiEnabled: true, whatsappApiPhoneNumberId: "222", whatsappApiVersion: "v26.0",
      whatsappApiAccessToken: encryptMetaToken("token-b", args.where.id, key),
      whatsappConnection: { providerType: "META_EMBEDDED", status: "CONNECTED" } };
  }) as unknown as typeof prisma.salon.findUnique;
  const network = mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(String(url), "https://graph.facebook.com/v26.0/222/messages");
    assert.equal(new Headers(init.headers).get("authorization"), "Bearer token-b");
    return Response.json({ messages: [{ id: "wamid.b" }] });
  });
  try {
    const result = await getTransport("META_EMBEDDED").send({ salonId: "salon-b", messageId: "m", recipientPhone: "+390123456789", messageText: "hello" });
    assert.equal(result.accepted, true); assert.equal(result.externalId, "wamid.b"); assert.equal(salonRequested, "salon-b");
  } finally { prisma.salon.findUnique = original; network.mock.restore(); if (previous === undefined) delete process.env.META_TOKEN_ENCRYPTION_KEY; else process.env.META_TOKEN_ENCRYPTION_KEY = previous; }
});
test("full LEGACY adapter preserves existing plaintext credential behavior", async () => {
  const lookup = stubDelegate(prisma.salon, "findUnique", async () => ({
    whatsappApiEnabled: true, whatsappApiPhoneNumberId: "333", whatsappApiAccessToken: "legacy-token", whatsappApiVersion: "v23.0",
  }));
  const network = mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(String(url), "https://graph.facebook.com/v23.0/333/messages");
    assert.equal(new Headers(init.headers).get("authorization"), "Bearer legacy-token");
    return Response.json({ messages: [{ id: "wamid.legacy" }] });
  });
  try {
    assert.equal((await getTransport("LEGACY_META").send({ salonId: "legacy", messageId: "m", recipientPhone: "+390123456789", messageText: "hello" })).accepted, true);
  } finally { lookup.restore(); network.mock.restore(); }
});
