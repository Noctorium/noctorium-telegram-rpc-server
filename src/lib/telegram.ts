import { Api, TelegramClient } from "telegram"
import { StringSession } from "telegram/sessions/index.js"

/** A GramJS client for one account: a session saved earlier, or none to start signing in. */
export async function client(session = ""): Promise<TelegramClient> {
  const apiId = Number(process.env.TELEGRAM_API_ID)
  const apiHash = process.env.TELEGRAM_API_HASH
  if (!apiId || !apiHash) throw new Error("TELEGRAM_API_ID and TELEGRAM_API_HASH are not set (from my.telegram.org).")
  const telegram = new TelegramClient(new StringSession(session), apiId, apiHash, { connectionRetries: 2 })
  telegram.setLogLevel("error" as never)
  await telegram.connect()
  return telegram
}

export const saved = (telegram: TelegramClient) => telegram.session.save() as unknown as string

export async function currentBio(telegram: TelegramClient): Promise<string> {
  const full = await telegram.invoke(new Api.users.GetFullUser({ id: new Api.InputUserSelf() }))
  return full.fullUser.about ?? ""
}

export async function setBio(telegram: TelegramClient, about: string): Promise<void> {
  await telegram.invoke(new Api.account.UpdateProfile({ about }))
}

export { Api }
