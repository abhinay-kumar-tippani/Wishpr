# Whispr 🔒 — Temporary Private 1-to-1 Chat Application

> **"Private conversations. No permanent history."**

Whispr is a modern, production-ready, real-time messaging web application inspired by WhatsApp Web, built specifically for strict two-person ephemeral conversations. Two participants connect using a unique room code, exchange messages instantly via Supabase Realtime, and when either participant ends the session, all chat data permanently self-destructs after a 1-hour read-only grace period.

---

## 🌟 Key Features

- **Strict 2-Person Limit:** No group chats, no third participants. Enforced at the PostgreSQL level using atomic row-level locks (`SELECT ... FOR UPDATE`) and database triggers.
- **WhatsApp Web-Inspired UI:** Responsive chat interface with sent/received bubble alignment, timestamps, double checkmarks, real-time typing indicators, online/offline presence indicators, and emoji picker.
- **Anonymous Authentication:** Zero passwords, phone numbers, or emails required. Supabase Anonymous Authentication creates a persistent session across browser refreshes without tracking users.
- **Row Level Security (RLS):** Only authenticated participants of a specific room can read or send messages. Room codes and messages cannot be enumerated or snooped on.
- **1-Hour Auto Self-Destruction:** When either participant clicks **End Chat**, message sending is disabled immediately, and a server-side 1-hour expiration countdown begins. After 1 hour, the database cascade-deletes the room, participants, and all messages.
- **Real-Time Delivery:** Instant message delivery, presence detection, and typing events powered by Supabase Realtime channels.
- **Production Ready & Responsive:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui components, Lucide icons, Dark/Light mode, and Vercel-ready cron configurations.

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
| **Scheduled Jobs**| Supabase `pg_cron` / Vercel Cron (`vercel.json`) |
| **Deployment** | Vercel |

---

## 📂 Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── cron/
│   │   │       └── cleanup/
│   │   │           └── route.ts         # Server-side cron endpoint for permanent data deletion
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
│       │   └── admin.ts                 # Service role admin client (cron endpoint only)
│       ├── types.ts                     # TypeScript definitions
│       └── utils.ts                     # Helper utilities & room code formatting
├── supabase/
│   ├── schema.sql                       # Complete PostgreSQL schema, triggers, RLS & RPCs
│   └── migrations/
│       └── 20240101000000_whispr_schema.sql
├── .env.example                         # Environment variable template
├── vercel.json                          # Vercel deployment & cron job definition
└── README.md
```

---

## 🚀 Setup Instructions

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd yashashree-calc
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. **Enable Anonymous Sign-Ins:**
   - In your Supabase Dashboard, navigate to **Authentication** -> **Providers**.
   - Scroll to **Anonymous Sign-Ins** and toggle it **Enabled**.
3. **Run the Database Migration:**
   - Open your Supabase Dashboard -> **SQL Editor**.
   - Copy the entire contents of [`supabase/schema.sql`](file:///d:/yashashree-calc/supabase/schema.sql).
   - Click **Run**. This will create:
     - `rooms`, `participants`, and `messages` tables
     - Cascading foreign keys (`ON DELETE CASCADE`)
     - Database triggers enforcing max 2 participants
     - Row Level Security (RLS) policies
     - Atomic RPC functions: `create_room`, `join_room`, `end_chat`, `delete_expired_rooms`, `heartbeat_presence`
     - Realtime publication subscriptions on `messages`, `rooms`, and `participants`

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Backend Cron / Scheduled Cleanup (Service Role Key)
# Found in Supabase Dashboard -> Project Settings -> API -> service_role
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key

# Cron Authorization Secret (Optional, for protecting /api/cron/cleanup)
CRON_SECRET=your-random-cron-secret-token

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security & Concurrency Design

### 1. Atomic Two-Person Room Enforcement
To prevent race conditions where three people simultaneously enter a room:
- `join_room` executes:
  ```sql
  SELECT * FROM rooms WHERE room_code = ... FOR UPDATE;
  ```
- An explicit row lock serializes join requests.
- A secondary PostgreSQL database trigger (`trg_max_two_participants`) runs `BEFORE INSERT ON participants` and aborts if `COUNT(*) >= 2`.

### 2. Row Level Security (RLS)
- **Rooms Table:** Only authenticated users who are registered participants in `participants` can view the room record.
- **Messages Table:**
  - `SELECT`: Only users registered in `participants` for the room can read messages.
  - `INSERT`: Caller must be a registered participant in `participants` AND `rooms.status` must equal `'active'`.
  - `UPDATE` & `DELETE`: Blocked by default.
- **Room Enumeration Blocked:** Non-participants cannot list or search rooms.

### 3. Automatic Chat Expiration & Deletion
- When either participant clicks **End Chat**:
  - The room status updates to `'closed'`.
  - `closed_at` is set to `now()`.
  - `expires_at` is set to `now() + interval '1 hour'`.
  - Message input is disabled immediately for both participants.
  - Both participants see a live countdown banner: *"Permanent Deletion in MM:SS"*.
- **Permanent Deletion:**
  - Scheduled via `delete_expired_rooms()`:
    ```sql
    DELETE FROM rooms WHERE (status = 'closed' AND expires_at <= now());
    ```
  - Because `participants` and `messages` have `ON DELETE CASCADE` foreign keys, deleting the room permanently wipes all associated participant and message data simultaneously with zero orphaned records.
  - Can be triggered automatically by Supabase `pg_cron` or via Vercel Cron (`/api/cron/cleanup`).

---

## 🚢 Deploying to Vercel

1. Push this repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: complete temporary private 1-to-1 chat app"
   git push origin main
   ```
2. Import the project in [Vercel](https://vercel.com).
3. Under **Project Settings -> Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`
4. Click **Deploy**.
5. Vercel automatically detects [`vercel.json`](file:///d:/yashashree-calc/vercel.json) and configures the `/api/cron/cleanup` cron job to run every 5 minutes.

---

## ✅ Acceptance Criteria & Test Scenarios

| Scenario | Expected Result | Verified |
|---|---|:---:|
| **1. Create Room** | Person A receives a cryptographically secure 8-character code (e.g. `ABCD-1234`) and is registered as participant 1. | ✅ |
| **2. Join Room** | Person B joins with the valid code; room transitions to `'active'` and unlocks real-time messaging. | ✅ |
| **3. Real-Time Delivery** | Messages appear instantly on both screens via Supabase Realtime without page refresh. | ✅ |
| **4. Strict 2-Person Limit** | A 3rd user attempting to enter receives an explicit error: *"This room is already full"*. | ✅ |
| **5. Invalid Code Handling** | Entering a non-existent or malformed code displays a clear error (*"Room not found"* or *"Invalid room code"*). | ✅ |
| **6. Session Persistence** | Refreshing the page preserves the anonymous authentication session and participant membership. | ✅ |
| **7. Reconnection** | Disconnecting and reconnecting restores presence and keeps the room intact while active. | ✅ |
| **8. End Chat** | Clicking End Chat shows a confirmation modal, immediately closes the chat for both, and disables input. | ✅ |
| **9. 1-Hour Retention Timer** | Both users see the exact countdown timer; conversation is strictly read-only. | ✅ |
| **10. Permanent Deletion** | After 1 hour, `delete_expired_rooms` removes the room, participants, and messages permanently. | ✅ |
| **11. Row-Level Security** | Unauthorized users cannot access messages or rooms by manipulating IDs or querying Supabase directly. | ✅ |
| **12. Responsive Design** | Works smoothly across desktop, tablet, and mobile browsers with light/dark theme support. | ✅ |
#   W i s h p r  
 