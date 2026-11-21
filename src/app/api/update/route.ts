import { bioFor } from "@/lib/bio"
import { db, fromService, open, type NowPlaying } from "@/lib/shared"
import { client, setBio } from "@/lib/telegram"

export const runtime = "nodejs"
export const maxDuration = 60

/** Telegram flood-limits accounts that change their profile too often; one change in this long at most. */
const GAP_MS = 30_000

type Row = { session: string; original_bio: string; shown_bio: string | null; bio_changed_at: string | null; updated_at: string }

/**
 * From the account service: what a linked listener is playing now (`track`), or null when it stops. Their bio
 * becomes the song, or goes back to what it was. A change that comes too soon after the last waits out the gap,
 * and is dropped if a newer one arrived meanwhile -- so skipping through ten songs is one or two changes, the last.
 */
export async function POST(request: Request) {
  if (!fromService(request)) return new Response("Not the account service.", { status: 401 })
  const body = await request.json().catch(() => ({}))
  const userId = Number(body.userId)
  if (!Number.isInteger(userId) || userId <= 0) return new Response("No user.", { status: 400 })
  const track: NowPlaying | null = body.track && typeof body.track.title === "string" ? body.track : null

  const sql = db()
  // Stamped, so a request that has waited can tell whether a newer one came after it.
  const [row] = (await sql`
    UPDATE telegram_links SET updated_at = clock_timestamp() WHERE user_id = ${userId}
    RETURNING session, original_bio, shown_bio, bio_changed_at, updated_at
  `) as Row[]
  if (!row) return new Response(null, { status: 204 })

  const wanted = track ? bioFor(track) : row.original_bio
  if (wanted === (row.shown_bio ?? row.original_bio)) return new Response(null, { status: 204 })

  const since = row.bio_changed_at ? Date.now() - new Date(row.bio_changed_at).getTime() : Infinity
  if (since < GAP_MS) {
    await new Promise((resolve) => setTimeout(resolve, GAP_MS - since))
    const [latest] = (await sql`SELECT updated_at FROM telegram_links WHERE user_id = ${userId}`) as { updated_at: string }[]
    if (!latest || new Date(latest.updated_at).getTime() !== new Date(row.updated_at).getTime()) {
      return new Response(null, { status: 204 })
    }
  }

  const session = open(row.session)
  if (!session) return new Response("The saved session cannot be read.", { status: 500 })
  const telegram = await client(session)
  try {
    await setBio(telegram, wanted)
    await sql`
      UPDATE telegram_links SET shown_bio = ${track ? wanted : null}, bio_changed_at = now() WHERE user_id = ${userId}
    `
  } catch (error) {
    const code = (error as { errorMessage?: string }).errorMessage ?? ""
    // Signed out from Telegram's own Devices list: the link is gone, so forget it.
    if (code === "AUTH_KEY_UNREGISTERED" || code === "SESSION_REVOKED" || code === "USER_DEACTIVATED") {
      await sql`DELETE FROM telegram_links WHERE user_id = ${userId}`
    } else {
      console.error("Telegram bio", error)
    }
  } finally {
    await telegram.disconnect()
  }
  return new Response(null, { status: 204 })
}
