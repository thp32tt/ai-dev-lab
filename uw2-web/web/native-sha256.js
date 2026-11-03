// SHA-256 for browser-native original data and checkpoints.
// Uses WebCrypto on secure origins and the same FIPS 180-4 SHA-256 algorithm
// locally when LAN HTTP does not expose crypto.subtle. Never skips hashing.
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const rotr = (x, n) => (x >>> n) | (x << (32 - n));
const initial = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
                 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

export function sha256Software(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('SHA-256 requires Uint8Array');
  if (!Number.isSafeInteger(bytes.byteLength) || bytes.byteLength > 512 * 1024 * 1024)
    throw new RangeError('SHA-256 source exceeds safe browser limit');
  const h = initial.slice();
  const schedule = new Uint32Array(64);
  function block(buf, pos) {
    for (let i = 0; i < 16; i++) {
      const p = pos + i * 4;
      schedule[i] = ((buf[p] << 24) | (buf[p + 1] << 16) | (buf[p + 2] << 8) | buf[p + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const a = schedule[i - 15], b = schedule[i - 2];
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3);
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10);
      schedule[i] = (schedule[i - 16] + s0 + schedule[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, v] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (v + S1 + ch + K[i] + schedule[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      v = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    for (const [i, val] of [a,b,c,d,e,f,g,v].entries()) h[i] = (h[i] + val) >>> 0;
  }
  const full = Math.floor(bytes.length / 64) * 64;
  for (let pos = 0; pos < full; pos += 64) block(bytes, pos);
  const rest = bytes.length - full;
  const tail = new Uint8Array(rest + 9 <= 64 ? 64 : 128);
  tail.set(bytes.subarray(full));
  tail[rest] = 0x80;
  const view = new DataView(tail.buffer);
  const bits = bytes.length * 8;
  view.setUint32(tail.length - 8, Math.floor(bits / 2 ** 32), false);
  view.setUint32(tail.length - 4, bits >>> 0, false);
  for (let pos = 0; pos < tail.length; pos += 64) block(tail, pos);
  return h.map(x => x.toString(16).padStart(8, '0')).join('');
}

export async function sha256Hex(bytes, {cryptoApi = globalThis.crypto} = {}) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('SHA-256 requires Uint8Array');
  if (cryptoApi?.subtle?.digest) {
    return hex(new Uint8Array(await cryptoApi.subtle.digest('SHA-256', bytes)));
  }
  return sha256Software(bytes);
}
