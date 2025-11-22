-- Migration: Create centralized audit_logs table
-- Description: Centralized audit logging system for tracking all critical actions across modules
-- Date: 2025-01-12

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Context
  establishment_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_role VARCHAR(50) NOT NULL,

  -- Action details
  module VARCHAR(50) NOT NULL,
  action_type VARCHAR(100) NOT NULL,

  -- Target information
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,

  -- Additional data (flexible JSONB for request/response details)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Request context
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign keys
  CONSTRAINT fk_audit_establishment FOREIGN KEY (establishment_id)
    REFERENCES establishments(id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_audit_establishment ON audit_logs(establishment_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_module_action ON audit_logs(module, action_type);
CREATE INDEX idx_audit_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_metadata ON audit_logs USING gin(metadata);

-- Create composite index for common query pattern
CREATE INDEX idx_audit_establishment_created ON audit_logs(establishment_id, created_at DESC);

-- Add comment to table
COMMENT ON TABLE audit_logs IS 'Centralized audit log for tracking all critical actions across the application';
COMMENT ON COLUMN audit_logs.module IS 'Module name: payments, attendance, classes, students, cohorts, etc.';
COMMENT ON COLUMN audit_logs.action_type IS 'Action performed: record_payment, mark_attendance, create_class, etc.';
COMMENT ON COLUMN audit_logs.target_type IS 'Type of entity affected: student, cohort, payment, class, session, etc.';
COMMENT ON COLUMN audit_logs.target_id IS 'ID of the entity affected';
COMMENT ON COLUMN audit_logs.metadata IS 'Flexible JSONB storage for request/response details, amounts, notes, etc.';

-- Enable Row Level Security for immutability
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy: Allow reads for authenticated users (handled by application)
-- Create policy: Prevent updates and deletes (immutable logs)
CREATE POLICY audit_logs_read_only ON audit_logs
  FOR ALL
  USING (true)                -- Allow reads
  WITH CHECK (false);         -- Prevent updates/deletes

-- Note: INSERTs will be allowed by the application service account
-- which has BYPASSRLS permission or a specific INSERT policy

-- Create function to prevent manual modifications
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Audit logs cannot be modified';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Audit logs cannot be deleted';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce immutability at database level
CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

-- Grant appropriate permissions
-- Note: Adjust these based on your database user setup
-- GRANT SELECT, INSERT ON audit_logs TO app_user;
-- GRANT USAGE ON SEQUENCE audit_logs_id_seq TO app_user;
