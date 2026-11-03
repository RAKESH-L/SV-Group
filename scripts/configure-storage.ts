import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { SUPPORTED_RASTER_IMAGE_TYPES } from "../src/lib/image-signature";

loadEnvConfig(process.cwd());

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) in your private .env first.");
  process.exit(1);
}
if (!publicUrl || !anonKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or publishable key) in your private .env first.");
  process.exit(1);
}
if (publicUrl && publicUrl !== url) {
  console.error("SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL must point to the same project.");
  process.exit(1);
}
if (publicUrl && !anonKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_ANON_KEY to the public anon/publishable key for this project.");
  process.exit(1);
}
if (bucket !== "product-images") {
  console.error("This setup command only manages the product-images bucket.");
  process.exit(1);
}

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
async function main() {
  const { data: buckets, error: listError } = await client.storage.listBuckets();
  if (listError) {
    console.error("Could not inspect Supabase Storage. Check the project URL and service-role key.");
    process.exit(1);
  }

  const existing = buckets.find((item) => item.name === bucket);
  const options = {
    public: true,
    fileSizeLimit: 15 * 1024 * 1024,
    allowedMimeTypes: SUPPORTED_RASTER_IMAGE_TYPES,
  };
  const result = existing
    ? await client.storage.updateBucket(bucket, options)
    : await client.storage.createBucket(bucket, options);

  if (result.error) {
    console.error(`Could not configure the ${bucket} bucket. Check the Supabase project limits and Storage permissions.`);
    process.exit(1);
  }

  console.log(`Supabase Storage bucket ${bucket} is configured for public reads, 15 MB maximum, supported raster source formats, and normalized WebP product images.`);
}

main().catch(() => {
  console.error("Could not configure Supabase Storage.");
  process.exit(1);
});
