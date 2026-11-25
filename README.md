# Hyundai Manual AI Assistant

A Retrieval-Augmented Generation (RAG) web application that lets users sign in, upload Hyundai vehicle manual PDFs, index their contents, and ask grounded questions in chat.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Database & Auth:** Supabase (Auth + Postgres)
- **AI / Embeddings:** Gemini API
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## Local Setup

1. Clone the repository:
   ```bash
   git clone [https://github.com/ThokalaSathya/Hyundai_AI_Assistant.git](https://github.com/ThokalaSathya/Hyundai_AI_Assistant.git)
   cd Hyundai_AI_Assistant
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env.local` in the project root and add your keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   GEMINI_API_KEY=your_gemini_api_key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

## Deployment (Vercel + Supabase)

- Push changes to `main` on GitHub and import the repository into Vercel.
- Add all `.env.local` variables to Vercel (**Settings -> Environment Variables**).
- Add your live Vercel URL (`https://<your-app>.vercel.app`) to **Supabase -> Authentication -> URL Configuration** (**Site URL** and **Redirect URLs**) if using redirect/OAuth/reset flows.