# Delta production setup guide

This guide connects the **Delta Next.js project in this folder** to GitHub, Vercel, and Supabase PostgreSQL, creates the first admin account, and explains the optional email, image, and rate-limit services.

> **Important:** the live URL previously found, `https://firecracker-festival-guide.stonyrat129.chatgpt.site`, is a separate Sites-hosted site. It is not this Next.js application, and it has no configured database binding. The steps below create a separate Vercel deployment. They do not replace or change that existing Site. Add your own domain to Vercel only after you decide to move it from any existing hosting target.

## What you will need

- A GitHub account, a Vercel account, and a Supabase account.
- Access to this Delta project folder in PowerShell.
- A private password manager to create and store the database password, admin password, and session secret.
- Optional: a domain you control for email sending and a custom website address.

Do not send passwords, API keys, or database URLs in chat. Do not commit `.env`, `.env.local`, or any other file containing real credentials. `.env.example` contains placeholders only.

## Recommended connection layout

| Service | Use |
| --- | --- |
| GitHub | Private source repository and deployment trigger |
| Vercel | Next.js hosting, preview deployments, production URL |
| Supabase PostgreSQL | Product, category, admin, and general-enquiry data |
| Supabase Storage (optional) | Public product catalogue images; admin uploads use a server-only service key |
| Resend (optional) | Email notification for general enquiries |
| Upstash Redis (recommended for production) | Shared contact/login rate limits across serverless instances |

The calculator is browser-local. It does not send selected products to the server. Product-order, checkout, booking, reservation, payment, and delivery features remain absent. Do not enable ordering via an environment variable.

## 1. Create a private GitHub repository and push this project

1. In GitHub, create a new **private** repository, for example `sv-groups-catalogue`. Leave README, `.gitignore`, and license initialization unchecked because this folder already has those files.
2. Open PowerShell in `C:\workspace\Project Workspace\Live Projects\delta`.
3. Initialize Git and push the project (replace the URL with the one GitHub shows for your repository):

   ```powershell
   git init -b main
   git add .
   git commit -m "Initial SV Groups catalogue"
   git remote add origin https://github.com/YOUR_GITHUB_NAME/sv-groups-catalogue.git
   git push -u origin main
   ```

4. If Git asks for your identity, set it locally with your preferred name and email, then repeat the commit:

   ```powershell
   git config user.name "Your Name"
   git config user.email "you@example.com"
   ```

5. Before pushing, check that no secrets are staged. `.gitignore` excludes `.env*` except `.env.example`:

   ```powershell
   git status --short
   git check-ignore .env
   ```

The Vercel Git integration deploys commits to previews and deploys the configured production branch when updated. [Vercel Git deployment guide](https://vercel.com/docs/git)

## 2. Create the Supabase PostgreSQL database

1. In Supabase, create a new project. Save its database password in your password manager. Pick the region closest to your customers where Supabase offers a project region.
2. Wait for the database to finish provisioning.
3. In the project dashboard, choose **Connect** and copy the PostgreSQL connection strings. Do not type the hostname or username yourself; Supabase gives different hosts/usernames for different pooler modes.
4. Set the Vercel runtime value `DATABASE_URL` to the **Transaction pooler** string (port `6543`) because Vercel runs serverless functions. Add `pgbouncer=true` to its query string so Prisma disables prepared statements for the shared transaction pooler. Example shape only:

   ```text
   postgresql://postgres.PROJECT_REF:DB_PASSWORD@POOLER_HOST:6543/postgres?pgbouncer=true
   ```

   If the copied URL already has a `?` query, add `&pgbouncer=true` instead of a second `?`.

5. Set `DIRECT_URL` to the **Direct connection** URL from Supabase for Prisma migrations. Direct connections may need IPv6. If your migration computer cannot reach it, use Supabase's **Session pooler** URL (port `5432`) as `DIRECT_URL` instead. Copy the complete URL Supabase displays and percent-encode reserved characters in the password.

Supabase recommends transaction pooling for serverless traffic and documents the Prisma `pgbouncer=true` option; direct or session connections are appropriate for migration-style work. [Supabase connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres), [Supabase Prisma guide](https://supabase.com/docs/guides/database/prisma)

## 3. Import the project into Vercel

1. In Vercel, choose **Add New → Project** and connect GitHub if prompted.
2. Import the private `sv-groups-catalogue` repository.
3. Keep the project root at `.` (repository root). Framework detection should identify Next.js. Keep the default build command; this project defines `npm run build` as `prisma generate && next build`.
4. Add the required production variables in **Project → Settings → Environment Variables**:

   | Key | Value / handling |
   | --- | --- |
   | `DATABASE_URL` | Supabase Transaction pooler URL, with `pgbouncer=true` |
   | `DIRECT_URL` | Supabase direct URL, or Session pooler URL if direct is unreachable from your migration machine |
   | `SESSION_SECRET` | New random secret, at least 32 characters; generate one using the command below |
   | `NEXT_PUBLIC_SITE_URL` | The Vercel production URL shown after the first deployment, e.g. `https://your-project.vercel.app` |
   | `NEXT_PUBLIC_WHATSAPP_NUMBER` | Optional; country code and number digits only. Leave unset to hide the WhatsApp buttons. |

   Mark database URLs and session secret as sensitive. Add these to **Production** first. For Preview, use a separate non-production database and secrets; do not point public preview deployments at the production database.

5. Generate `SESSION_SECRET` locally in PowerShell, then paste its output into Vercel. Do not commit or share it:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

6. Start the first deployment. After Vercel assigns a `*.vercel.app` URL, set that exact URL as `NEXT_PUBLIC_SITE_URL` in the Production environment, then redeploy so metadata uses the right origin. Vercel environment-variable edits apply to new deployments, not existing ones. [Vercel environment variables](https://vercel.com/docs/environment-variables)

## 4. Apply the database migration and create the admin

Do this from a trusted computer and terminal. These commands change the **production database**. First confirm that `DATABASE_URL` and `DIRECT_URL` point to the intended Supabase project.

1. In a local password manager, create an admin password of at least 16 characters. You choose the admin email and password; this guide does not contain real credentials.
2. Copy `.env.example` to a root `.env` file (PowerShell):

   ```powershell
   Copy-Item .env.example .env
   ```

3. Open `.env` in your editor. Set `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` to the real values. Keep `.env` on your computer only. The root `.env` is ignored by Git and Prisma CLI reads it for migration and seed commands.
4. In the same PowerShell window, run:

   ```powershell
   npm install
   npm run db:generate
   npm run db:deploy
   npm run db:seed
   ```

5. Confirm that `db:deploy` reports the initial migration was applied and `db:seed` does **not** print `Admin not seeded`. The seed creates the admin with a bcrypt-hashed password and creates starter categories. It does not add made-up products or prices.
6. Remove the temporary root `.env` after the migration and seed are complete. Keep real credentials only in your password manager and provider secret settings.
7. Visit `https://YOUR-VERCEL-DOMAIN/admin/login` and sign in with the admin email and password you set. Admin sessions expire after eight hours.

**Existing admin account:** the seed upserts the configured email and updates its bcrypt password hash from the current `ADMIN_PASSWORD`. After changing that value in the ignored local `.env`, rerun `npm run db:seed` to rotate the admin password. Keep the new password private and never put it in `.env.example`.

## 5. Optional: configure enquiry email with Resend

The contact endpoint stores general enquiries in PostgreSQL even if email notifications are not configured. To send notifications:

1. Create a Resend account and add a domain you control.
2. Add the DNS records Resend gives you at your domain DNS provider, then wait until Resend marks the domain verified.
3. Create a Resend API key.
4. Add these Vercel Production environment variables and redeploy:

   - `RESEND_API_KEY` — mark as sensitive.
   - `RESEND_FROM_EMAIL` — a verified sender, e.g. `SV Groups <catalogue@yourdomain.in>`.
   - `ADMIN_NOTIFICATION_EMAIL` — the inbox that receives general enquiry notices.

5. Submit a test general enquiry from `/contact` and verify both the saved enquiry in `/admin` and the message in the receiving inbox. The customer form never sends cart contents.

Use Resend's current domain setup instructions for the DNS records required for your account. [Resend domain verification](https://resend.com/docs/dashboard/domains/introduction)

## 6. Optional: configure product image uploads with Supabase Storage

1. In the same Supabase project, open **Storage** and create a bucket called `product-images`.
2. Set the bucket to **Public** only if product images are intended to be publicly viewable (they are catalogue images). Anyone with an image URL can view files in a public bucket; do not upload private material.
3. In Supabase project settings, copy the project URL and service-role key.
4. Add these Vercel Production variables and redeploy:

   - `SUPABASE_URL` — the project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` — sensitive; server-side only, never use a `NEXT_PUBLIC_` prefix.
   - `SUPABASE_STORAGE_BUCKET` — `product-images`.

5. Sign in to `/admin`, add a product, and upload a small JPEG, PNG, WebP, or AVIF image under 5 MB.

Supabase service-role keys bypass Storage access policies. Keep this key secret. [Supabase bucket access models](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Supabase Storage security](https://supabase.com/docs/guides/storage/security/access-control)

## 7. Recommended for production: shared rate limiting

The app has an in-memory development fallback. Serverless instances do not share memory, so configure Upstash Redis for a shared production limit:

1. Create a Redis database in Upstash.
2. In its **Connect → REST** settings, copy the REST URL and token.
3. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel Production. Mark the token sensitive, then redeploy.
4. Check Vercel logs after submitting a general enquiry and signing in. The code uses Upstash when both variables are present.

Never expose the standard Upstash token in browser code. [Upstash REST connection](https://upstash.com/docs/redis/features/restapi)

## 8. Optional: attach your own domain

Only do this after the Vercel deployment and database are working and you intend the custom domain to serve this Next.js app.

1. In Vercel, open the project **Settings → Domains** and add the domain.
2. Use the exact A/CNAME/TXT values Vercel displays. Add them at the service that currently hosts your DNS; do not copy generic values from an old tutorial.
3. Wait for Vercel to confirm DNS and issue TLS. Set `NEXT_PUBLIC_SITE_URL` to the chosen canonical `https://` address and redeploy.
4. If the domain currently points to another production site, keep that routing until you are ready to switch; DNS changes redirect real visitors.

Vercel displays the required records for the specific project and domain. [Vercel custom-domain setup](https://vercel.com/docs/domains/set-up-custom-domain)

## 9. Final verification checklist

- Open the Vercel production URL. The home page and catalogue load over HTTPS.
- Visit `/catalogue`; the initial database has categories but no products until you add real approved catalogue data.
- Visit `/admin/login`; correct credentials open `/admin`, and incorrect credentials are rejected.
- Add a real category and product in admin; confirm it appears in the public catalogue.
- If Storage is configured, upload an image and verify it renders publicly.
- Submit a general enquiry; confirm it appears in admin. If Resend is configured, confirm the notification arrives.
- Confirm the local price calculator works and that it is not presented as checkout or an order facility.
- Check the Vercel deployment log for runtime errors after these steps.

## Common issues

| Symptom | Check |
| --- | --- |
| Build says `DATABASE_URL` or `DIRECT_URL` is missing | Add both variables to Vercel Production, then redeploy. `prisma generate` still parses the datasource env names during build. |
| Prisma can’t connect during migration | Verify the copied host/username/password; use the direct connection or Session pooler for `DIRECT_URL`; URL-encode special characters in the password. |
| Runtime shows database connection or prepared-statement errors | Use the transaction-pooler `DATABASE_URL` with `pgbouncer=true`; ensure it is the pooler host and port from Supabase Connect. |
| Admin says email/password is wrong | Verify the seed used the same production DB and email; check the seed output; remember reseeding an existing email does not change its password. |
| Enquiry saves but no email arrives | Verify all three Resend variables, sender domain status, spam folder, and Vercel logs. |
| Admin image upload fails | Check the bucket name, project URL, service-role key, bucket public-read setting, and file type/size. |
| Vercel uses old settings after an edit | Start a new deployment after environment variable changes. |

## Official provider references

- [GitHub: create a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
- [Vercel: import and deploy Git repositories](https://vercel.com/docs/git)
- [Vercel: Next.js deployment](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Supabase: connect to PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase: Prisma](https://supabase.com/docs/guides/database/prisma)
- [Vercel: environment variables](https://vercel.com/docs/environment-variables)
