import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { notifyAdminOfNewRegistration } from "./notifications.service.ts";
import type { EmailMessage } from "../../../engine/email-client.ts";

const realList = process.env.SUPERADMIN_EMAILS;

afterEach(() => {
  if (realList === undefined) delete process.env.SUPERADMIN_EMAILS;
  else process.env.SUPERADMIN_EMAILS = realList;
});

const user = { id: "u1", email: "new@acme.com", name: "New Person", orgId: "org1", role: "manager" };

test("sends a signup alert to everyone on the SUPERADMIN_EMAILS allowlist", () => {
  process.env.SUPERADMIN_EMAILS = "carl@seroteams.com, boss@seroteams.com";
  const sent: EmailMessage[] = [];
  notifyAdminOfNewRegistration(user, (m) => sent.push(m));

  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0]!.to, ["carl@seroteams.com", "boss@seroteams.com"]);
  assert.match(sent[0]!.subject, /New Sero signup/i);
  // The person's name + email must be in the body so the alert is actually useful.
  assert.match(sent[0]!.html, /New Person/);
  assert.match(sent[0]!.html, /new@acme\.com/);
});

test("does nothing when the allowlist is empty", () => {
  process.env.SUPERADMIN_EMAILS = "";
  const sent: EmailMessage[] = [];
  notifyAdminOfNewRegistration(user, (m) => sent.push(m));
  assert.equal(sent.length, 0);
});

test("does nothing when the allowlist is unset", () => {
  delete process.env.SUPERADMIN_EMAILS;
  const sent: EmailMessage[] = [];
  notifyAdminOfNewRegistration(user, (m) => sent.push(m));
  assert.equal(sent.length, 0);
});

test("HTML-escapes the person's name so a stray tag can't break the email", () => {
  process.env.SUPERADMIN_EMAILS = "carl@seroteams.com";
  const sent: EmailMessage[] = [];
  notifyAdminOfNewRegistration({ ...user, name: "Ann <b>Bold</b>" }, (m) => sent.push(m));
  assert.match(sent[0]!.html, /Ann &lt;b&gt;Bold&lt;\/b&gt;/);
});
