export const D2_TRACKS_PER_SONG = 5;
export const D2_MAX_SONGS = 64;

function u16le(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function normalizeBytes(buffer) {
  if (buffer instanceof Uint8Array) return buffer;
  if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);
  if (ArrayBuffer.isView(buffer)) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  throw new TypeError("D2 music data must be an ArrayBuffer or Uint8Array");
}

export function parseD2SongTable(buffer) {
  const bytes = normalizeBytes(buffer);
  const songs = [];
  let previousMax = 0;
  for (let songIndex = 0; songIndex < D2_MAX_SONGS; songIndex++) {
    const at = songIndex * D2_TRACKS_PER_SONG * 2;
    if (at + D2_TRACKS_PER_SONG * 2 > bytes.length) break;
    const raw = Array.from(
      { length: D2_TRACKS_PER_SONG },
      (_, i) => u16le(bytes, at + i * 2),
    );
    const offsets = raw.filter(Boolean);
    if (!offsets.length) break;
    if (offsets.some(x => x >= bytes.length)) break;
    for (let i = 1; i < offsets.length; i++) {
      if (offsets[i] <= offsets[i - 1]) return songs;
    }
    if (songIndex > 0 && offsets[0] <= previousMax) break;
    previousMax = Math.max(...offsets);
    songs.push({
      index: songIndex,
      tableOffset: at,
      rawOffsets: raw,
      channelOffsets: offsets,
    });
  }
  return songs;
}

export function parseD2Music(buffer) {
  const bytes = normalizeBytes(buffer);
  const songs = parseD2SongTable(bytes);
  return { byteLength: bytes.length, songCount: songs.length, songs };
}

function normalizeManifest(manifest) {
  const tracks = Array.isArray(manifest?.tracks) ? manifest.tracks : [];
  return tracks
    .filter(x => Number.isInteger(x?.index) && typeof x?.file === "string")
    .map(x => ({
      index: x.index,
      file: x.file,
      role: String(x.role ?? ""),
      loop: !!x.loop,
    }))
    .sort((a, b) => a.index - b.index);
}

export class D2MusicPlayer {
  constructor({ volume = 0.65, manifest = null, baseUrl = "./generated/music/" } = {}) {
    this.volume = Math.max(0, Math.min(1, Number(volume) || 0));
    this.baseUrl = baseUrl;
    this.music = null;
    this.track = 0;
    this.desiredPlaying = false;
    this.renderedTracks = normalizeManifest(manifest);
    this.trackMap = new Map(this.renderedTracks.map(x => [x.index, x]));
    this.supported = typeof globalThis.Audio === "function";
    this.audio = this.supported ? new Audio() : null;
    if (this.audio) {
      this.audio.preload = "auto";
      this.audio.volume = this.volume;
    }
    this.sourceTrack = null;
  }

  load(buffer) {
    this.music = parseD2Music(buffer);
    if (this.renderedTracks.length) this.track = this.renderedTracks[0].index;
    else this.track = 0;
    return this.music;
  }

  get songCount() {
    return this.music?.songCount ?? 0;
  }

  get playing() {
    return !!this.audio && !this.audio.paused && !this.audio.ended;
  }

  get rendered() {
    return this.renderedTracks.length > 0;
  }

  state() {
    return {
      supported: this.supported,
      loaded: !!this.music,
      rendered: this.rendered,
      renderer: this.rendered ? "FMDRV.COM→OPL PCM" : "unavailable",
      songCount: this.songCount,
      renderedTrackCount: this.renderedTracks.length,
      track: this.track,
      playing: this.playing,
      desiredPlaying: this.desiredPlaying,
      contextState: this.audio
        ? (this.audio.error ? "error" : "media:" + this.audio.readyState)
        : "unavailable",
      currentTime: this.audio?.currentTime ?? 0,
      volume: this.volume,
    };
  }

  _entry(index = this.track) {
    return this.trackMap.get(index) ?? null;
  }

  _syncSource() {
    if (!this.audio) return false;
    const entry = this._entry();
    if (!entry) {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.sourceTrack = null;
      return false;
    }
    if (this.sourceTrack !== this.track) {
      this.audio.pause();
      this.audio.src = this.baseUrl + entry.file;
      this.audio.loop = entry.loop;
      this.audio.volume = this.volume;
      this.sourceTrack = this.track;
    }
    return true;
  }

  async unlock() {
    if (!this.supported || !this.music || !this.desiredPlaying) return this.state();
    if (!this._syncSource()) return this.state();
    await this.audio.play();
    return this.state();
  }

  async play(track = this.track) {
    this.setTrack(track);
    this.desiredPlaying = true;
    return this.unlock();
  }

  pause() {
    this.desiredPlaying = false;
    this.audio?.pause();
    return this.state();
  }

  async toggle() {
    if (this.desiredPlaying && this.playing) return this.pause();
    return this.play(this.track);
  }

  setTrack(index) {
    const i = Math.trunc(index);
    if (this.trackMap.has(i)) this.track = i;
    else if (this.renderedTracks.length && !this.trackMap.has(this.track)) {
      this.track = this.renderedTracks[0].index;
    }
    this._syncSource();
    return this.state();
  }

  async next(delta = 1) {
    if (!this.renderedTracks.length) return this.state();
    const list = this.renderedTracks.map(x => x.index);
    let p = list.indexOf(this.track);
    if (p < 0) p = 0;
    p = (p + Math.sign(delta || 1) + list.length) % list.length;
    this.setTrack(list[p]);
    this.desiredPlaying = true;
    return this.unlock();
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.audio) this.audio.volume = this.volume;
    return this.state();
  }
}