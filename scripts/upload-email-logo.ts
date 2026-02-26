/**
 * Uploads Logo.png to the email-assets Supabase bucket.
 * Run after migration 049_email_assets_bucket.sql.
 *
 * Usage:
 *   npx tsx scripts/upload-email-logo.ts
 *
 * Then add to .env:
 *   EMAIL_LOGO_URL=https://[PROJECT_REF].supabase.co/storage/v1/object/public/email-assets/Logo.png
 */

import { readFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"

function getProjectRoot(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url))
  let dir = join(currentDir, "..")
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, "package.json"))) return dir
    dir = join(dir, "..")
  }
  return process.cwd()
}

function loadEnv(): void {
  const root = getProjectRoot()
  const envPath = join(root, ".env")
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, "utf8")
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key) process.env[key] = value
  }
}

async function main() {
  loadEnv()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes("placeholder")) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
    process.exit(1)
  }

  const root = getProjectRoot()
  const logoPath = join(root, "public", "assets", "Logo.png")
  if (!existsSync(logoPath)) {
    console.error("Logo not found:", logoPath)
    process.exit(1)
  }

  const supabase = createClient(url, key)
  const fileBuffer = readFileSync(logoPath)

  const { error } = await supabase.storage
    .from("email-assets")
    .upload("Logo.png", fileBuffer, {
      contentType: "image/png",
      upsert: true,
    })

  if (error) {
    console.error("Upload failed:", error.message)
    if (error.message?.includes("Bucket not found") || error.message?.includes("does not exist")) {
      console.error("\nRun the migration first: supabase db push")
      console.error("Or create the bucket manually in Supabase Dashboard: Storage > New Bucket > email-assets (public)")
    }
    process.exit(1)
  }

  const publicUrl = `${url}/storage/v1/object/public/email-assets/Logo.png`
  console.log("Uploaded successfully.")
  console.log("\nAdd to your .env:")
  console.log(`EMAIL_LOGO_URL=${publicUrl}`)
}

main()
