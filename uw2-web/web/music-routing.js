// Browser music routing is deliberately separate from executable evidence.
// Default playback is authorized only where the original executable call path
// and the FMDRV song index have been proven.
import { PROVEN_OPENING_MUSIC } from "./reverse-evidence.js";

export const COMPARISON_MUSIC_TRACKS = Object.freeze({
  town: 19,
  sea: 21,
  runtime: 19,
  preview: PROVEN_OPENING_MUSIC.renderedTrackIndex,
});

export function selectWebMusicRoute(mode, allowApproximate = false) {
  if (mode === "opening") {
    return { track: PROVEN_OPENING_MUSIC.renderedTrackIndex, fidelity: "open-exe-proven" };
  }
  if (!allowApproximate) {
    return { track: null, fidelity: "mapping-unverified" };
  }
  return {
    track: COMPARISON_MUSIC_TRACKS[mode] ?? COMPARISON_MUSIC_TRACKS.town,
    fidelity: "approximate-opt-in",
  };
}
