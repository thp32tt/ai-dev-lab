export const D2_TRACKS_PER_SONG = 5;
export const D2_MAX_SONGS = 64;
export const D2_DEFAULT_BPM = 120;

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

function commandWidth(byte) {
  // The Korean KOEI OPL stream mixes single-byte state commands with a few
  // command+argument forms. These widths are deliberately conservative:
  // unknown high-bit commands are skipped as one byte and can never become
  // note events.
  if (byte === 0xf0 || byte === 0xf2 || byte === 0xf4) return 2;
  return 1;
}

export function decodeD2Channel(buffer, start, end) {
  const bytes = normalizeBytes(buffer);
  const limit = Math.min(bytes.length, Math.max(start, end));
  const events = [];
  let i = Math.max(0, start);

  while (i < limit) {
    const byte = bytes[i];
    if (byte === 0xff) break;

    if (byte >= 0xf0) {
      i += commandWidth(byte);
      continue;
    }
    if (byte >= 0x70) {
      i++;
      continue;
    }
    if (i + 2 >= limit) break;

    const pitch = byte;
    const ticks = bytes[i + 1];
    const expression = bytes[i + 2];

    // Note/rest records in this driver are compact triples:
    // pitch, duration ticks, expression/gate.  Keep admission strict enough
    // that state-command operands do not become long bogus notes.
    if (ticks > 0 && ticks <= 0xc0 && expression <= 0x40) {
      events.push({
        pitch,
        ticks,
        expression,
        sourceOffset: i,
        rest: pitch === 0,
      });
      i += 3;
      continue;
    }
    i++;
  }
  return events;
}

export function parseD2Music(buffer) {
  const bytes = normalizeBytes(buffer);
  const songs = parseD2SongTable(bytes);
  const allPointers = [...new Set(
    songs.flatMap(song => song.channelOffsets),
  )].sort((a, b) => a - b);

  const parsedSongs = songs.map(song => {
    const channels = song.channelOffsets.map((start, channelIndex) => {
      const p = allPointers.indexOf(start);
      const end = p >= 0 && p + 1 < allPointers.length
        ? allPointers[p + 1]
        : bytes.length;
      return {
        index: channelIndex,
        start,
        end,
        events: decodeD2Channel(bytes, start, end),
      };
    });
    return { ...song, channels };
  });

  return {
    byteLength: bytes.length,
    songCount: parsedSongs.length,
    songs: parsedSongs,
  };
}

function midiHz(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function safeAudioContext() {
  return globalThis.AudioContext || globalThis.webkitAudioContext || null;
}

export class D2MusicPlayer {
  constructor({ bpm = D2_DEFAULT_BPM, volume = 0.16 } = {}) {
    this.bpm = Math.max(40, Math.min(240, Number(bpm) || D2_DEFAULT_BPM));
    this.volume = Math.max(0, Math.min(1, Number(volume) || 0));
    this.music = null;
    this.track = 0;
    this.desiredPlaying = false;
    this.context = null;
    this.master = null;
    this.voices = [];
    this.states = [];
    this.timer = null;
    this.lastMs = 0;
    this.supported = !!safeAudioContext();
  }

  load(buffer) {
    this.music = parseD2Music(buffer);
    this.track = Math.min(this.track, Math.max(0, this.music.songCount - 1));
    this._resetStates();
    return this.music;
  }

  get songCount() {
    return this.music?.songCount ?? 0;
  }

  get playing() {
    return !!this.timer && this.desiredPlaying;
  }

  state() {
    return {
      supported: this.supported,
      loaded: !!this.music,
      songCount: this.songCount,
      track: this.track,
      playing: this.playing,
      desiredPlaying: this.desiredPlaying,
      contextState: this.context?.state ?? "uninitialized",
      volume: this.volume,
    };
  }

  async unlock() {
    if (!this.supported || !this.music?.songCount) return this.state();
    if (!this.context) this._createAudio();
    if (this.context.state === "suspended") await this.context.resume();
    if (this.desiredPlaying) this._startScheduler();
    return this.state();
  }

  async play(track = this.track) {
    this.setTrack(track);
    this.desiredPlaying = true;
    await this.unlock();
    return this.state();
  }

  pause() {
    this.desiredPlaying = false;
    this._stopScheduler();
    this._silence();
    return this.state();
  }

  async toggle() {
    if (this.desiredPlaying) return this.pause();
    return this.play(this.track);
  }

  setTrack(index) {
    if (!this.music?.songCount) return this.state();
    const count = this.music.songCount;
    this.track = ((Math.trunc(index) % count) + count) % count;
    this._resetStates();
    return this.state();
  }

  async next(delta = 1) {
    this.setTrack(this.track + Math.trunc(delta || 1));
    if (this.desiredPlaying) await this.unlock();
    return this.state();
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.02);
    }
    return this.state();
  }

  _createAudio() {
    const Ctx = safeAudioContext();
    if (!Ctx) return;
    this.context = new Ctx();
    this.master = this.context.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.context.destination);

    const wave = ["sine", "triangle", "square", "sawtooth"];
    this.voices = Array.from({ length: 4 }, (_, i) => {
      const carrier = this.context.createOscillator();
      const gain = this.context.createGain();
      const mod = this.context.createOscillator();
      const modDepth = this.context.createGain();

      carrier.type = wave[i % wave.length];
      mod.type = "sine";
      gain.gain.value = 0;
      modDepth.gain.value = 5 + i * 2;

      mod.connect(modDepth);
      modDepth.connect(carrier.frequency);
      carrier.connect(gain);
      gain.connect(this.master);
      carrier.start();
      mod.start();
      return { carrier, gain, mod, modDepth };
    });
  }

  _resetStates() {
    const channels = this.music?.songs?.[this.track]?.channels ?? [];
    this.states = Array.from({ length: 4 }, (_, i) => ({
      events: channels[i]?.events ?? [],
      index: 0,
      remainingMs: 0,
    }));
    this.lastMs = 0;
    this._silence();
  }

  _silence() {
    if (!this.context) return;
    for (const voice of this.voices) {
      voice.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.01);
    }
  }

  _startScheduler() {
    if (this.timer || !this.context || !this.music?.songCount) return;
    this.lastMs = performance.now();
    this.timer = setInterval(() => this._tick(), 24);
    this._tick();
  }

  _stopScheduler() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.lastMs = 0;
  }

  _tick() {
    if (!this.context || !this.desiredPlaying) return;
    const now = performance.now();
    const elapsed = this.lastMs ? Math.min(250, now - this.lastMs) : 0;
    this.lastMs = now;
    const msPerTick = 60000 / this.bpm / 24;

    this.states.forEach((state, channelIndex) => {
      if (!state.events.length) return;
      state.remainingMs -= elapsed;
      let guard = 0;
      while (state.remainingMs <= 0 && guard++ < 16) {
        const event = state.events[state.index];
        state.index = (state.index + 1) % state.events.length;
        state.remainingMs += Math.max(1, event.ticks) * msPerTick;
        this._applyEvent(channelIndex, event);
      }
    });
  }

  _applyEvent(channelIndex, event) {
    const voice = this.voices[channelIndex];
    if (!voice || !this.context) return;
    const t = this.context.currentTime;
    if (event.rest || event.pitch < 8 || event.pitch > 108) {
      voice.gain.gain.setTargetAtTime(0, t, 0.006);
      return;
    }

    const hz = midiHz(event.pitch);
    const expression = Math.max(1, Math.min(32, event.expression || 12));
    const level = 0.025 + (expression / 32) * 0.045;
    voice.carrier.frequency.setTargetAtTime(hz, t, 0.004);
    voice.mod.frequency.setTargetAtTime(hz * (channelIndex % 2 ? 3 : 2), t, 0.004);
    voice.modDepth.gain.setTargetAtTime(4 + expression * 0.45, t, 0.008);
    voice.gain.gain.setTargetAtTime(level, t, 0.006);
  }
}