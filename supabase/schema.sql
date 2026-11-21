-- ==============================================================================
-- WHISPR: Temporary Private 1-to-1 Chat Application Schema & Security Policies
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create Tables First (Guarantees relations exist before triggers/policies)

-- ROOMS TABLE
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'closed', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    closed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- PARTICIPANTS TABLE (Strictly maximum 2 per room)
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT 'Anonymous',
    is_creator BOOLEAN NOT NULL DEFAULT false,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_room_user UNIQUE (room_id, user_id)
);

-- MESSAGES TABLE (Temporary chat messages, cascade deleted with room)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(trim(content)) > 0 AND length(content) <= 4000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Indexes for High Performance & Scheduled Cleanup
CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_status_expires ON rooms(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_participants_room_id ON participants(room_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_created ON messages(room_id, created_at ASC);

-- 4. Trigger to strictly enforce max 2 participants at database level
CREATE OR REPLACE FUNCTION enforce_max_two_participants()
RETURNS TRIGGER AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM participants
    WHERE room_id = NEW.room_id;

    IF v_count >= 2 THEN
        RAISE EXCEPTION 'This room is already full (maximum 2 participants allowed)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Safe to drop trigger now because table 'participants' is guaranteed to exist
DROP TRIGGER IF EXISTS trg_max_two_participants ON participants;
CREATE TRIGGER trg_max_two_participants
BEFORE INSERT ON participants
FOR EACH ROW
EXECUTE FUNCTION enforce_max_two_participants();

-- 5. Helper Function: Check if user is a registered participant of a room
CREATE OR REPLACE FUNCTION is_room_participant(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM participants
        WHERE room_id = p_room_id AND user_id = p_user_id
    );
$$;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 7. Row Level Security Policies (Idempotent: Drop if exists then create)

-- ROOMS POLICIES: Viewable only by participants and only while not expired
DROP POLICY IF EXISTS "Participants can view their room" ON rooms;
CREATE POLICY "Participants can view their room"
ON rooms FOR SELECT
USING (
    auth.uid() IS NOT NULL 
    AND is_room_participant(id, auth.uid())
    AND (expires_at IS NULL OR expires_at > timezone('utc'::text, now()))
);

-- PARTICIPANTS POLICIES
DROP POLICY IF EXISTS "Participants can view room members" ON participants;
CREATE POLICY "Participants can view room members"
ON participants FOR SELECT
USING (
    auth.uid() IS NOT NULL AND is_room_participant(room_id, auth.uid())
);

DROP POLICY IF EXISTS "Participants can update their own last seen" ON participants;
CREATE POLICY "Participants can update their own last seen"
ON participants FOR UPDATE
USING (
    auth.uid() = user_id
)
WITH CHECK (
    auth.uid() = user_id
);

-- MESSAGES POLICIES: Readable only by room participants and only while room not expired
DROP POLICY IF EXISTS "Participants can read messages" ON messages;
CREATE POLICY "Participants can read messages"
ON messages FOR SELECT
USING (
    auth.uid() IS NOT NULL 
    AND is_room_participant(room_id, auth.uid())
    AND EXISTS (
        SELECT 1 FROM rooms 
        WHERE id = room_id 
        AND (expires_at IS NULL OR expires_at > timezone('utc'::text, now()))
    )
);

-- Insert messages allowed only in active rooms
DROP POLICY IF EXISTS "Participants can insert messages in active rooms" ON messages;
CREATE POLICY "Participants can insert messages in active rooms"
ON messages FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = sender_id
    AND is_room_participant(room_id, auth.uid())
    AND EXISTS (
        SELECT 1 FROM rooms
        WHERE id = room_id AND status = 'active'
    )
);

DROP POLICY IF EXISTS "Messages cannot be modified" ON messages;
CREATE POLICY "Messages cannot be modified"
ON messages FOR UPDATE
USING (false);

DROP POLICY IF EXISTS "Messages cannot be deleted individually" ON messages;
CREATE POLICY "Messages cannot be deleted individually"
ON messages FOR DELETE
USING (false);

-- 8. Secure PostgreSQL RPC Functions (Atomic & Concurrency-Safe)

-- FUNCTION: Generate unique 8-character room code
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
    v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excludes confusing characters (0, O, 1, I)
    v_i INT;
BEGIN
    LOOP
        v_code := '';
        FOR v_i IN 1..8 LOOP
            v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
        END LOOP;
        
        -- Format as XXXX-XXXX
        v_code := substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4);

        SELECT EXISTS (SELECT 1 FROM rooms WHERE room_code = v_code) INTO v_exists;
        IF NOT v_exists THEN
            RETURN v_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION: Create Room (Atomic)
CREATE OR REPLACE FUNCTION create_room(p_display_name TEXT DEFAULT 'User A')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_room_id UUID;
    v_room_code TEXT;
    v_name TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    v_name := COALESCE(NULLIF(trim(p_display_name), ''), 'Creator');
    v_room_code := generate_room_code();

    -- Insert room
    INSERT INTO rooms (room_code, status, created_by)
    VALUES (v_room_code, 'waiting', v_user_id)
    RETURNING id INTO v_room_id;

    -- Insert creator as first participant
    INSERT INTO participants (room_id, user_id, display_name, is_creator)
    VALUES (v_room_id, v_user_id, v_name, true);

    RETURN jsonb_build_object(
        'room_id', v_room_id,
        'room_code', v_room_code,
        'status', 'waiting'
    );
END;
$$;

-- FUNCTION: Join Room (Atomic with SELECT ... FOR UPDATE locking)
CREATE OR REPLACE FUNCTION join_room(p_room_code TEXT, p_display_name TEXT DEFAULT 'User B')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_room RECORD;
    v_count INT;
    v_is_already_member BOOLEAN;
    v_clean_code TEXT;
    v_name TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Normalize room code: remove hyphens, spaces, uppercase
    v_clean_code := UPPER(regexp_replace(COALESCE(p_room_code, ''), '[^a-zA-Z0-9]', '', 'g'));
    IF length(v_clean_code) < 6 THEN
        RAISE EXCEPTION 'Invalid room code format';
    END IF;

    v_name := COALESCE(NULLIF(trim(p_display_name), ''), 'Participant');

    -- Atomic row lock: lock the room row so concurrent requests are serialized
    SELECT * INTO v_room
    FROM rooms
    WHERE UPPER(regexp_replace(room_code, '[^a-zA-Z0-9]', '', 'g')) = v_clean_code
    FOR UPDATE;

    IF v_room.id IS NULL THEN
        RAISE EXCEPTION 'Room not found';
    END IF;

    IF v_room.status = 'closed' THEN
        RAISE EXCEPTION 'This room has been closed';
    END IF;

    IF v_room.status = 'expired' OR (v_room.expires_at IS NOT NULL AND v_room.expires_at <= timezone('utc'::text, now())) THEN
        RAISE EXCEPTION 'This room has expired';
    END IF;

    -- Check if user is already a member
    SELECT EXISTS (
        SELECT 1 FROM participants
        WHERE room_id = v_room.id AND user_id = v_user_id
    ) INTO v_is_already_member;

    IF v_is_already_member THEN
        RETURN jsonb_build_object(
            'room_id', v_room.id,
            'room_code', v_room.room_code,
            'status', v_room.status,
            'already_member', true
        );
    END IF;

    -- Lock and count existing participants
    SELECT COUNT(*) INTO v_count
    FROM participants
    WHERE room_id = v_room.id;

    IF v_count >= 2 THEN
        RAISE EXCEPTION 'This room is already full';
    END IF;

    -- Add second participant
    INSERT INTO participants (room_id, user_id, display_name, is_creator)
    VALUES (v_room.id, v_user_id, v_name, false);

    -- Room now has 2 participants -> switch status to 'active'
    UPDATE rooms
    SET status = 'active'
    WHERE id = v_room.id;

    RETURN jsonb_build_object(
        'room_id', v_room.id,
        'room_code', v_room.room_code,
        'status', 'active',
        'already_member', false
    );
END;
$$;

-- FUNCTION: End Chat (Atomic)
CREATE OR REPLACE FUNCTION end_chat(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_room RECORD;
    v_closed_at TIMESTAMPTZ;
    v_expires_at TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Check participant membership
    IF NOT is_room_participant(p_room_id, v_user_id) THEN
        RAISE EXCEPTION 'Unauthorized: you are not a participant in this room';
    END IF;

    SELECT * INTO v_room
    FROM rooms
    WHERE id = p_room_id
    FOR UPDATE;

    IF v_room.id IS NULL THEN
        RAISE EXCEPTION 'Room not found';
    END IF;

    IF v_room.status = 'closed' OR v_room.status = 'expired' THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', v_room.status,
            'closed_at', v_room.closed_at,
            'expires_at', v_room.expires_at
        );
    END IF;

    v_closed_at := timezone('utc'::text, now());
    v_expires_at := v_closed_at + INTERVAL '1 hour';

    UPDATE rooms
    SET status = 'closed',
        closed_at = v_closed_at,
        expires_at = v_expires_at
    WHERE id = p_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'closed',
        'closed_at', v_closed_at,
        'expires_at', v_expires_at
    );
END;
$$;

-- FUNCTION: Permanent Deletion of Expired Chat Rooms (Executed via Supabase pg_cron)
CREATE OR REPLACE FUNCTION cleanup_expired_chat_rooms()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted_count INT := 0;
BEGIN
    -- Delete only rooms where status is 'closed' and expires_at <= NOW()
    -- Active and waiting rooms are strictly preserved and never touched.
    -- Foreign keys ON DELETE CASCADE automatically remove participants and messages.
    WITH deleted_rooms AS (
        DELETE FROM public.rooms
        WHERE status = 'closed'
          AND expires_at IS NOT NULL
          AND expires_at <= timezone('utc'::text, now())
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted_rooms;

    RETURN v_deleted_count;
END;
$$;

-- Restrict permissions: Do NOT expose deletion to public or authenticated users
REVOKE ALL ON FUNCTION cleanup_expired_chat_rooms() FROM PUBLIC;
REVOKE ALL ON FUNCTION cleanup_expired_chat_rooms() FROM anon;
REVOKE ALL ON FUNCTION cleanup_expired_chat_rooms() FROM authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_chat_rooms() TO postgres, service_role;

-- Backward compatibility alias
CREATE OR REPLACE FUNCTION delete_expired_rooms()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN cleanup_expired_chat_rooms();
END;
$$;

REVOKE ALL ON FUNCTION delete_expired_rooms() FROM PUBLIC;
REVOKE ALL ON FUNCTION delete_expired_rooms() FROM anon;
REVOKE ALL ON FUNCTION delete_expired_rooms() FROM authenticated;
GRANT EXECUTE ON FUNCTION delete_expired_rooms() TO postgres, service_role;

-- FUNCTION: Heartbeat / Update Participant Last Seen
CREATE OR REPLACE FUNCTION heartbeat_presence(p_room_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NOT NULL THEN
        UPDATE participants
        SET last_seen_at = timezone('utc'::text, now())
        WHERE room_id = p_room_id AND user_id = v_user_id;
    END IF;
END;
$$;

-- 9. Enable Supabase Realtime for instant updates
ALTER TABLE rooms REPLICA IDENTITY FULL;
ALTER TABLE participants REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'rooms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'participants'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE participants;
    END IF;
END;
$$;

-- 10. Schedule Cleanup with Supabase Cron (pg_cron)
-- Runs every minute ('* * * * *') to physically purge expired rooms
DO $$
DECLARE
    v_job_id BIGINT;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'cron' AND table_name = 'job'
    ) THEN
        SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'cleanup-expired-chat-rooms';
        IF v_job_id IS NOT NULL THEN
            PERFORM cron.unschedule(v_job_id);
        END IF;
    END IF;
END $$;

SELECT cron.schedule(
    'cleanup-expired-chat-rooms',
    '* * * * *',
    'SELECT public.cleanup_expired_chat_rooms();'
);
