# Whispr 🔒 — Temporary Private 1-to-1 Chat Application

> **"Private conversations. No permanent history."**

Whispr is a modern, production-ready, real-time messaging web application inspired by WhatsApp Web, built specifically for strict two-person ephemeral conversations. Two participants connect using a unique room code, exchange messages instantly via Supabase Realtime, and when either participant ends the session, all chat data permanently self-destructs after a 1-hour read-only grace period.

---

## 🌟 Key Features

- **Strict 2-Person Limit:** No group chats, no third participants. Enforced at the PostgreSQL level using atomic row-level locks (`SELECT ... FOR UPDATE`) and database triggers.
- **WhatsApp Web-Inspired UI:** Responsive chat interface with sent/received bubble alignment, timestamps, double checkmarks, real-time typing indicators, online/offline presence indicators, and emoji picker.
- **Anonymous Authentication:** Zero passwords, phone numbers, or emails required. Supabase Anonymous Authentication creates a persistent session across browser refreshes without tracking users.
- **Row Level Security (RLS):** Only authenticated participants of a specific room can read or send messages. Room codes and messages cannot be enumerated or snooped on. Expired conversations become inaccessible the second `expires_at` passes.
- **1-Hour Auto Self-Destruction:** When either participant clicks **End Chat**, message sending is disabled immediately, and a server-side 1-hour expiration countdown begins. After 1 hour, the database cascade-deletes the room, participants, and all messages.
- **Database-Level Scheduled Cleanup (Supabase pg_cron):** Scheduled at the database level (`* * * * *` every minute) using Supabase Cron. 100% compatible with Vercel Hobby (Free) tier without hitting any Vercel cron frequency limitations!
- **Real-Time Delivery:** Instant message delivery, presence detection, and typing events powered by Supabase Realtime channels.
- **Production Ready & Responsive:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui components, Lucide icons, Dark/Light mode.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS with CSS Variables |
| **UI Components** | shadcn/ui, Radix UI primitives, Lucide Icons |
| **Backend & DB** | Supabase (PostgreSQL 15+) |
| **Realtime Engine**| Supabase Realtime (WebSockets) |
| **Authentication**| Supabase Anonymous Auth |
| **Scheduled Jobs**| Supabase Cron (`pg_cron`) — Runs every minute |
| **Deployment** | Vercel (Hobby Free Plan fully supported) |

---

## 📂 Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── cron/
│   │   │       └── cleanup/
│   │   │           └── route.ts         # Optional admin cleanup endpoint
│   │   ├── chat/
│   │   │   └── [roomId]/
│   │   │       └── page.tsx             # Real-time private chat room
│   │   ├── create/
│   │   │   └── page.tsx                 # Create room & generate unique 8-char code
│   │   ├── join/
│   │   │   └── page.tsx                 # Validate & join room by code
│   │   ├── globals.css                  # WhatsApp styling & theme variables
│   │   ├── layout.tsx                   # App layout, font, toaster, theme script
│   │   └── page.tsx                     # Landing page
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatHeader.tsx           # WhatsApp-styled header with peer status & End Chat
│   │   │   ├── ClosedBanner.tsx         # Live countdown timer to permanent deletion
│   │   │   ├── EndChatDialog.tsx        # Destructive confirmation modal
│   │   │   ├── MessageBubble.tsx        # Sent/Received message bubbles
│   │   │   ├── MessageInput.tsx         # Message box, emoji popover & typing dispatcher
│   │   │   ├── MessageList.tsx          # Auto-scrolling list of messages
│   │   │   ├── TypingIndicator.tsx      # Bouncing 3-dot typing animation
│   │   │   └── WaitingPeerCard.tsx      # Prominent code display & share buttons
│   │   ├── ui/                          # Radix / shadcn UI primitives (button, input, dialog, etc.)
│   │   ├── EmojiPickerPopover.tsx       # Dynamic emoji picker
│   │   ├── Navbar.tsx                   # Brand header with theme switch
│   │   ├── Footer.tsx                   # Footer with privacy guarantees
│   │   ├── SetupNotice.tsx              # Banner guiding developer if keys are missing
│   │   └── ThemeToggle.tsx              # Dark/light mode switcher
│   └── lib/
│       ├── supabase/
│       │   ├── client.ts                # Browser Supabase client & anonymous session helper
│       │   └── admin.ts                 # Service role admin client
│       ├── types.ts                     # TypeScript definitions
│       └── utils.ts                     # Helper utilities & room code formatting
├── supabase/
│   ├── schema.sql                       # Complete PostgreSQL schema, triggers, RLS, pg_cron
│   └── migrations/
│       ├── 20240101000000_whispr_schema.sql
│       └── 20240102000000_supabase_cron_cleanup.sql # pg_cron cleanup migration
├── .env.example                         # Environment variable template
└── README.md
```

---

## 🚀 Setup Instructions

### 1. Enable pg_cron in Supabase

1. Open your Supabase project dashboard at [supabase.com](https://supabase.com).
2. Go to **Database** -> **Extensions**.
3. Search for `pg_cron` and toggle it **Enabled** (or it will be enabled automatically by the SQL script).
4. Go to **Authentication** -> **Providers** and ensure **Anonymous Sign-Ins** is toggled **Enabled**.

### 2. Run Database Migration

- Open **SQL Editor** in your Supabase Dashboard.
- Copy the contents of [`supabase/schema.sql`](file:///d:/yashashree-calc/supabase/schema.sql) (or [`supabase/migrations/20240102000000_supabase_cron_cleanup.sql`](file:///d:/yashashree-calc/supabase/migrations/20240102000000_supabase_cron_cleanup.sql)).
- Click **Run**.
- This configures:
  - `rooms`, `participants`, and `messages` tables with `ON DELETE CASCADE`.
  - Database trigger enforcing strict max 2 participants.
  - Row Level Security (RLS) policies.
  - `cleanup_expired_chat_rooms()` function (with secure `SECURITY DEFINER` and restricted permissions).
  - Supabase Cron schedule running `SELECT public.cleanup_expired_chat_rooms();` every minute (`* * * * *`).

### 3. Verify the Supabase Cron Job

Run this query in Supabase SQL Editor:

```sql
SELECT jobid, jobname, schedule, command, active FROM cron.job;
```

You will see:
- `jobname`: `cleanup-expired-chat-rooms`
- `schedule`: `* * * * *`
- `command`: `SELECT public.cleanup_expired_chat_rooms();`
- `active`: `true`

To view execution history:
```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### 4. Configure Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
```

### 5. Run Locally

```bash
npm run dev
```

---

## 🚢 Deploying to Vercel (Hobby Free Plan Compatible)

1. Push this repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: use supabase pg_cron for scheduled cleanup"
   git push origin main
   ```
2. Import the project into **Vercel**.
3. Under **Project Settings -> Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Click **Deploy**.
5. **No Vercel Cron errors!** The application deploys effortlessly on the Vercel Hobby (Free) tier because all scheduled cleanups run inside Supabase PostgreSQL via `pg_cron`.
