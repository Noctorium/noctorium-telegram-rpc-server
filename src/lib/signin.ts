import { computeCheck } from "telegram/Password.js"
import type { TelegramClient } from "telegram"
import { Api, client, currentBio, saved } from "./telegram.ts"
import { db, DASHBOARD, open, seal } from "./shared.ts"

/**
 * Signing a Telegram account in, a step at a time: the phone number, the code Telegram sends, then the 2FA
 * password if there is one. What the steps share -- the half-made session and who is signing in -- travels to the
 * browser and back sealed (see seal), so the server keeps nothing until the account is linked. The phone number,
 * code and password go to Telegram and are never stored.
 */

type State = { u: number; s: string; phone: string; hash: string; e: number }

const STEP_SECONDS = 15 * 60

export const sealState = (state: Omit<State, "e">) => seal(JSON.stringify({ ...state, e: Math.floor(Date.now() / 1000) + STEP_SECONDS }))

export function openState(value: unknown): State | null {
  if (typeof value !== "string") return null
  const plain = open(value)
  if (!plain) return null
  const state = JSON.parse(plain) as State
  return state.e * 1000 > Date.now() ? state : null
}

/** What Telegram's errors mean, in words. */
export function explain(error: unknown): string {
  const code = (error as { errorMessage?: string })?.errorMessage ?? ""
  if (code === "PHONE_NUMBER_INVALID") return "That phone number is not one Telegram knows. Include the country code, like +40."
  if (code === "PHONE_CODE_INVALID") return "That code is not right. Check the latest message from Telegram."
  if (code === "PHONE_CODE_EXPIRED") return "That code has expired. Start again for a new one."
  if (code === "PASSWORD_HASH_INVALID") return "That password is not right."
  if (code.startsWith("FLOOD_WAIT")) return "Telegram asks to wait a while before trying again."
  console.error("Telegram sign-in", error)
  return "Telegram did not accept that. Try again."
}

export async function sendCode(userId: number, phone: string): Promise<string> {
  const telegram = await client()
  try {
    const sent = await telegram.invoke(new Api.auth.SendCode({
      phoneNumber: phone,
      apiId: Number(process.env.TELEGRAM_API_ID),
      apiHash: process.env.TELEGRAM_API_HASH!,
      settings: new Api.CodeSettings({}),
    }))
    if (!("phoneCodeHash" in sent)) throw new Error("Telegram signed this number in without a code")
    return sealState({ u: userId, s: saved(telegram), phone, hash: sent.phoneCodeHash })
  } finally {
    await telegram.disconnect()
  }
}

/** The code: links the account, or asks for the 2FA password next. */
export async function signIn(state: State, code: string): Promise<{ linked: string } | { password: string }> {
  const telegram = await client(state.s)
  try {
    try {
      await telegram.invoke(new Api.auth.SignIn({ phoneNumber: state.phone, phoneCodeHash: state.hash, phoneCode: code }))
    } catch (error) {
      if ((error as { errorMessage?: string }).errorMessage === "SESSION_PASSWORD_NEEDED") {
        return { password: sealState({ ...state, s: saved(telegram) }) }
      }
      throw error
    }
    return { linked: await link(telegram, state.u) }
  } finally {
    await telegram.disconnect()
  }
}

export async function checkPassword(state: State, password: string): Promise<string> {
  const telegram = await client(state.s)
  try {
    const settings = await telegram.invoke(new Api.account.GetPassword())
    await telegram.invoke(new Api.auth.CheckPassword({ password: await computeCheck(settings, password) }))
    return await link(telegram, state.u)
  } finally {
    await telegram.disconnect()
  }
}

/** Keeps the signed-in session, sealed, with the bio the listener has now, to put back when the music stops. */
async function link(telegram: TelegramClient, userId: number): Promise<string> {
  const me = (await telegram.getMe()) as Api.User
  const name = me.username ? `@${me.username}` : [me.firstName, me.lastName].filter(Boolean).join(" ") || "Telegram"
  const bio = await currentBio(telegram)
  await db()`
    INSERT INTO telegram_links (user_id, telegram_user_id, telegram_name, session, original_bio)
    VALUES (${userId}, ${String(me.id)}, ${name}, ${seal(saved(telegram))}, ${bio})
    ON CONFLICT (user_id) DO UPDATE SET telegram_user_id = EXCLUDED.telegram_user_id, telegram_name = EXCLUDED.telegram_name,
      session = EXCLUDED.session, original_bio = EXCLUDED.original_bio, shown_bio = NULL, updated_at = now()
  `
  return DASHBOARD
}
