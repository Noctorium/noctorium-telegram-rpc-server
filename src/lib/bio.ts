import type { NowPlaying } from "./shared.ts"

/** Telegram's limit for a bio without Premium. */
export const BIO_LIMIT = 70

/** The bio while a song plays: "🎵 Title — Artist", shortened with an ellipsis to fit Telegram's 70 characters. */
export function bioFor(track: NowPlaying): string {
  const full = track.artist ? `🎵 ${track.title} — ${track.artist}` : `🎵 ${track.title}`
  const chars = Array.from(full)
  return chars.length <= BIO_LIMIT ? full : `${chars.slice(0, BIO_LIMIT - 1).join("").trimEnd()}…`
}
