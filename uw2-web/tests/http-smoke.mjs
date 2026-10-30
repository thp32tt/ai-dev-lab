import assert from "node:assert/strict";

const urls = [
  "/",
  "/app.js",
  "/music-routing.js",
  "/reverse-evidence.js",
  "/api/manifest",
  "/game/KOUKAI2.DAT",
  "/game/MESSAGE.DAT",
];
for (const path of urls) {
  const url = "http://127.0.0.1:18082" + path;
  const response = await fetch(url);
  const bytes = await response.arrayBuffer();
  assert.equal(response.status, 200, `${path} returned HTTP ${response.status}`);
  assert.ok(bytes.byteLength > 0, `${path} must not be empty`);
  console.log(JSON.stringify({
    path, status: response.status,
    type: response.headers.get("content-type"), bytes: bytes.byteLength,
  }));
}
console.log("UW2 web resource/import HTTP smoke: PASS");
