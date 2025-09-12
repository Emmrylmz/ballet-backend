-- ============================================
-- COMPLETE TRIGGER SOLUTION FOR YOUR BALLET STUDIO
-- ============================================

-- First, add a unique constraint to prevent duplicate sessions if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_cohort_session_date'
    ) THEN
        ALTER TABLE class_sessions 
        ADD CONSTRAINT unique_cohort_session_date 
        UNIQUE(cohort_id, session_date, start_time);
    END IF;
END $$;

-- ============================================
-- HELPER FUNCTION: Check if date is a holiday
-- ============================================
CREATE OR REPLACE FUNCTION is_holiday_date(
    check_date DATE,
    holiday_breaks JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    holiday JSONB;
BEGIN
    -- If no holidays, return false
    IF holiday_breaks IS NULL OR jsonb_array_length(holiday_breaks) = 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Check each holiday period
    FOR holiday IN SELECT * FROM jsonb_array_elements(holiday_breaks)
    LOOP
        IF check_date >= (holiday->>'start')::DATE 
           AND check_date <= (holiday->>'end')::DATE THEN
            RETURN TRUE;
        END IF;
    END LOOP;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- MAIN FUNCTION: Generate all sessions for a cohort
-- ============================================
CREATE OR REPLACE FUNCTION generate_cohort_sessions()
RETURNS TRIGGER AS $$
DECLARE
    v_current_date DATE;
    v_end_time TIME;
    v_session_count INTEGER := 0;
    v_day_of_week INTEGER;
    v_template_capacity INTEGER;
    v_duration_minutes INTEGER;
BEGIN
    -- Only generate sessions for new cohorts (INSERT operations)
    IF TG_OP != 'INSERT' THEN
        RETURN NEW;
    END IF;
    
    -- Skip if cohort is not active
    IF NEW.is_active = FALSE THEN
        RETURN NEW;
    END IF;
    
    -- Get template details (duration and capacity)
    SELECT duration_minutes, capacity
    INTO v_duration_minutes, v_template_capacity
    FROM class_templates
    WHERE id = NEW.template_id;
    
    -- Calculate end time
    v_end_time := NEW.schedule_start_time + (v_duration_minutes || ' minutes')::INTERVAL;
    
    -- Log start of generation
    RAISE NOTICE 'Generating sessions for cohort %: % from % to %', 
        NEW.id, NEW.name, NEW.term_start_date, NEW.term_end_date;
    
    -- Iterate through each day in the term
    v_current_date := NEW.term_start_date;
    
    WHILE v_current_date <= NEW.term_end_date LOOP
        -- Get the day of week (0 = Sunday, 6 = Saturday)
        v_day_of_week := EXTRACT(DOW FROM v_current_date);
        
        -- Check if this day is in the schedule
        IF v_day_of_week = ANY(NEW.schedule_days) THEN
            -- Check if it's not a holiday
            IF NOT is_holiday_date(v_current_date, NEW.holiday_breaks) THEN
                -- Insert the session
                INSERT INTO class_sessions (
                    establishment_id,
                    class_template_id,
                    instructor_id,
                    cohort_id,
                    session_date,
                    start_time,
                    end_time,
                    capacity,
                    status,
                    session_type
                ) VALUES (
                    NEW.establishment_id,
                    NEW.template_id,
                    NEW.instructor_id,
                    NEW.id,
                    v_current_date,
                    NEW.schedule_start_time,
                    v_end_time,
                    COALESCE(NEW.max_students, v_template_capacity),
                    'scheduled'::session_status,
                    'regular'
                ) ON CONFLICT (cohort_id, session_date, start_time) 
                DO NOTHING;
                
                v_session_count := v_session_count + 1;
            END IF;
        END IF;
        
        -- Move to next day
        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
    
    -- Log completion
    RAISE NOTICE 'Generated % sessions for cohort %', v_session_count, NEW.id;
    
    -- Log activity
    INSERT INTO activities (
        establishment_id,
        activity_type,
        user_id,
        description,
        metadata
    ) VALUES (
        NEW.establishment_id,
        'cohort_created',
        NEW.instructor_id,
        format('Generated %s sessions for cohort: %s', v_session_count, NEW.name),
        jsonb_build_object(
            'cohort_id', NEW.id,
            'sessions_created', v_session_count,
            'term_start', NEW.term_start_date,
            'term_end', NEW.term_end_date
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE THE INSERT TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS auto_generate_sessions ON cohorts;

CREATE TRIGGER auto_generate_sessions
    AFTER INSERT ON cohorts
    FOR EACH ROW
    EXECUTE FUNCTION generate_cohort_sessions();

-- ============================================
-- FUNCTION: Regenerate sessions (for manual use or updates)
-- ============================================
CREATE OR REPLACE FUNCTION regenerate_sessions_for_cohort(
    p_cohort_id UUID,
    p_from_date DATE DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_cohort RECORD;
    v_current_date DATE;
    v_end_time TIME;
    v_session_count INTEGER := 0;
    v_template_capacity INTEGER;
    v_duration_minutes INTEGER;
BEGIN
    -- Get cohort details
    SELECT c.*, ct.duration_minutes, ct.capacity as template_capacity
    INTO v_cohort
    FROM cohorts c
    JOIN class_templates ct ON c.template_id = ct.id
    WHERE c.id = p_cohort_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cohort % not found', p_cohort_id;
    END IF;
    
    -- Set from_date to tomorrow if not specified
    IF p_from_date IS NULL THEN
        p_from_date := CURRENT_DATE + INTERVAL '1 day';
    END IF;
    
    -- Delete future sessions
    DELETE FROM class_sessions 
    WHERE cohort_id = p_cohort_id 
    AND session_date >= p_from_date;
    
    -- Calculate end time
    v_end_time := v_cohort.schedule_start_time + (v_cohort.duration_minutes || ' minutes')::INTERVAL;
    
    -- Generate sessions
    v_current_date := GREATEST(p_from_date, v_cohort.term_start_date);
    
    WHILE v_current_date <= v_cohort.term_end_date LOOP
        IF EXTRACT(DOW FROM v_current_date) = ANY(v_cohort.schedule_days) THEN
            IF NOT is_holiday_date(v_current_date, v_cohort.holiday_breaks) THEN
                INSERT INTO class_sessions (
                    establishment_id,
                    class_template_id,
                    instructor_id,
                    cohort_id,
                    session_date,
                    start_time,
                    end_time,
                    capacity,
                    status,
                    session_type
                ) VALUES (
                    v_cohort.establishment_id,
                    v_cohort.template_id,
                    v_cohort.instructor_id,
                    p_cohort_id,
                    v_current_date,
                    v_cohort.schedule_start_time,
                    v_end_time,
                    COALESCE(v_cohort.max_students, v_cohort.template_capacity),
                    'scheduled'::session_status,
                    'regular'
                ) ON CONFLICT (cohort_id, session_date, start_time) DO NOTHING;
                
                v_session_count := v_session_count + 1;
            END IF;
        END IF;
        
        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN v_session_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE TRIGGER: Handle cohort schedule changes
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_cohort_update()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    v_sessions_affected INTEGER;
    v_current_date DATE;
    v_end_time TIME;
    v_day_of_week INTEGER;
    v_template_capacity INTEGER;
    v_duration_minutes INTEGER;
BEGIN
    -- HANDLE SOFT DELETE: is_active changed
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
        
        IF NEW.is_active = FALSE THEN
            -- SOFT DELETE: Keep today's session, delete from tomorrow onwards
            DELETE FROM class_sessions
            WHERE cohort_id = NEW.id
            AND session_date > CURRENT_DATE;
            
            GET DIAGNOSTICS v_sessions_affected = ROW_COUNT;
            
            RAISE NOTICE 'Soft delete: Removed % future sessions for deactivated cohort % (kept historical and today''s sessions)', 
                         v_sessions_affected, NEW.name;
            
        ELSIF NEW.is_active = TRUE THEN
            -- REACTIVATION: Generate sessions directly here (simpler approach)
            RAISE NOTICE 'Reactivating cohort: %', NEW.name;
            
            -- Get template details
            SELECT duration_minutes, capacity
            INTO v_duration_minutes, v_template_capacity
            FROM class_templates
            WHERE id = NEW.template_id;
            
            -- Calculate end time
            v_end_time := NEW.schedule_start_time + (v_duration_minutes || ' minutes')::INTERVAL;
            
            -- Start from today or term start, whichever is later
            v_current_date := GREATEST(CURRENT_DATE, NEW.term_start_date);
            v_sessions_affected := 0;
            
            RAISE NOTICE 'Generating sessions from % to %', v_current_date, NEW.term_end_date;
            
            -- Generate all sessions
            WHILE v_current_date <= NEW.term_end_date LOOP
                v_day_of_week := EXTRACT(DOW FROM v_current_date);
                
                IF v_day_of_week = ANY(NEW.schedule_days) THEN
                    IF NOT is_holiday_date(v_current_date, NEW.holiday_breaks) THEN
                        INSERT INTO class_sessions (
                            establishment_id,
                            class_template_id,
                            instructor_id,
                            cohort_id,
                            session_date,
                            start_time,
                            end_time,
                            capacity,
                            status,
                            session_type
                        ) VALUES (
                            NEW.establishment_id,
                            NEW.template_id,
                            NEW.instructor_id,
                            NEW.id,
                            v_current_date,
                            NEW.schedule_start_time,
                            v_end_time,
                            COALESCE(NEW.max_students, v_template_capacity),
                            'scheduled'::session_status,
                            'regular'
                        ) ON CONFLICT (cohort_id, session_date, start_time) DO NOTHING;
                        
                        v_sessions_affected := v_sessions_affected + 1;
                    END IF;
                END IF;
                
                v_current_date := v_current_date + INTERVAL '1 day';
            END LOOP;
            
            RAISE NOTICE 'Reactivation: Generated % sessions for reactivated cohort %',
                         v_sessions_affected, NEW.name;
        END IF;
        
        -- Return early if only is_active changed
        RETURN NEW;
    END IF;
    
    -- HANDLE SCHEDULE CHANGES (only for active cohorts)
    IF NEW.is_active = TRUE AND (
       (OLD.schedule_days IS DISTINCT FROM NEW.schedule_days) OR
       (OLD.schedule_start_time IS DISTINCT FROM NEW.schedule_start_time) OR
       (OLD.term_end_date IS DISTINCT FROM NEW.term_end_date) OR
       (OLD.term_start_date IS DISTINCT FROM NEW.term_start_date) OR
       (OLD.holiday_breaks IS DISTINCT FROM NEW.holiday_breaks) OR
       (OLD.instructor_id IS DISTINCT FROM NEW.instructor_id) OR
       (OLD.max_students IS DISTINCT FROM NEW.max_students)) THEN
        
        -- Use the regenerate function for schedule changes
        v_sessions_affected := regenerate_sessions_for_cohort(NEW.id);
        
        RAISE NOTICE 'Schedule change: Regenerated % future sessions for cohort %',
                     v_sessions_affected, NEW.name;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create the update trigger
DROP TRIGGER IF EXISTS handle_cohort_changes ON cohorts;

CREATE TRIGGER handle_cohort_changes
    AFTER UPDATE ON cohorts
    FOR EACH ROW
    EXECUTE FUNCTION handle_cohort_update();

-- ============================================
-- BONUS: Auto-enroll students when they join a cohort
-- ============================================
CREATE OR REPLACE FUNCTION auto_enroll_in_sessions()
RETURNS TRIGGER AS $$
BEGIN
    -- When a student joins a cohort, enroll them in all future sessions
    INSERT INTO session_enrollments (
        student_id,
        session_id,
        enrollment_date,
        status
    )
    SELECT 
        NEW.student_id,
        cs.id,
        CURRENT_DATE,
        'enrolled'
    FROM class_sessions cs
    WHERE cs.cohort_id = NEW.cohort_id
    AND cs.session_date >= CURRENT_DATE
    AND cs.status = 'scheduled'
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Auto-enrolled student % in future sessions of cohort %', 
                 NEW.student_id, NEW.cohort_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-enrollment
DROP TRIGGER IF EXISTS auto_enroll_student ON cohort_memberships;

CREATE TRIGGER auto_enroll_student
    AFTER INSERT ON cohort_memberships
    FOR EACH ROW
    EXECUTE FUNCTION auto_enroll_in_sessions();

-- ============================================
-- UTILITY: Generate sessions for existing cohorts
-- ============================================
CREATE OR REPLACE FUNCTION generate_sessions_for_existing_cohorts()
RETURNS TABLE(cohort_name VARCHAR, sessions_created INTEGER) AS $$
DECLARE
    v_cohort RECORD;
    v_count INTEGER;
BEGIN
    FOR v_cohort IN 
        SELECT * FROM cohorts 
        WHERE is_active = true
        ORDER BY created_at DESC
    LOOP
        -- Check if sessions already exist
        SELECT COUNT(*) INTO v_count 
        FROM class_sessions 
        WHERE cohort_id = v_cohort.id;
        
        IF v_count = 0 THEN
            -- Generate sessions
            v_count := regenerate_sessions_for_cohort(v_cohort.id, v_cohort.term_start_date);
            
            cohort_name := v_cohort.name;
            sessions_created := v_count;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TEST THE SYSTEM
-- ============================================

/*
-- Test 1: Check if triggers are installed
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    proname as function_name
FROM pg_trigger 
JOIN pg_proc ON pg_proc.oid = pg_trigger.tgfoid
WHERE tgrelid IN ('cohorts'::regclass, 'cohort_memberships'::regclass)
ORDER BY tgrelid::regclass::text, tgname;

-- Test 2: Generate sessions for existing cohorts (if any)
SELECT * FROM generate_sessions_for_existing_cohorts();

-- Test 3: Check generated sessions for a specific cohort
SELECT 
    cs.session_date,
    cs.start_time,
    cs.end_time,
    cs.capacity,
    cs.status
FROM class_sessions cs
WHERE cs.cohort_id = 'your-cohort-id'
ORDER BY cs.session_date;

-- Test 4: Verify CASCADE delete works
-- First check sessions exist, then delete cohort, then check sessions are gone
*/