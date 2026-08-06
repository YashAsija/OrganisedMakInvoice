<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/949fe9cf-ad3a-4b9f-9910-bdc22796a665

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

## 🔒 Admin Panel Operations

A completely separate, hidden Admin Panel has been added to this codebase under a customizable, non-obvious route.

### 1. How it Works (Hidden Route)
- The admin pages live inside the dynamic segment `frontend/src/app/[admin_slug]`.
- The slug is configured locally in `frontend/admin_config.json`. Next.js routes match any slug requested, but the code checks if it matches the configured value and throws a `404 Not Found` if it does not, hiding its existence.
- The route and the API are blocked in `robots.txt` automatically.

### 2. Running & Accessing
- By default, the admin route is: `http://localhost:3000/internal-ops-9f3k` (defined in `admin_config.json`).
- Ensure the database tables have been created by running `supabase/migrations/20260804_admin_panel.sql` in your Supabase SQL Editor.

### 3. Environment Configuration
Define these variables in your backend environment:
- `ADMIN_EMAIL`: Email address of the admin.
- `ADMIN_PASSWORD_HASH`: Bcrypt hash of the admin password.
- `ADMIN_JWT_SECRET`: Custom signature secret key.

You can generate a bcrypt password hash using python:
```bash
python -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('YOUR_SECRET_PASSWORD'))"
```

