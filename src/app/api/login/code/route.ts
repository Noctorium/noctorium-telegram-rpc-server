import { explain, openState, signIn } from "@/lib/signin"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const state = openState(body.state)
  if (!state) return Response.json({ error: "This sign-in has expired. Start again." }, { status: 401 })
  const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : ""
  if (code.length < 4) return Response.json({ error: "Enter the code Telegram sent you." }, { status: 400 })
  try {
    const result = await signIn(state, code)
    return Response.json("linked" in result ? { done: result.linked } : { state: result.password, password: true })
  } catch (error) {
    return Response.json({ error: explain(error) }, { status: 400 })
  }
}
