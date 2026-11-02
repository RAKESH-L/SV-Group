# SV Groups catalogue

A responsive Next.js catalogue and indicative price calculator. The calculator is stored in each visitor's browser. There are no product order, checkout, payment, reservation, delivery, or cart-submission routes. General contact enquiries are stored separately and may be emailed to the administrator.

## Architecture

- Next.js App Router, React, TypeScript and Tailwind CSS v4.
- PostgreSQL with Prisma models for admins, categories, products and general enquiries.
- Signed, eight-hour HTTP-only admin sessions; passwords are bcrypt hashed.
- Zod validation on server input. The public enquiry form uses a rate limiter with Upstash Redis when configured and an in-memory development fallback.
- Supabase Storage is used for optional authenticated admin product-image uploads. Resend sends optional enquiry notification email.
- Product-order policy is hard-disabled in `src/lib/order-policy.ts`. `ENABLE_PRODUCT_ORDERS` is documented as false, but changing an environment variable cannot enable any ordering feature; no such endpoint or UI exists.

## Development plan and implemented stages

1. Scaffold the Next.js project, TypeScript configuration and design system.
2. Build the home page, navigation and footer.
3. Build category browsing, search, product details and the catalogue database model.
4. Add local browser price comparison and savings calculations.
5. Add PostgreSQL Prisma schema, initial SQL migration and a development seed.
6. Add secure admin login and dashboard metrics.
7. Add product/category CRUD and optional image upload.
8. Add general enquiries, validation, storage, rate limiting and email notifications.
9. Run type/build checks once dependencies and environment configuration are available.
10. Document Vercel, database, storage, email, domain and operational setup.

Seed data contains starter categories only; it deliberately does not invent product listings or prices. Add real approved catalogue data through the admin dashboard.

## Local setup

For the complete provider setup, production deployment, migration, first-admin creation, and verification walkthrough, see [PRODUCTION_SETUP_GUIDE.md](PRODUCTION_SETUP_GUIDE.md).

Requirements: Node.js 20 or later and a PostgreSQL database (local, Supabase or Neon).

```sh
npm install
cp .env.example .env
```

Set `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET` (at least 32 random characters), `ADMIN_EMAIL`, and `ADMIN_PASSWORD` (at least 12 characters) in `.env`. Prisma CLI reads the root `.env`; Next.js also supports `.env.local`. The secret can be generated with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Then run:

```sh
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Run `npm run typecheck` to check the TypeScript project without connecting to the database.

Open `http://localhost:3000`; the admin area is at `/admin`. For local schema iteration use `npm run db:migrate -- --name describe-change` instead of `db:deploy`.

## Optional services

**Supabase Storage:** create a Supabase project and a `product-images` bucket (or set `SUPABASE_STORAGE_BUCKET`). Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The server keeps the service key private. The current implementation returns public object URLs, so configure the bucket for public reads; do not store sensitive images there. Uploads are limited to JPEG, PNG, WebP or AVIF files under 5 MB.

**Resend:** verify a sending domain and configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `ADMIN_NOTIFICATION_EMAIL`. Enquiries are saved even if notification delivery fails; check server logs and the provider dashboard.

**Rate limiting:** set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for shared rate limiting across serverless instances. The in-memory fallback is only suitable for local development and is not a production rate limit.

Set `NEXT_PUBLIC_SITE_URL` to the canonical site URL. Set `NEXT_PUBLIC_WHATSAPP_NUMBER` to the company's country-code-plus-number digits; the WhatsApp link is omitted when unset.

## Vercel deployment

1. Push this project to the chosen Git provider and import it into Vercel.
2. Create a PostgreSQL project on Supabase or Neon. Configure a pooled `DATABASE_URL` for runtime and a direct, migration-capable `DIRECT_URL` for Prisma migrations.
3. Add all required environment variables in Vercel for Production and Preview environments. Use unique strong `SESSION_SECRET` values and never commit `.env` or `.env.local`.
4. Configure optional Supabase Storage, Resend, and Upstash variables before relying on those services.
5. Deploy. Apply database migrations in the release workflow with `npm run db:deploy`, then run `npm run db:seed` once with the intended admin credentials in a secure environment. Avoid seeding credentials in a public build log.
6. In Vercel project settings, add the custom domain and apply the DNS records Vercel displays. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS domain and redeploy.
7. Confirm the public pages, admin login, image upload, enquiry save/email, and production logs in a non-production deployment before launch.

Vercel build runs `prisma generate && next build`. Do not run schema-changing migrations as a build side effect; run `db:deploy` as an explicit release step.

## Operations and security notes

- Keep dependencies patched and review Vercel runtime logs and Resend/Upstash service dashboards. Configure an error monitor such as Sentry before production if alerting is needed.
- Back up PostgreSQL and periodically test restoration. Restrict database and Supabase project access to the operators who need it.
- Admin provisioning and password rotation use the seed from a trusted terminal. There is no public registration or password reset flow. Running `npm run db:seed` updates the hash for `ADMIN_EMAIL` to the current `ADMIN_PASSWORD` in `.env`.
- Protect the admin account with a unique long password. Rotate the session secret to invalidate existing sessions.
- The fallback in-memory rate limiter does not coordinate across serverless instances; configure Upstash before production.
- Product-order, booking, purchase-request, payment and delivery workflows remain absent and disabled. Any future proposal requires documented review by qualified counsel and the relevant licensing authorities, a separate product decision, and a new security and compliance review. This application does not assess legal permissions.
