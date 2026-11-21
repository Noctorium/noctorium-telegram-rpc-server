import { DASHBOARD, readTicket } from "@/lib/shared"
import ConnectForm from "./form"

export const dynamic = "force-dynamic"

export default async function Connect({ searchParams }: { searchParams: Promise<{ ticket?: string }> }) {
  const { ticket } = await searchParams
  const valid = readTicket(ticket ?? null, "connect") !== null
  return (
    <main>
      <span className="mark">N</span>
      <h1>Connect Telegram</h1>
      {valid ? (
        <>
          <p>While you play music in Noctorium, your Telegram bio shows the song — like “🎵 One More Time — Daft Punk”. When the music stops, your own bio comes back.</p>
          <ConnectForm ticket={ticket!} />
          <p className="note">
            To change your bio, Noctorium signs in to your Telegram as a new device, which you will see in Telegram under
            Settings › Devices. It only ever changes your bio. Your phone number, code and password go straight to
            Telegram and are not stored; the session is kept encrypted. Disconnect it any time from your Noctorium
            account, or end the session in Telegram&apos;s Devices list.
          </p>
        </>
      ) : (
        <p>
          This link has expired. Go back to <a href={DASHBOARD}>your Noctorium account</a> and press Connect again.
        </p>
      )}
    </main>
  )
}
