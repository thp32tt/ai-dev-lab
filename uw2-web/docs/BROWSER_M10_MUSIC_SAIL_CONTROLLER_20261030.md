# Browser M10 — D2 music, continuous sailing, and controller refresh

Date: 2026-10-30 KST

## Result

The browser port now has a first playable music/sailing/controller integration built from the user's Korean DOS assets.

### D2.MML browser music

- User artifact `D2.MML`: 27,866 bytes.
- User artifact `FMDRV.COM`: 5,162 bytes and identifies itself as KOEI's AD-LIB/OPL-II Sound Driver 3.12.
- The D2 header was parsed as 22 monotonic song groups with up to four active channel pointers plus the zero terminator slot.
- First group: `0x462,0x4c8,0x5af,0x5d8,0`.
- Song 15 has three active pointers; song 21 ends at `0x5b1d,0x5fff,0x64c6,0x685e`.
- `web/music.js` reads the original D2 stream and schedules extracted note/rest events through Web Audio.
- Current parser regression: 22 songs and 1,591 admitted first-pass note/rest events.
- Firefox validation reached `AudioContext.state=running`, browser scheduler `playing=true`, and track switching worked.

Fidelity boundary:
- This is original-`D2.MML`-driven playback, not substituted MIDI/audio.
- The current command admission and oscillator/modulator timbre are a first-pass browser renderer.
- It is **not yet bit-exact FMDRV.COM command semantics or OPL-II register/timbre emulation**.
- Opening/town/sea mode track selections are provisional until MAIN.EXE's exact song-routing calls are traced.

### Continuous sailing

- Existing Korean fleet-speed, WINDCUR current, 60-subunit X/Y accumulation and 20-minute ticks are retained.
- New AUTO/G control repeatedly advances original 20-minute sea ticks.
- AUTO stops on a coast block rather than repeatedly driving into land.
- AUTO can be toggled from the web controller and exposes latched state.
- Crossing midnight while at sea now consumes one day's water/food from every ship using the already reconstructed crew/provision rule.
- Firefox validation from João's Danzig save:
  - turn east, AUTO: ticks `0 -> 3` while latched;
  - stop AUTO: tick count stays 3;
  - 72 manual 20-minute ticks: 1522-07-06 -> 1522-07-07;
  - ship0 water/food `279/379 -> 264/364` for 15 crew;
  - ship1 `749/1049 -> 724/1024` for 25 crew;
  - zero stores stay clamped at zero.

### Web controller refresh

- A/B placement no longer depends on transform offsets.
- Adds current mode and D2 music status line.
- Adds AUTO button, BGM toggle, previous/next D2 track buttons.
- AUTO is disabled outside sea mode and visually latched while active.
- P/Port Call is disabled unless an actual nearby port is detected; when available it displays the nearby port name.
- Firefox 500px-width validation: viewport=500, document scrollWidth=500, body scrollWidth=500. No horizontal page scrolling.

## Material source

Primary feature commit:
`9113b9147cfda88d8fc74b677eb00d68ee84823a`

Files:
- `web/app.js`
- `web/music.js`
- `web/web-controller.js`
- `web/index.html`
- `web/style.css`
- `tests/music.test.mjs`

The user's original game assets remain outside Git.
