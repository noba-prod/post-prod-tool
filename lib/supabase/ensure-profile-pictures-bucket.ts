import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

export const PROFILE_PICTURES_BUCKET = "profile-pictures"

const PROFILE_PICTURE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/heic",
  "image/heif",
] as const

const PROFILE_PICTURE_SIZE_LIMIT = 5 * 1024 * 1024

let ensureBucketPromise: Promise<void> | null = null

/**
 * Ensures the public profile-pictures bucket exists before upload.
 * Uses service role; safe to call from API routes and server actions.
 */
export async function ensureProfilePicturesBucket(
  adminClient: SupabaseClient<Database>
): Promise<void> {
  if (!ensureBucketPromise) {
    ensureBucketPromise = (async () => {
      const { data: buckets, error: listError } = await adminClient.storage.listBuckets()
      if (listError) {
        console.warn("[ensureProfilePicturesBucket] listBuckets failed:", listError.message)
      }

      const bucketExists = (buckets ?? []).some(
        (bucket) => bucket.id === PROFILE_PICTURES_BUCKET || bucket.name === PROFILE_PICTURES_BUCKET
      )
      if (bucketExists) return

      const { error: createError } = await adminClient.storage.createBucket(
        PROFILE_PICTURES_BUCKET,
        {
          public: true,
          fileSizeLimit: PROFILE_PICTURE_SIZE_LIMIT,
          allowedMimeTypes: [...PROFILE_PICTURE_ALLOWED_MIME_TYPES],
        }
      )

      if (createError && !/already exists|duplicate/i.test(createError.message)) {
        throw createError
      }
    })().catch((error) => {
      ensureBucketPromise = null
      throw error
    })
  }

  await ensureBucketPromise
}
