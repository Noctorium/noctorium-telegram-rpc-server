import assert from "node:assert/strict"
import { createHmac, randomBytes } from "node:crypto"
import { test } from "node:test"

const SECRET = "a-test-rpc-secret-that-is-long-enough-to-pass"

async function load() {
  process.env.RPC_SECRET = SECRET
  process.env.RPC_ENCRYPTION_KEY = randomBytes(32).toString("base64")
  return { ...(await import("../src/lib/shared.ts")), ...(await import("../src/lib/bio.ts")) }
}

/** A ticket made exactly as the account service makes them (Noctorium-Service, src/lib/rpc.ts). */
function serviceTicket(user: number, service: string, purpose: string, expires: number) {
  const payload = Buffer.from(JSON.stringify({ u: user, s: service, p: purpose, e: expires })).toString("base64url")
  return `${payload}.${createHmac("sha256", SECRET).update(`noctorium-rpc-ticket:${payload}`).digest("base64url")}`
}

test("the bio is the song, and fits Telegram's 70 characters", async () => {
  const { bioFor, BIO_LIMIT } = await load()
  assert.equal(bioFor({ title: "One More Time", artist: "Daft Punk" }), "🎵 One More Time — Daft Punk")
  assert.equal(bioFor({ title: "Untitled", artist: "" }), "🎵 Untitled")
  const long = bioFor({ title: "A very long title ".repeat(6), artist: "Somebody" })
  assert.equal(Array.from(long).length, BIO_LIMIT)
  assert.ok(long.endsWith("…"))
})

test("sealed sessions open again, and only with the key", async () => {
  const { seal, open } = await load()
  const sealed = seal("1BAAOMTQ5LjE1NC4xNjcuNTEAUA")
  assert.ok(!sealed.includes("1BAAOMTQ5"), "the session is readable in the database")
  assert.equal(open(sealed), "1BAAOMTQ5LjE1NC4xNjcuNTEAUA")
  assert.equal(open(sealed.slice(0, -2) + "AA"), null, "a tampered seal opened")
})

test("tickets from the account service are read, for Telegram and their purpose only", async () => {
  const { readTicket } = await load()
  const later = Math.floor(Date.now() / 1000) + 600
  assert.equal(readTicket(serviceTicket(7, "telegram", "connect", later), "connect"), 7)
  assert.equal(readTicket(serviceTicket(7, "discord", "connect", later), "connect"), null)
  assert.equal(readTicket(serviceTicket(7, "telegram", "disconnect", later), "connect"), null)
  assert.equal(readTicket(serviceTicket(7, "telegram", "connect", 1000), "connect"), null, "an expired ticket worked")
})

test("only the account service may send updates", async () => {
  const { fromService } = await load()
  const asked = (auth?: string) => new Request("https://x/api/update", { method: "POST", headers: auth ? { authorization: auth } : {} })
  assert.equal(fromService(asked(`Bearer ${SECRET}`)), true)
  assert.equal(fromService(asked("Bearer guess")), false)
  assert.equal(fromService(asked()), false)
})
