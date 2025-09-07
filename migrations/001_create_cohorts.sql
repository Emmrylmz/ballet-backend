-- Migration: Create cohorts system for student groups
-- Description: Add cohorts, cohort_memberships tables and update class_sessions

-- Create cohorts table
CREATE TABLE IF NOT EXISTS cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id),
  template_id UUID NOT NULL REFERENCES class_templates(id),
  instructor_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  age_min INTEGER,
  age_max INTEGER,
  max_students INTEGER NOT NULL,
  schedule_days INTEGER[] NOT NULL, -- [1,3,5] for Mon/Wed/Fri (0=Sunday, 6=Saturday)
  schedule_start_time TIME NOT NULL,
  term_start_date DATE NOT NULL,
  term_end_date DATE NOT NULL,
  holiday_breaks JSONB DEFAULT '[]'::jsonb, -- [{"start": "2024-12-23", "end": "2024-01-02", "name": "Winter Break"}]
  makeup_policy TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT cohorts_age_range_check CHECK (age_min IS NULL OR age_max IS NULL OR age_min <= age_max),
  CONSTRAINT cohorts_term_dates_check CHECK (term_start_date <= term_end_date),
  CONSTRAINT cohorts_max_students_positive CHECK (max_students > 0),
  CONSTRAINT cohorts_duration_positive CHECK (schedule_duration_minutes > 0)
);

-- Create cohort memberships table
CREATE TABLE IF NOT EXISTS cohort_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('package', 'term_fee', 'drop_in')),
  joined_date DATE DEFAULT CURRENT_DATE,
  left_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT cohort_memberships_dates_check CHECK (left_date IS NULL OR joined_date <= left_date),
  CONSTRAINT cohort_memberships_unique_active UNIQUE (cohort_id, student_id, is_active) 
    DEFERRABLE INITIALLY DEFERRED -- Allow one active membership per student per cohort
);

-- Update class_sessions table to support cohorts
DO $$ 
BEGIN
  -- Add cohort_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'class_sessions' AND column_name = 'cohort_id') THEN
    ALTER TABLE class_sessions ADD COLUMN cohort_id UUID REFERENCES cohorts(id);
  END IF;
  
  -- Add override_instructor_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'class_sessions' AND column_name = 'override_instructor_id') THEN
    ALTER TABLE class_sessions ADD COLUMN override_instructor_id UUID REFERENCES users(id);
  END IF;
  
  -- Add session_type column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'class_sessions' AND column_name = 'session_type') THEN
    ALTER TABLE class_sessions ADD COLUMN session_type VARCHAR(20) DEFAULT 'regular' 
      CHECK (session_type IN ('regular', 'makeup', 'trial', 'private', 'workshop'));
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cohorts_establishment ON cohorts(establishment_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_instructor ON cohorts(instructor_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_template ON cohorts(template_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_active ON cohorts(establishment_id, is_active);

CREATE INDEX IF NOT EXISTS idx_cohort_memberships_active ON cohort_memberships(cohort_id, is_active);
CREATE INDEX IF NOT EXISTS idx_cohort_memberships_student ON cohort_memberships(student_id, is_active);

CREATE INDEX IF NOT EXISTS idx_sessions_cohort ON class_sessions(cohort_id, session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_override_instructor ON class_sessions(override_instructor_id);

-- Create view for cohort statistics
CREATE OR REPLACE VIEW cohort_stats AS
SELECT 
  c.id,
  c.establishment_id,
  c.name,
  c.max_students,
  c.term_start_date,
  c.term_end_date,
  c.is_active,
  COUNT(cm.id) FILTER (WHERE cm.is_active = true) as current_enrollment,
  c.max_students - COUNT(cm.id) FILTER (WHERE cm.is_active = true) as available_spots,
  ROUND(
    (COUNT(cm.id) FILTER (WHERE cm.is_active = true)::decimal / NULLIF(c.max_students, 0)) * 100,
    1
  ) as enrollment_percentage
FROM cohorts c
LEFT JOIN cohort_memberships cm ON c.id = cm.cohort_id
GROUP BY c.id, c.establishment_id, c.name, c.max_students, c.term_start_date, c.term_end_date, c.is_active;

-- Add comments for documentation
COMMENT ON TABLE cohorts IS 'Student cohorts/groups that meet regularly (like "Tuesday Ballet Ages 8-10")';
COMMENT ON TABLE cohort_memberships IS 'Links students to cohorts with payment type tracking';
COMMENT ON COLUMN cohorts.schedule_days IS 'Array of weekdays: 0=Sunday, 1=Monday, ... 6=Saturday';
COMMENT ON COLUMN cohorts.holiday_breaks IS 'JSON array of break periods: [{"start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "name": "Break Name"}]';
COMMENT ON COLUMN cohort_memberships.payment_type IS 'How this student pays: package (uses credits), term_fee (paid upfront), drop_in (per session)';
COMMENT ON COLUMN class_sessions.override_instructor_id IS 'Substitute instructor for this session, overrides cohort default';
COMMENT ON COLUMN class_sessions.session_type IS 'Type of session: regular, makeup, trial, private, or workshop';