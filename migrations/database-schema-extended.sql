-- Extended Teacher Management System Database Schema
-- Multi-tenant Architecture with Establishments and Authentication
-- PostgreSQL Schema Design

-- Establishments Table (Top-level tenant)
CREATE TABLE establishments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'US',
    website VARCHAR(255),
    logo_url VARCHAR(500),
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    currency VARCHAR(3) DEFAULT 'USD',
    tax_rate DECIMAL(5,4) DEFAULT 0.0875, -- 8.75%
    subscription_status VARCHAR(20) DEFAULT 'active', -- active, inactive, trial
    subscription_plan VARCHAR(50) DEFAULT 'basic', -- basic, premium, enterprise
    max_instructors INTEGER DEFAULT 10,
    max_students INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Roles and Authentication
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'instructor', 'student', 'parent');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending', 'suspended');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL,
    status user_status DEFAULT 'active',
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    avatar_url VARCHAR(500),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Sessions for JWT token management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions and Role-based Access Control
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'view_students', 'manage_payments'
    resource VARCHAR(50) NOT NULL, -- e.g., 'students', 'payments', 'classes'
    action VARCHAR(50) NOT NULL, -- e.g., 'create', 'read', 'update', 'delete'
    description TEXT
);

CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role NOT NULL,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role, permission_id)
);

-- Updated Instructors Table with establishment and user reference
DROP TABLE IF EXISTS instructors CASCADE;
CREATE TABLE instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Link to user account
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    specialization TEXT[], -- ['ballet', 'pilates']
    hourly_rate DECIMAL(10,2),
    bio TEXT,
    certifications TEXT[],
    hire_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Updated Students Table with establishment reference
DROP TABLE IF EXISTS students CASCADE;
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- For student/parent accounts
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    emergency_contact VARCHAR(20) NOT NULL,
    emergency_contact_name VARCHAR(255),
    parent_name VARCHAR(255), -- for kids
    parent_phone VARCHAR(20), -- for kids
    parent_email VARCHAR(255),
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

-- Student Packages with establishment context
DROP TABLE IF EXISTS student_packages CASCADE;
CREATE TABLE student_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE NOT NULL,
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

-- Class Templates with establishment context
CREATE TYPE class_type AS ENUM ('ballet', 'pilates');
CREATE TYPE skill_level AS ENUM ('kids', 'beginner', 'intermediate', 'advanced');

DROP TABLE IF EXISTS class_templates CASCADE;
CREATE TABLE class_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE NOT NULL,
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

-- Class Sessions with establishment context
CREATE TYPE session_status AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled');
CREATE TYPE recurrence_frequency AS ENUM ('weekly', 'monthly');

DROP TABLE IF EXISTS class_sessions CASCADE;
CREATE TABLE class_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE NOT NULL,
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
DROP TABLE IF EXISTS session_enrollments CASCADE;
CREATE TABLE session_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_waitlist BOOLEAN DEFAULT false,
    UNIQUE(session_id, student_id)
);

-- Attendance Records
CREATE TYPE attendance_status AS ENUM ('present', 'late', 'absent', 'excused');

DROP TABLE IF EXISTS attendance_records CASCADE;
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    status attendance_status NOT NULL,
    notes TEXT,
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    marked_by UUID REFERENCES users(id), -- Changed to users instead of instructors
    UNIQUE(session_id, student_id)
);

-- Payments
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'bank_transfer');
CREATE TYPE payment_type AS ENUM ('monthly', '8-class', 'drop-in', 'makeup');

DROP TABLE IF EXISTS payments CASCADE;
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    student_package_id UUID REFERENCES student_packages(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method payment_method NOT NULL,
    payment_type payment_type NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    description TEXT,
    recorded_by UUID REFERENCES users(id),
    transaction_id VARCHAR(255), -- For payment processor reference
    is_refunded BOOLEAN DEFAULT false,
    refund_amount DECIMAL(10,2),
    refund_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recent Activities with establishment context
CREATE TYPE activity_type AS ENUM ('payment', 'registration', 'attendance', 'class', 'enrollment');

DROP TABLE IF EXISTS activities CASCADE;
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE NOT NULL,
    activity_type activity_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    student_id UUID REFERENCES students(id),
    session_id UUID REFERENCES class_sessions(id),
    payment_id UUID REFERENCES payments(id),
    user_id UUID REFERENCES users(id), -- Who triggered the activity
    priority VARCHAR(20) DEFAULT 'medium', -- high, medium, low
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Settings per establishment
DROP TABLE IF EXISTS settings CASCADE;
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_global BOOLEAN DEFAULT false, -- Global settings not tied to establishment
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(establishment_id, key) -- Unique per establishment
);

-- User Invitations for Account Creation
DROP TABLE IF EXISTS user_invitations CASCADE;
CREATE TABLE user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE NOT NULL,
    invited_by UUID REFERENCES users(id) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, expired
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auth Audit Logs
CREATE TYPE auth_action AS ENUM (
    'login_attempt', 'login_success', 'login_failure', 'logout',
    'password_change', 'password_reset_request', 'password_reset_success',
    'account_activation', 'account_suspended', 'permission_denied',
    'token_refresh', 'user_invitation_sent'
);

DROP TABLE IF EXISTS auth_audit_logs CASCADE;
CREATE TABLE auth_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    email VARCHAR(255) NOT NULL,
    action auth_action NOT NULL,
    ip_address INET,
    user_agent TEXT,
    establishment_id UUID REFERENCES establishments(id),
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_users_establishment ON users(establishment_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);

CREATE INDEX idx_user_invitations_token ON user_invitations(token);
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_establishment ON user_invitations(establishment_id);

CREATE INDEX idx_auth_audit_logs_user ON auth_audit_logs(user_id);
CREATE INDEX idx_auth_audit_logs_establishment ON auth_audit_logs(establishment_id);
CREATE INDEX idx_auth_audit_logs_action ON auth_audit_logs(action);
CREATE INDEX idx_auth_audit_logs_created_at ON auth_audit_logs(created_at);

CREATE INDEX idx_instructors_establishment ON instructors(establishment_id);
CREATE INDEX idx_instructors_user ON instructors(user_id);
CREATE INDEX idx_instructors_active ON instructors(is_active);

CREATE INDEX idx_students_establishment ON students(establishment_id);
CREATE INDEX idx_students_phone ON students(phone);
CREATE INDEX idx_students_active ON students(is_active);

CREATE INDEX idx_student_packages_establishment ON student_packages(establishment_id);
CREATE INDEX idx_student_packages_student_id ON student_packages(student_id);
CREATE INDEX idx_student_packages_active ON student_packages(is_active);

CREATE INDEX idx_class_templates_establishment ON class_templates(establishment_id);
CREATE INDEX idx_class_templates_instructor ON class_templates(instructor_id);

CREATE INDEX idx_class_sessions_establishment ON class_sessions(establishment_id);
CREATE INDEX idx_class_sessions_date ON class_sessions(session_date);
CREATE INDEX idx_class_sessions_instructor ON class_sessions(instructor_id);

CREATE INDEX idx_session_enrollments_establishment ON session_enrollments(establishment_id);
CREATE INDEX idx_attendance_establishment ON attendance_records(establishment_id);
CREATE INDEX idx_attendance_session ON attendance_records(session_id);
CREATE INDEX idx_attendance_student ON attendance_records(student_id);

CREATE INDEX idx_payments_establishment ON payments(establishment_id);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_date ON payments(payment_date);

CREATE INDEX idx_activities_establishment ON activities(establishment_id);
CREATE INDEX idx_activities_created ON activities(created_at);

CREATE INDEX idx_settings_establishment ON settings(establishment_id);
CREATE INDEX idx_settings_key ON settings(key);

-- Dashboard Views for optimized queries
CREATE VIEW dashboard_stats AS
SELECT 
    e.id as establishment_id,
    (SELECT COUNT(*) FROM students s WHERE s.establishment_id = e.id AND s.is_active = true) as total_students,
    (SELECT COUNT(*) FROM instructors i WHERE i.establishment_id = e.id AND i.is_active = true) as total_instructors,
    (SELECT COUNT(*) FROM class_sessions cs WHERE cs.establishment_id = e.id AND cs.session_date = CURRENT_DATE) as todays_classes,
    (SELECT COUNT(*) FROM payments p WHERE p.establishment_id = e.id AND p.payment_date >= date_trunc('month', CURRENT_DATE)) as monthly_payments,
    (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.establishment_id = e.id AND p.payment_date >= date_trunc('month', CURRENT_DATE)) as monthly_revenue,
    (SELECT COUNT(*) FROM student_packages sp WHERE sp.establishment_id = e.id AND sp.payment_status = 'overdue') as overdue_payments
FROM establishments e
WHERE e.is_active = true;

CREATE VIEW dashboard_activities AS
SELECT 
    a.id,
    a.establishment_id,
    a.activity_type,
    a.title,
    a.description,
    a.priority,
    a.created_at,
    s.name as student_name,
    u.first_name || ' ' || u.last_name as user_name
FROM activities a
LEFT JOIN students s ON a.student_id = s.id
LEFT JOIN users u ON a.user_id = u.id
ORDER BY a.created_at DESC;

CREATE VIEW dashboard_todays_classes AS
SELECT 
    cs.id,
    cs.establishment_id,
    cs.session_date,
    cs.start_time,
    cs.end_time,
    cs.status,
    ct.title as class_title,
    ct.class_type,
    ct.skill_level,
    i.name as instructor_name,
    cs.capacity,
    (SELECT COUNT(*) FROM session_enrollments se WHERE se.session_id = cs.id) as enrolled_count
FROM class_sessions cs
JOIN class_templates ct ON cs.class_template_id = ct.id
JOIN instructors i ON cs.instructor_id = i.id
WHERE cs.session_date = CURRENT_DATE
ORDER BY cs.start_time;

CREATE VIEW dashboard_weekly_summary AS
SELECT 
    e.id as establishment_id,
    date_trunc('week', CURRENT_DATE) as week_start,
    (SELECT COUNT(*) FROM class_sessions cs WHERE cs.establishment_id = e.id 
     AND cs.session_date >= date_trunc('week', CURRENT_DATE) 
     AND cs.session_date < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week') as weekly_classes,
    (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.establishment_id = e.id 
     AND p.payment_date >= date_trunc('week', CURRENT_DATE) 
     AND p.payment_date < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week') as weekly_revenue,
    (SELECT COUNT(DISTINCT se.student_id) FROM session_enrollments se 
     JOIN class_sessions cs ON se.session_id = cs.id 
     WHERE cs.establishment_id = e.id 
     AND cs.session_date >= date_trunc('week', CURRENT_DATE) 
     AND cs.session_date < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week') as weekly_active_students
FROM establishments e
WHERE e.is_active = true;

-- Insert default permissions
INSERT INTO permissions (name, resource, action, description) VALUES
('view_dashboard', 'dashboard', 'read', 'View dashboard statistics'),
('manage_students', 'students', 'all', 'Full access to student management'),
('view_students', 'students', 'read', 'View student information'),
('manage_instructors', 'instructors', 'all', 'Full access to instructor management'),
('view_instructors', 'instructors', 'read', 'View instructor information'),
('manage_classes', 'classes', 'all', 'Full access to class management'),
('view_classes', 'classes', 'read', 'View class schedules'),
('manage_payments', 'payments', 'all', 'Full access to payment management'),
('view_payments', 'payments', 'read', 'View payment information'),
('manage_attendance', 'attendance', 'all', 'Mark and manage attendance'),
('view_attendance', 'attendance', 'read', 'View attendance records'),
('manage_settings', 'settings', 'all', 'Manage establishment settings'),
('view_reports', 'reports', 'read', 'View reports and analytics');

-- Insert default role permissions
INSERT INTO role_permissions (role, permission_id) 
SELECT 'admin', id FROM permissions WHERE resource IN ('dashboard', 'students', 'instructors', 'classes', 'payments', 'attendance', 'settings', 'reports');

INSERT INTO role_permissions (role, permission_id) 
SELECT 'instructor', id FROM permissions WHERE name IN ('view_dashboard', 'view_students', 'view_classes', 'manage_attendance', 'view_attendance', 'view_payments');

INSERT INTO role_permissions (role, permission_id) 
SELECT 'student', id FROM permissions WHERE name IN ('view_classes', 'view_attendance', 'view_payments');

-- Updated Functions for establishment context
CREATE OR REPLACE FUNCTION calculate_attendance_rate(
    student_id_param UUID,
    establishment_id_param UUID,
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
      AND ar.establishment_id = establishment_id_param
      AND cs.session_date >= CURRENT_DATE - make_interval(days => days_back);
    
    RETURN COALESCE(attendance_rate, 0);
END;
$$ LANGUAGE plpgsql;

-- Trigger functions with establishment context
CREATE OR REPLACE FUNCTION update_remaining_classes()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('present', 'late') THEN
        UPDATE student_packages 
        SET remaining_classes = remaining_classes - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE student_id = NEW.student_id 
          AND establishment_id = NEW.establishment_id
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

-- Apply timestamp triggers to all tables
CREATE TRIGGER update_establishments_timestamp
    BEFORE UPDATE ON establishments
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

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

CREATE TRIGGER update_settings_timestamp
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Row Level Security (RLS) for multi-tenancy
ALTER TABLE establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies will be added based on current user context
-- These would be dynamically created based on the authenticated user's establishment_id