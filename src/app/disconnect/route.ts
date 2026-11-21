import { Api, client, setBio } from "@/lib/telegram"
import { DASHBOARD, db, open, readTicket } from "@/lib/shared"

export const runtime = "nodejs"
export const maxDuration = 30

/**
 * Disconnect, from the account's dashboard: the bio goes back to what it was, this server's Telegram session is
 * signed out (it disappears from the account's Devices list), and the link is deleted.
 */
export async function GET(request: Request) {
  const userId = readTicket(new URL(request.url).searchParams.get("ticket"), "disconnect")
  if (!userId) return new Response("This link has expired. Press Disconnect again on your Noctorium account.", { status: 401 })
  const sql = db()
  const [row] = (await sql`SELECT session, original_bio, shown_bio FROM telegram_links WHERE user_id = ${userId}`) as {
    session: string
    original_bio: string
    shown_bio: string | null
  }[]
  if (row) {
    const session = open(row.session)
    if (session) {
      const telegram = await client(session).catch(() => null)
      if (telegram) {
        try {
          if (row.shown_bio) await setBio(telegram, row.original_bio)
          await telegram.invoke(new Api.auth.LogOut())
        } catch (error) {
          console.error("Telegram disconnect", error)
        } finally {
          await telegram.disconnect().catch(() => {})
        }
      }
    }
    await sql`DELETE FROM telegram_links WHERE user_id = ${userId}`
  }
  return Response.redirect(DASHBOARD, 303)
}
