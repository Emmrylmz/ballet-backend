-- Multi-tenant Sample Data for Ballet Management System
-- Clear existing data first
TRUNCATE TABLE activities, payments, attendance_records, session_enrollments, 
                class_sessions, student_packages, class_templates, students, 
                instructors, users, establishments, settings
                RESTART IDENTITY CASCADE;

-- Insert Sample Establishments
INSERT INTO establishments (id, name, business_name, email, phone, address, city, state, postal_code) VALUES 
('est1111-1111-4111-a111-111111111111', 'Ballet Academy Downtown', 'Downtown Ballet Academy LLC', 'info@downtownballet.com', '+1-555-BALLET-1', '123 Main Street', 'New York', 'NY', '10001'),
('est2222-2222-4222-a222-222222222222', 'Westside Pilates Studio', 'Westside Wellness Inc', 'hello@westsidepilates.com', '+1-555-PILATES', '456 West Ave', 'Los Angeles', 'CA', '90210');

-- Insert Sample Users (Admin, Instructors, Students)
-- Establishment 1 Users
INSERT INTO users (id, establishment_id, email, password_hash, first_name, last_name, phone, role, status, email_verified) VALUES
-- Admin user for establishment 1
('usr1111-1111-4111-a111-111111111111', 'est1111-1111-4111-a111-111111111111', 'admin@downtownballet.com', '$2b$10$example_hash_admin', 'Sarah', 'Admin', '+1-555-001-0001', 'admin', 'active', true),
-- Instructors for establishment 1
('usr2222-2222-4222-a222-222222222222', 'est1111-1111-4111-a111-111111111111', 'sarah@downtownballet.com', '$2b$10$example_hash_sarah', 'Sarah', 'Johnson', '+1-555-001-0002', 'instructor', 'active', true),
('usr3333-3333-4333-a333-333333333333', 'est1111-1111-4111-a111-111111111111', 'emma@downtownballet.com', '$2b$10$example_hash_emma', 'Emma', 'Wilson', '+1-555-001-0003', 'instructor', 'active', true),
-- Students/Parents for establishment 1
('usr4444-4444-4444-a444-444444444444', 'est1111-1111-4111-a111-111111111111', 'alice.parent@email.com', '$2b$10$example_hash_alice', 'Alice', 'Smith', '+1-555-001-0004', 'student', 'active', true),
('usr5555-5555-4555-a555-555555555555', 'est1111-1111-4111-a111-111111111111', 'bob.parent@email.com', '$2b$10$example_hash_bob', 'Mary', 'Johnson', '+1-555-001-0005', 'parent', 'active', true);

-- Establishment 2 Users  
INSERT INTO users (id, establishment_id, email, password_hash, first_name, last_name, phone, role, status, email_verified) VALUES
-- Admin for establishment 2
('usr6666-6666-4666-a666-666666666666', 'est2222-2222-4222-a222-222222222222', 'admin@westsidepilates.com', '$2b$10$example_hash_admin2', 'Lisa', 'Admin', '+1-555-002-0001', 'admin', 'active', true),
-- Instructor for establishment 2
('usr7777-7777-4777-a777-777777777777', 'est2222-2222-4222-a222-222222222222', 'lisa@westsidepilates.com', '$2b$10$example_hash_lisa', 'Lisa', 'Chen', '+1-555-002-0002', 'instructor', 'active', true);

-- Insert Instructors linked to users
INSERT INTO instructors (id, establishment_id, user_id, name, email, phone, specialization, hourly_rate, is_active) VALUES
('ins1111-1111-4111-a111-111111111111', 'est1111-1111-4111-a111-111111111111', 'usr2222-2222-4222-a222-222222222222', 'Sarah Johnson', 'sarah@downtownballet.com', '+1-555-001-0002', ARRAY['ballet', 'pilates'], 75.00, true),
('ins2222-2222-4222-a222-222222222222', 'est1111-1111-4111-a111-111111111111', 'usr3333-3333-4333-a333-333333333333', 'Emma Wilson', 'emma@downtownballet.com', '+1-555-001-0003', ARRAY['ballet'], 65.00, true),
('ins3333-3333-4333-a333-333333333333', 'est2222-2222-4222-a222-222222222222', 'usr7777-7777-4777-a777-777777777777', 'Lisa Chen', 'lisa@westsidepilates.com', '+1-555-002-0002', ARRAY['pilates'], 80.00, true);

-- Insert Students  
INSERT INTO students (id, establishment_id, user_id, name, email, phone, emergency_contact, emergency_contact_name, parent_name, parent_phone, birth_date, registration_date, is_active) VALUES
-- Establishment 1 students
('stu1111-1111-4111-a111-111111111111', 'est1111-1111-4111-a111-111111111111', 'usr4444-4444-4444-a444-444444444444', 'Alice Smith', 'alice.student@email.com', '+1-555-001-0004', '+1-555-001-0004', 'Parent Alice Smith', 'Parent Alice Smith', '+1-555-001-0004', '1995-05-15', '2024-01-15', true),
('stu2222-2222-4222-a222-222222222222', 'est1111-1111-4111-a111-111111111111', 'usr5555-5555-4555-a555-555555555555', 'Bob Johnson', 'bob.student@email.com', '+1-555-001-0005', '+1-555-001-0005', 'Mary Johnson', 'Mary Johnson', '+1-555-001-0005', '2010-03-22', '2024-02-01', true),
('stu3333-3333-4333-a333-333333333333', 'est1111-1111-4111-a111-111111111111', NULL, 'Carol Davis', 'carol@email.com', '+1-555-001-0006', '+1-555-001-0007', 'Tom Davis', 'Tom Davis', '+1-555-001-0007', '1988-11-08', '2024-01-10', true),
('stu4444-4444-4444-a444-444444444444', 'est1111-1111-4111-a111-111111111111', NULL, 'Diana Prince', 'diana@email.com', '+1-555-001-0008', '+1-555-001-0009', 'Steve Prince', 'Steve Prince', '+1-555-001-0009', '2005-07-12', '2024-02-15', true),

-- Establishment 2 students
('stu5555-5555-4555-a555-555555555555', 'est2222-2222-4222-a222-222222222222', NULL, 'Elena Vasquez', 'elena@email.com', '+1-555-002-0005', '+1-555-002-0006', 'Carlos Vasquez', 'Carlos Vasquez', '+1-555-002-0006', '1992-09-20', '2024-01-20', true),
('stu6666-6666-4666-a666-666666666666', 'est2222-2222-4222-a222-222222222222', NULL, 'Frank Miller', 'frank@email.com', '+1-555-002-0007', '+1-555-002-0008', 'Susan Miller', 'Susan Miller', '+1-555-002-0008', '2008-12-03', '2024-03-01', true);

-- Insert Class Templates
INSERT INTO class_templates (id, establishment_id, title, class_type, skill_level, instructor_id, capacity, duration_minutes, price, description, is_active) VALUES
-- Establishment 1 classes
('ct11111-1111-4111-a111-111111111111', 'est1111-1111-4111-a111-111111111111', 'Beginner Ballet', 'ballet', 'beginner', 'ins1111-1111-4111-a111-111111111111', 12, 60, 25.00, 'Perfect for those new to ballet', true),
('ct22222-2222-4222-a222-222222222222', 'est1111-1111-4111-a111-111111111111', 'Intermediate Ballet', 'ballet', 'intermediate', 'ins1111-1111-4111-a111-111111111111', 10, 75, 35.00, 'For students with some experience', true),
('ct33333-3333-4333-a333-333333333333', 'est1111-1111-4111-a111-111111111111', 'Advanced Ballet', 'ballet', 'advanced', 'ins2222-2222-4222-a222-222222222222', 8, 90, 45.00, 'For experienced dancers', true),
('ct44444-4444-4444-a444-444444444444', 'est1111-1111-4111-a111-111111111111', 'Kids Ballet (Ages 5-8)', 'ballet', 'kids', 'ins2222-2222-4222-a222-222222222222', 15, 45, 20.00, 'Fun intro for kids', true),

-- Establishment 2 classes
('ct55555-5555-4555-a555-555555555555', 'est2222-2222-4222-a222-222222222222', 'Pilates Fundamentals', 'pilates', 'beginner', 'ins3333-3333-4333-a333-333333333333', 12, 60, 30.00, 'Learn Pilates basics', true),
('ct66666-6666-4666-a666-666666666666', 'est2222-2222-4222-a222-222222222222', 'Advanced Pilates', 'pilates', 'advanced', 'ins3333-3333-4333-a333-333333333333', 8, 75, 40.00, 'Advanced Pilates challenge', true);

-- Insert Student Packages
INSERT INTO student_packages (id, establishment_id, student_id, package_type, remaining_classes, start_date, end_date, payment_status, last_payment_date, next_due_date, price, is_active) VALUES
-- Establishment 1 packages
('sp11111-1111-4111-a111-111111111111', 'est1111-1111-4111-a111-111111111111', 'stu1111-1111-4111-a111-111111111111', 'monthly', NULL, '2024-09-01', '2024-09-30', 'current', '2024-09-01', '2024-10-01', 120.00, true),
('sp22222-2222-4222-a222-222222222222', 'est1111-1111-4111-a111-111111111111', 'stu2222-2222-4222-a222-222222222222', 'monthly', NULL, '2024-09-01', '2024-09-30', 'current', '2024-09-01', '2024-10-01', 100.00, true),
('sp33333-3333-4333-a333-333333333333', 'est1111-1111-4111-a111-111111111111', 'stu3333-3333-4333-a333-333333333333', 'monthly', NULL, '2024-08-01', '2024-08-31', 'overdue', '2024-08-01', '2024-09-01', 120.00, true),
('sp44444-4444-4444-a444-444444444444', 'est1111-1111-4111-a111-111111111111', 'stu4444-4444-4444-a444-444444444444', '8-class', 5, '2024-08-15', '2024-10-15', 'current', '2024-08-15', NULL, 180.00, true),

-- Establishment 2 packages
('sp55555-5555-4555-a555-555555555555', 'est2222-2222-4222-a222-222222222222', 'stu5555-5555-4555-a555-555555555555', '8-class', 8, '2024-09-01', '2024-11-01', 'current', '2024-09-01', NULL, 200.00, true),
('sp66666-6666-4666-a666-666666666666', 'est2222-2222-4222-a222-222222222222', 'stu6666-6666-4666-a666-666666666666', 'drop-in', 1, '2024-09-02', NULL, 'current', '2024-09-02', NULL, 35.00, true);

-- Insert Class Sessions
INSERT INTO class_sessions (id, establishment_id, class_template_id, instructor_id, session_date, start_time, end_time, capacity, status) VALUES
-- Today's classes - Establishment 1
('cs11111-1111-4111-a111-111111111111', 'est1111-1111-4111-a111-111111111111', 'ct11111-1111-4111-a111-111111111111', 'ins1111-1111-4111-a111-111111111111', CURRENT_DATE, '09:00:00', '10:00:00', 12, 'scheduled'),
('cs22222-2222-4222-a222-222222222222', 'est1111-1111-4111-a111-111111111111', 'ct22222-2222-4222-a222-222222222222', 'ins1111-1111-4111-a111-111111111111', CURRENT_DATE, '10:30:00', '11:45:00', 10, 'scheduled'),
('cs33333-3333-4333-a333-333333333333', 'est1111-1111-4111-a111-111111111111', 'ct44444-4444-4444-a444-444444444444', 'ins2222-2222-4222-a222-222222222222', CURRENT_DATE, '15:00:00', '15:45:00', 15, 'scheduled'),

-- Today's classes - Establishment 2
('cs44444-4444-4444-a444-444444444444', 'est2222-2222-4222-a222-222222222222', 'ct55555-5555-4555-a555-555555555555', 'ins3333-3333-4333-a333-333333333333', CURRENT_DATE, '18:00:00', '19:00:00', 12, 'scheduled'),

-- Past completed classes
('cs55555-5555-4555-a555-555555555555', 'est1111-1111-4111-a111-111111111111', 'ct11111-1111-4111-a111-111111111111', 'ins1111-1111-4111-a111-111111111111', CURRENT_DATE - INTERVAL '1 day', '09:00:00', '10:00:00', 12, 'completed'),
('cs66666-6666-4666-a666-666666666666', 'est2222-2222-4222-a222-222222222222', 'ct55555-5555-4555-a555-555555555555', 'ins3333-3333-4333-a333-333333333333', CURRENT_DATE - INTERVAL '2 days', '18:00:00', '19:00:00', 12, 'completed');

-- Insert Session Enrollments
INSERT INTO session_enrollments (id, establishment_id, session_id, student_id, enrollment_date) VALUES
-- Today's enrollments - Establishment 1
('se11111-1111-4111-a111-111111111111', 'est1111-1111-4111-a111-111111111111', 'cs11111-1111-4111-a111-111111111111', 'stu1111-1111-4111-a111-111111111111', '2024-08-28 10:00:00'),
('se22222-2222-4222-a222-222222222222', 'est1111-1111-4111-a111-111111111111', 'cs11111-1111-4111-a111-111111111111', 'stu2222-2222-4222-a222-222222222222', '2024-08-28 10:15:00'),
('se33333-3333-4333-a333-333333333333', 'est1111-1111-4111-a111-111111111111', 'cs22222-2222-4222-a222-222222222222', 'stu3333-3333-4333-a333-333333333333', '2024-08-29 14:30:00'),

-- Today's enrollments - Establishment 2
('se44444-4444-4444-a444-444444444444', 'est2222-2222-4222-a222-222222222222', 'cs44444-4444-4444-a444-444444444444', 'stu5555-5555-4555-a555-555555555555', '2024-08-30 16:00:00'),

-- Past enrollments
('se55555-5555-4555-a555-555555555555', 'est1111-1111-4111-a111-111111111111', 'cs55555-5555-4555-a555-555555555555', 'stu1111-1111-4111-a111-111111111111', '2024-08-25 09:00:00'),
('se66666-6666-4666-a666-666666666666', 'est2222-2222-4222-a222-222222222222', 'cs66666-6666-4666-a666-666666666666', 'stu5555-5555-4555-a555-555555555555', '2024-08-27 17:30:00');

-- Insert Attendance Records
INSERT INTO attendance_records (id, establishment_id, session_id, student_id, status, notes, marked_by) VALUES
('ar11111-1111-4111-a111-111111111111', 'est1111-1111-4111-a111-111111111111', 'cs55555-5555-4555-a555-555555555555', 'stu1111-1111-4111-a111-111111111111', 'present', 'Great improvement in posture', 'usr2222-2222-4222-a222-222222222222'),
('ar22222-2222-4222-a222-222222222222', 'est2222-2222-4222-a222-222222222222', 'cs66666-6666-4666-a666-666666666666', 'stu5555-5555-4555-a555-555555555555', 'present', 'Excellent form today', 'usr7777-7777-4777-a777-777777777777');

-- Insert Payments
INSERT INTO payments (id, establishment_id, student_id, student_package_id, amount, payment_method, payment_type, payment_date, description, recorded_by) VALUES
-- Establishment 1 payments
('py11111-1111-4111-a111-111111111111', 'est1111-1111-4111-a111-111111111111', 'stu1111-1111-4111-a111-111111111111', 'sp11111-1111-4111-a111-111111111111', 120.00, 'card', 'monthly', '2024-09-01', 'Monthly package payment', 'usr1111-1111-4111-a111-111111111111'),
('py22222-2222-4222-a222-222222222222', 'est1111-1111-4111-a111-111111111111', 'stu2222-2222-4222-a222-222222222222', 'sp22222-2222-4222-a222-222222222222', 100.00, 'bank_transfer', 'monthly', '2024-09-01', 'Monthly package payment', 'usr1111-1111-4111-a111-111111111111'),
('py33333-3333-4333-a333-333333333333', 'est1111-1111-4111-a111-111111111111', 'stu4444-4444-4444-a444-444444444444', 'sp44444-4444-4444-a444-444444444444', 180.00, 'card', '8-class', '2024-08-15', '8-class package payment', 'usr1111-1111-4111-a111-111111111111'),

-- Establishment 2 payments
('py44444-4444-4444-a444-444444444444', 'est2222-2222-4222-a222-222222222222', 'stu5555-5555-4555-a555-555555555555', 'sp55555-5555-4555-a555-555555555555', 200.00, 'card', '8-class', '2024-09-01', '8-class package payment', 'usr6666-6666-4666-a666-666666666666'),
('py55555-5555-4555-a555-555555555555', 'est2222-2222-4222-a222-222222222222', 'stu6666-6666-4666-a666-666666666666', 'sp66666-6666-4666-a666-666666666666', 35.00, 'cash', 'drop-in', '2024-09-02', 'Drop-in class payment', 'usr6666-6666-4666-a666-666666666666');

-- Insert Activities for dashboard feed
INSERT INTO activities (id, establishment_id, activity_type, title, description, student_id, payment_id, user_id, created_at) VALUES
-- Establishment 1 activities
('ac11111-1111-4111-a111-111111111111', 'est1111-1111-4111-a111-111111111111', 'payment', 'Payment Received', 'Payment received from Alice Smith for monthly package', 'stu1111-1111-4111-a111-111111111111', 'py11111-1111-4111-a111-111111111111', 'usr1111-1111-4111-a111-111111111111', '2024-09-01 10:30:00'),
('ac22222-2222-4222-a222-222222222222', 'est1111-1111-4111-a111-111111111111', 'enrollment', 'Class Enrollment', 'Bob Johnson enrolled in Beginner Ballet class', 'stu2222-2222-4222-a222-222222222222', NULL, 'usr2222-2222-4222-a222-222222222222', '2024-08-28 14:15:00'),
('ac33333-3333-4333-a333-333333333333', 'est1111-1111-4111-a111-111111111111', 'payment', 'Overdue Payment', 'Payment overdue for Carol Davis monthly package', 'stu3333-3333-4333-a333-333333333333', NULL, 'usr1111-1111-4111-a111-111111111111', '2024-09-01 00:00:00'),

-- Establishment 2 activities
('ac44444-4444-4444-a444-444444444444', 'est2222-2222-4222-a222-222222222222', 'payment', 'Payment Received', 'Payment received from Elena Vasquez for 8-class package', 'stu5555-5555-4555-a555-555555555555', 'py44444-4444-4444-a444-444444444444', 'usr6666-6666-4666-a666-666666666666', '2024-09-01 16:45:00'),
('ac55555-5555-4555-a555-555555555555', 'est2222-2222-4222-a222-222222222222', 'attendance', 'Class Attendance', 'Elena Vasquez attended Pilates Fundamentals class', 'stu5555-5555-4555-a555-555555555555', NULL, 'usr7777-7777-4777-a777-777777777777', CURRENT_DATE - INTERVAL '2 days' + TIME '18:30:00'),
('ac66666-6666-4666-a666-666666666666', 'est2222-2222-4222-a222-222222222222', 'payment', 'Payment Received', 'Drop-in payment received from Frank Miller', 'stu6666-6666-4666-a666-666666666666', 'py55555-5555-4555-a555-555555555555', 'usr6666-6666-4666-a666-666666666666', '2024-09-02 09:15:00');

-- Insert Settings per establishment
INSERT INTO settings (establishment_id, key, value, description) VALUES
-- Establishment 1 settings
('est1111-1111-4111-a111-111111111111', 'monthly_revenue_target', '"8000.00"', 'Monthly revenue target'),
('est1111-1111-4111-a111-111111111111', 'weekly_revenue_target', '"2000.00"', 'Weekly revenue target'),
('est1111-1111-4111-a111-111111111111', 'daily_revenue_target', '"285.71"', 'Daily revenue target'),
('est1111-1111-4111-a111-111111111111', 'studio_email', '"info@downtownballet.com"', 'Studio contact email'),
('est1111-1111-4111-a111-111111111111', 'studio_phone', '"+1-555-BALLET-1"', 'Studio contact phone'),

-- Establishment 2 settings
('est2222-2222-4222-a222-222222222222', 'monthly_revenue_target', '"6000.00"', 'Monthly revenue target'),
('est2222-2222-4222-a222-222222222222', 'weekly_revenue_target', '"1500.00"', 'Weekly revenue target'),
('est2222-2222-4222-a222-222222222222', 'daily_revenue_target', '"214.29"', 'Daily revenue target'),
('est2222-2222-4222-a222-222222222222', 'studio_email', '"hello@westsidepilates.com"', 'Studio contact email'),
('est2222-2222-4222-a222-222222222222', 'studio_phone', '"+1-555-PILATES"', 'Studio contact phone'),

-- Global settings
(NULL, 'system_version', '"1.0.0"', 'System version number'),
(NULL, 'maintenance_mode', 'false', 'System maintenance mode flag');

SELECT 'Multi-tenant sample data inserted successfully!' as result;
SELECT 'Establishments: ' || COUNT(*) FROM establishments;
SELECT 'Users: ' || COUNT(*) FROM users;  
SELECT 'Instructors: ' || COUNT(*) FROM instructors;
SELECT 'Students: ' || COUNT(*) FROM students;
SELECT 'Class Templates: ' || COUNT(*) FROM class_templates;
SELECT 'Class Sessions: ' || COUNT(*) FROM class_sessions;
SELECT 'Payments: ' || COUNT(*) FROM payments;
SELECT 'Activities: ' || COUNT(*) FROM activities;