import assert from "node:assert/strict";
import { test } from "node:test";
import { assertSafeFeedUrl, FeedFetchError, isPrivateAddress } from "./fetchFeed";

test("özel ve döngü IPv4 aralıkları reddedilir", () => {
  for (const ip of [
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254", // bulut metadata servisi — en kritik olanı
    "0.0.0.0",
    "100.64.0.1",
    "224.0.0.1",
  ]) {
    assert.equal(isPrivateAddress(ip), true, `${ip} özel sayılmalı`);
  }
});

test("herkese açık IPv4 adresleri kabul edilir", () => {
  for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "192.169.0.1", "213.14.1.1"]) {
    assert.equal(isPrivateAddress(ip), false, `${ip} açık sayılmalı`);
  }
});

test("IPv6 döngü, link-local ve gömülü IPv4 reddedilir", () => {
  assert.equal(isPrivateAddress("::1"), true);
  assert.equal(isPrivateAddress("fe80::1"), true);
  assert.equal(isPrivateAddress("fd00::1"), true);
  assert.equal(isPrivateAddress("::ffff:10.0.0.1"), true);
  assert.equal(isPrivateAddress("2606:4700::1111"), false);
});

test("IP olmayan girdi güvensiz sayılır", () => {
  assert.equal(isPrivateAddress("bir sey"), true);
  assert.equal(isPrivateAddress(""), true);
});

const rejects = async (url: string) =>
  assert.rejects(() => assertSafeFeedUrl(url), FeedFetchError, `${url} reddedilmeliydi`);

test("desteklenmeyen şemalar reddedilir", async () => {
  await rejects("file:///etc/passwd");
  await rejects("ftp://ornek.com/stok.xml");
  await rejects("gopher://ornek.com/");
  await rejects("bu bir url degil");
});

test("özel ağa doğrudan IP ile gidilemez", async () => {
  await rejects("http://127.0.0.1/stok.xml");
  await rejects("http://169.254.169.254/latest/meta-data/");
  await rejects("http://[::1]/stok.xml");
  await rejects("http://192.168.1.10:8080/stok.xml");
});

test("standart dışı portlar reddedilir", async () => {
  await rejects("http://8.8.8.8:6379/");
  await rejects("http://8.8.8.8:22/");
});

test("herkese açık adres kabul edilir", async () => {
  const url = await assertSafeFeedUrl("https://1.1.1.1/stok.xml");
  assert.equal(url.hostname, "1.1.1.1");
  assert.equal(url.protocol, "https:");
});
