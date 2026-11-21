import { checkPassword, explain, openState } from "@/lib/signin"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const state = openState(body.state)
  if (!state) return Response.json({ error: "This sign-in has expired. Start again." }, { status: 401 })
  if (typeof body.password !== "string" || !body.password) return Response.json({ error: "Enter your Telegram password." }, { status: 400 })
  try {
    return Response.json({ done: await checkPassword(state, body.password) })
  } catch (error) {
    return Response.json({ error: explain(error) }, { status: 400 })
  }
}
