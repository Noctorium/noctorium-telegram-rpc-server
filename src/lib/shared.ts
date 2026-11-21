import { neon, type NeonQueryFunction } from "@neondatabase/serverless"
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto"

/**
 * What this server shares with the Noctorium account service (Noctorium-Service, src/lib/rpc.ts): its database,
 * the tickets it signs to say who a user is, and the secret it calls /api/update with.
 */

export const SERVICE = "telegram"
export const DASHBOARD = process.env.SERVICE_DASHBOARD_URL ?? "https://service.noctorium.xyz/dashboard"

let connection: NeonQueryFunction<false, false> | null = null
export function db(): NeonQueryFunction<false, false> {
  if (connection) return connection
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set; use the same database as the account service.")
  return (connection = neon(url))
}

function rpcSecret(): string {
  const value = process.env.RPC_SECRET
  if (!value || value.length < 32) throw new Error("RPC_SECRET is missing or too short.")
  return value
}

/** Only the account service, which holds RPC_SECRET, may say what somebody is playing. */
export function fromService(request: Request): boolean {
  const given = Buffer.from(request.headers.get("authorization") ?? "")
  const expected = Buffer.from(`Bearer ${rpcSecret()}`)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

/** The Noctorium user a ticket from the account service names, if it is genuine, unexpired and for this purpose. */
export function readTicket(ticket: string | null, purpose: "connect" | "disconnect", now = Date.now()): number | null {
  const [payload, signature] = (ticket ?? "").split(".")
  if (!payload || !signature) return null
  const expected = Buffer.from(createHmac("sha256", rpcSecret()).update(`noctorium-rpc-ticket:${payload}`).digest("base64url"))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const { u, s, p, e } = JSON.parse(Buffer.from(payload, "base64url").toString())
    if (s !== SERVICE || p !== purpose || typeof e !== "number" || e * 1000 < now) return null
    return Number.isInteger(u) && u > 0 ? u : null
  } catch {
    return null
  }
}

function key(): Buffer {
  const value = Buffer.from(process.env.RPC_ENCRYPTION_KEY ?? "", "base64")
  if (value.length !== 32) throw new Error("RPC_ENCRYPTION_KEY must be 32 bytes, base64.")
  return value
}

/** AES-256-GCM: what is kept in the database, or handed to the browser between sign-in steps, is unreadable without the key. */
export function seal(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key(), iv)
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url")
}

export function open(sealed: string): string | null {
  try {
    const raw = Buffer.from(sealed, "base64url")
    const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12))
    decipher.setAuthTag(raw.subarray(12, 28))
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8")
  } catch {
    return null
  }
}

export type NowPlaying = { title: string; artist: string }
