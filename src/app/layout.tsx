import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Noctorium for Telegram",
  description: "Shows the song you are playing in Noctorium in your Telegram bio.",
}

const css = `
:root { color-scheme: dark; --bg: #0b0a10; --card: #17151f; --line: #2a2735; --text: #f2eeff; --muted: #a39db5; --accent: #b47cff; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.55 Inter, system-ui, sans-serif; }
main { max-width: 440px; margin: 0 auto; padding: 56px 20px; }
h1 { font-size: 28px; margin: 12px 0 8px; letter-spacing: -0.02em; }
p { color: var(--muted); margin: 0 0 16px; }
.mark { display: inline-grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; background: #b47cff26; color: var(--accent); font-weight: 700; }
form { display: grid; gap: 12px; margin-top: 20px; }
label { font-size: 14px; color: var(--muted); }
input { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--line); background: var(--card); color: var(--text); font: inherit; }
input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
button { padding: 12px 16px; border: 0; border-radius: 10px; background: var(--accent); color: #0b0a10; font: inherit; font-weight: 700; cursor: pointer; }
button:disabled { opacity: .6; cursor: default; }
.error { color: #ff8a8a; font-size: 14px; }
.note { font-size: 13px; color: var(--muted); border-top: 1px solid var(--line); margin-top: 28px; padding-top: 16px; }
a { color: var(--accent); }
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <style>{css}</style>
        {children}
      </body>
    </html>
  )
}
