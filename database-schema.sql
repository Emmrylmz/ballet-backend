-- Teacher Management System Database Schema
-- PostgreSQL Schema Design

-- Users/Instructors Table
CREATE TABLE instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    specialization TEXT[], -- ['ballet', 'pilates']
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students Table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    emergency_contact VARCHAR(20) NOT NULL,
    emergency_contact_name VARCHAR(255),
    parent_name VARCHAR(255), -- for kids
    parent_phone VARCHAR(20), -- for kids
    birth_date DATE,
    medical_notes TEXT,
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Package Types
CREATE TYPE package_type AS ENUM ('monthly', '8-class', 'drop-in');
CREATE TYPE payment_status AS ENUM ('current', 'due', 'overdue');

-- Student Packages (Current Active Packages)
CREATE TABLE student_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    package_type package_type NOT NULL,
    remaining_classes INTEGER, -- NULL for monthly, number for 8-class/drop-in
    start_date DATE NOT NULL,
    end_date DATE, -- NULL for drop-in
    payment_status payment_status DEFAULT 'current',
    last_payment_date DATE,
    next_due_date DATE,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Class Templates
CREATE TYPE class_type AS ENUM ('ballet', 'pilates');
CREATE TYPE skill_level AS ENUM ('kids', 'beginner', 'intermediate', 'advanced');

CREATE TABLE class_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    class_type class_type NOT NULL,
    skill_level skill_level NOT NULL,
    instructor_id UUID REFERENCES instructors(id),
    capacity INTEGER NOT NULL DEFAULT 12,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Class Sessions (Individual class instances)
CREATE TYPE session_status AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled');
CREATE TYPE recurrence_frequency AS ENUM ('weekly', 'monthly');

CREATE TABLE class_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_template_id UUID REFERENCES class_templates(id),
    instructor_id UUID REFERENCES instructors(id),
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INTEGER NOT NULL,
    status session_status DEFAULT 'scheduled',
    notes TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_frequency recurrence_frequency,
    recurrence_days_of_week INTEGER[], -- [1,2,3] for Mon,Tue,Wed
    recurrence_end_date DATE,
    parent_session_id UUID, -- For recurring sessions, links to original
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session Enrollments
CREATE TABLE session_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_waitlist BOOLEAN DEFAULT false,
    UNIQUE(session_id, student_id)
);

-- Attendance Records
CREATE TYPE attendance_status AS ENUM ('present', 'late', 'absent', 'excused');

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    status attendance_status NOT NULL,
    notes TEXT,
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    marked_by UUID REFERENCES instructors(id),
    UNIQUE(session_id, student_id)
);

-- Payments
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'bank_transfer');
CREATE TYPE payment_type AS ENUM ('monthly', '8-class', 'drop-in', 'makeup');

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    student_package_id UUID REFERENCES student_packages(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method payment_method NOT NULL,
    payment_type payment_type NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    description TEXT,
    recorded_by UUID REFERENCES instructors(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recent Activities (for dashboard)
CREATE TYPE activity_type AS ENUM ('payment', 'registration', 'attendance', 'class', 'enrollment');

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_type activity_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    student_id UUID REFERENCES students(id),
    session_id UUID REFERENCES class_sessions(id),
    payment_id UUID REFERENCES payments(id),
    priority VARCHAR(20) DEFAULT 'medium', -- high, medium, low
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Settings
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_students_phone ON students(phone);
CREATE INDEX idx_students_active ON students(is_active);
CREATE INDEX idx_student_packages_student_id ON student_packages(student_id);
CREATE INDEX idx_student_packages_active ON student_packages(is_active);
CREATE INDEX idx_class_sessions_date ON class_sessions(session_date);
CREATE INDEX idx_class_sessions_instructor ON class_sessions(instructor_id);
CREATE INDEX idx_attendance_session ON attendance_records(session_id);
CREATE INDEX idx_attendance_student ON attendance_records(student_id);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_activities_created ON activities(created_at);

-- Views for Common Queries
CREATE VIEW student_summary AS
SELECT 
    s.id,
    s.name,
    s.email,
    s.phone,
    s.emergency_contact,
    s.is_active,
    sp.package_type,
    sp.remaining_classes,
    sp.payment_status,
    sp.last_payment_date,
    sp.next_due_date,
    COALESCE(att.attendance_rate, 0) as attendance_rate
FROM students s
LEFT JOIN student_packages sp ON s.id = sp.student_id AND sp.is_active = true
LEFT JOIN (
    SELECT 
        student_id,
        ROUND(
           COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END)
* 100.0) / 
            NULLIF(COUNT(*), 0), 2
        ) as attendance_rate
    FROM attendance_records ar
    JOIN class_sessions cs ON ar.session_id = cs.id
    WHERE cs.session_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY student_id
) att ON s.id = att.student_id;

-- CORRECTED FUNCTION: Function to calculate attendance rate
CREATE OR REPLACE FUNCTION calculate_attendance_rate(
    student_id_param UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    attendance_rate DECIMAL(5,2);
BEGIN
    SELECT 
        ROUND(
           COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END)
 * 100.0) / 
            NULLIF(COUNT(*), 0), 2
        )
    INTO attendance_rate
    FROM attendance_records ar
    JOIN class_sessions cs ON ar.session_id = cs.id
    WHERE ar.student_id = student_id_param
      AND cs.session_date >= CURRENT_DATE - make_interval(days => days_back);
    
    RETURN COALESCE(attendance_rate, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to update student package remaining classes
CREATE OR REPLACE FUNCTION update_remaining_classes()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('present', 'late') THEN
        -- Deduct from 8-class or drop-in packages
        UPDATE student_packages 
        SET remaining_classes = remaining_classes - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE student_id = NEW.student_id 
          AND package_type IN ('8-class', 'drop-in')
          AND is_active = true
          AND remaining_classes > 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update remaining classes
CREATE TRIGGER update_classes_on_attendance
    AFTER INSERT OR UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_remaining_classes();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp trigger to relevant tables
CREATE TRIGGER update_instructors_timestamp
    BEFORE UPDATE ON instructors
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_students_timestamp
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_student_packages_timestamp
    BEFORE UPDATE ON student_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_class_templates_timestamp
    BEFORE UPDATE ON class_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_class_sessions_timestamp
    BEFORE UPDATE ON class_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Sample data for testing
INSERT INTO instructors (name, email, phone, specialization) VALUES
('Sarah Johnson', 'sarah@example.com', '+1234567890', ARRAY['ballet', 'pilates']),
('Emma Wilson', 'emma@example.com', '+1234567891', ARRAY['ballet']),
('Lisa Chen', 'lisa@example.com', '+1234567892', ARRAY['pilates']);

INSERT INTO students (name, email, phone, emergency_contact, emergency_contact_name, birth_date) VALUES
('Alice Smith', 'alice@example.com', '+1234567893', '+1234567894', 'John Smith', '1995-05-15'),
('Bob Johnson', 'bob@example.com', '+1234567895', '+1234567896', 'Mary Johnson', '2010-03-22'),
('Carol Davis', 'carol@example.com', '+1234567897', '+1234567898', 'Tom Davis', '1988-11-08');

-- Insert some sample settings
INSERT INTO settings (key, value, description) VALUES
('studio_name', '"Ballet & Pilates Studio"', 'Name of the studio'),
('currency', '"USD"', 'Default currency for payments'),
('class_capacity_default', '12', 'Default capacity for new classes'),
('late_payment_fee', '10.00', 'Fee charged for late payments'),
('booking_advance_days', '7', 'How many days in advance students can book classes');