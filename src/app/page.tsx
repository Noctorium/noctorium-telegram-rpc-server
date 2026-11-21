import { DASHBOARD } from "@/lib/shared"

export default function Home() {
  return (
    <main>
      <span className="mark">N</span>
      <h1>Noctorium for Telegram</h1>
      <p>
        Shows the song you are playing in Noctorium in your Telegram bio — from your phone, your computer or any device
        signed in to your Noctorium account, with nothing else running.
      </p>
      <p>
        Connect it from <a href={DASHBOARD}>your Noctorium account</a>.
      </p>
    </main>
  )
}
