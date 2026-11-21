"use client"

import { useState } from "react"

type Step = "phone" | "code" | "password"

/** The three steps of signing Telegram in: phone number, the code Telegram sends, and the 2FA password if set. */
export default function ConnectForm({ ticket }: { ticket: string }) {
  const [step, setStep] = useState<Step>("phone")
  const [state, setState] = useState("")
  const [value, setValue] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    const [path, body] =
      step === "phone" ? ["/api/login/start", { ticket, phone: value }]
        : step === "code" ? ["/api/login/code", { state, code: value }]
          : ["/api/login/password", { state, password: value }]
    try {
      const reply = await fetch(path as string, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      const answer = await reply.json()
      if (answer.error) return setError(answer.error)
      if (answer.done) return window.location.assign(answer.done)
      setState(answer.state)
      setValue("")
      setStep(answer.password ? "password" : "code")
    } catch {
      setError("Could not reach the server. Try again.")
    } finally {
      setBusy(false)
    }
  }

  const label = step === "phone" ? "Your phone number, with its country code" : step === "code" ? "The code Telegram just sent you" : "Your Telegram password (two-step verification)"
  return (
    <form onSubmit={submit}>
      <label htmlFor="value">{label}</label>
      <input
        id="value"
        autoFocus
        key={step}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        type={step === "password" ? "password" : step === "phone" ? "tel" : "text"}
        inputMode={step === "code" ? "numeric" : undefined}
        autoComplete={step === "phone" ? "tel" : step === "code" ? "one-time-code" : "current-password"}
        placeholder={step === "phone" ? "+40 712 345 678" : undefined}
        required
      />
      {error && <div className="error" role="alert">{error}</div>}
      <button disabled={busy}>{busy ? "One moment…" : step === "phone" ? "Send me a code" : step === "code" ? "Connect" : "Connect"}</button>
    </form>
  )
}
