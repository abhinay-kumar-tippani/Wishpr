-- ==============================================================================
-- WHISPR MIGRATION: Supabase Database-Level Scheduled Cleanup with pg_cron
-- ==============================================================================

-- 1. Enable pg_cron Extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Define the Cleanup Function
-- Restricted execution privilege, safe search_path, only deletes closed expired rooms.
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
    -- Foreign keys ON DELETE CASCADE automatically remove participants & messages.
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

-- 3. Lock Down Permissions
-- Disallow public, anonymous, and authenticated users from calling cleanup directly
REVOKE ALL ON FUNCTION cleanup_expired_chat_rooms() FROM PUBLIC;
REVOKE ALL ON FUNCTION cleanup_expired_chat_rooms() FROM anon;
REVOKE ALL ON FUNCTION cleanup_expired_chat_rooms() FROM authenticated;
-- Grant execution only to postgres and service_role
GRANT EXECUTE ON FUNCTION cleanup_expired_chat_rooms() TO postgres, service_role;

-- 4. Update Row-Level Security: Prevent access once expires_at is reached
-- Even before the scheduled 1-minute cron deletion fires, expired rooms become immediately inaccessible.
DROP POLICY IF EXISTS "Participants can view their room" ON rooms;
CREATE POLICY "Participants can view their room"
ON rooms FOR SELECT
USING (
    auth.uid() IS NOT NULL 
    AND is_room_participant(id, auth.uid())
    AND (expires_at IS NULL OR expires_at > timezone('utc'::text, now()))
);

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

-- 5. Schedule pg_cron Job (Runs every minute: '* * * * *')
-- Idempotent: Unschedule any previous cleanup job to prevent accidental duplicates
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

-- Schedule the cleanup function to run every minute
SELECT cron.schedule(
    'cleanup-expired-chat-rooms',
    '* * * * *',
    'SELECT public.cleanup_expired_chat_rooms();'
);
