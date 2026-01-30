<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1vjjuANbt_erw4ZVCTAVU7wVnu9fr08dJ

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Configure environment variables:
   - Copy `.env.example` to `.env.local`
   - Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - (Optional) If you add server-side AI features, set `GEMINI_API_KEY` in `.env.local`
3. Run the app:
   `npm run dev`
