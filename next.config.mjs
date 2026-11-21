/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // GramJS opens its own TCP connections to Telegram and loads parts of itself at run time: left unbundled.
  serverExternalPackages: ["telegram"],
}
export default nextConfig
