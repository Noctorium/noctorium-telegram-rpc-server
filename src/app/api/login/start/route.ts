import { readTicket } from "@/lib/shared"
import { explain, sendCode } from "@/lib/signin"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const userId = readTicket(body.ticket, "connect")
  if (!userId) return Response.json({ error: "This link has expired. Go back to your Noctorium account and press Connect again." }, { status: 401 })
  const phone = typeof body.phone === "string" ? body.phone.replace(/[\s()-]/g, "") : ""
  if (!/^\+?\d{6,16}$/.test(phone)) return Response.json({ error: "Enter your phone number with its country code, like +40 712 345 678." }, { status: 400 })
  try {
    return Response.json({ state: await sendCode(userId, phone) })
  } catch (error) {
    return Response.json({ error: explain(error) }, { status: 400 })
  }
}
