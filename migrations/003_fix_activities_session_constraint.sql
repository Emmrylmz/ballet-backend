-- Fix foreign key constraint to preserve activities when sessions are deleted
-- Activities are audit logs and should remain even if sessions are removed
-- Set session_id to NULL when a session is deleted to preserve the activity record

BEGIN;

-- Drop the existing foreign key constraint
ALTER TABLE activities 
DROP CONSTRAINT IF EXISTS activities_session_id_fkey;

-- Add the constraint back with SET NULL on delete
-- This preserves the activity log while removing the reference to the deleted session
ALTER TABLE activities 
ADD CONSTRAINT activities_session_id_fkey 
FOREIGN KEY (session_id) 
REFERENCES class_sessions(id) 
ON DELETE SET NULL;

-- Optional: Add a comment to explain why this is SET NULL
COMMENT ON CONSTRAINT activities_session_id_fkey ON activities IS 
'Set to NULL when session is deleted to preserve activity audit logs';

COMMIT;