-- Sample Data for Ballet Management System
-- Run this after the main schema is created

-- Clear existing data (optional)
TRUNCATE TABLE activities, payments, attendance_records, session_enrollments, 
                class_sessions, student_packages, class_templates, students, instructors 
                RESTART IDENTITY CASCADE;

-- Insert Instructors
INSERT INTO instructors (id, name, email, phone, specialization, is_active) VALUES
('a1b2c3d4-e5f6-4890-a234-567890abcdef', 'Sarah Johnson', 'sarah@ballet.com', '+1234567890', ARRAY['ballet', 'pilates'], true),
('b2c3d4e5-f6g7-4801-a345-678901bcdefg', 'Emma Wilson', 'emma@ballet.com', '+1234567891', ARRAY['ballet'], true),
('c3d4e5f6-g7h8-4012-a456-789012cdefgh', 'Lisa Chen', 'lisa@ballet.com', '+1234567892', ARRAY['pilates'], true),
('d4e5f6g7-h8i9-4123-a567-890123defghi', 'Maria Rodriguez', 'maria@ballet.com', '+1234567893', ARRAY['ballet'], false);

-- Insert Students
INSERT INTO students (id, name, email, phone, emergency_contact, emergency_contact_name, parent_name, parent_phone, birth_date, medical_notes, registration_date, is_active) VALUES
('11111111-1111-4111-a111-111111111111', 'Alice Smith', 'alice@example.com', '+1234567894', '+1234567895', 'John Smith', 'John Smith', '+1234567895', '1995-05-15', 'No known allergies', '2024-01-15', true),
('22222222-2222-4222-a222-222222222222', 'Bob Johnson', 'bob@example.com', '+1234567896', '+1234567897', 'Mary Johnson', 'Mary Johnson', '+1234567897', '2010-03-22', 'Asthma - has inhaler', '2024-02-01', true),
('33333333-3333-4333-a333-333333333333', 'Carol Davis', 'carol@example.com', '+1234567898', '+1234567899', 'Tom Davis', 'Tom Davis', '+1234567899', '1988-11-08', NULL, '2024-01-10', true),
('44444444-4444-4444-a444-444444444444', 'Diana Prince', 'diana@example.com', '+1234567900', '+1234567901', 'Steve Prince', 'Steve Prince', '+1234567901', '2005-07-12', 'Lactose intolerant', '2024-02-15', true),
('55555555-5555-4555-a555-555555555555', 'Elena Vasquez', 'elena@example.com', '+1234567902', '+1234567903', 'Carlos Vasquez', 'Carlos Vasquez', '+1234567903', '1992-09-20', NULL, '2024-01-20', true),
('66666666-6666-4666-a666-666666666666', 'Frank Miller', 'frank@example.com', '+1234567904', '+1234567905', 'Susan Miller', 'Susan Miller', '+1234567905', '2008-12-03', 'Previous knee injury', '2024-03-01', true),
('77777777-7777-4777-a777-777777777777', 'Grace Lee', 'grace@example.com', '+1234567906', '+1234567907', 'David Lee', 'David Lee', '+1234567907', '1990-04-18', NULL, '2024-02-20', false),
('88888888-8888-4888-a888-888888888888', 'Henry Park', 'henry@example.com', '+1234567908', '+1234567909', 'Lisa Park', 'Lisa Park', '+1234567909', '2012-01-25', 'ADHD medication', '2024-01-25', true);

-- Insert Class Templates
INSERT INTO class_templates (id, title, class_type, skill_level, instructor_id, capacity, duration_minutes, price, description, is_active) VALUES
('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'Beginner Ballet', 'ballet', 'beginner', 'a1b2c3d4-e5f6-4890-a234-567890abcdef', 12, 60, 25.00, 'Perfect for those new to ballet', true),
('bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', 'Intermediate Ballet', 'ballet', 'intermediate', 'a1b2c3d4-e5f6-4890-a234-567890abcdef', 10, 75, 35.00, 'For students with some ballet experience', true),
('cccccccc-cccc-4ccc-accc-cccccccccccc', 'Advanced Ballet', 'ballet', 'advanced', 'b2c3d4e5-f6g7-4801-a345-678901bcdefg', 8, 90, 45.00, 'For experienced ballet dancers', true),
('dddddddd-dddd-4ddd-addd-dddddddddddd', 'Kids Ballet (Ages 5-8)', 'ballet', 'kids', 'b2c3d4e5-f6g7-4801-a345-678901bcdefg', 15, 45, 20.00, 'Fun introduction to ballet for young children', true),
('eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee', 'Pilates Fundamentals', 'pilates', 'beginner', 'c3d4e5f6-g7h8-4012-a456-789012cdefgh', 12, 60, 30.00, 'Learn the basics of Pilates', true),
('ffffffff-ffff-4fff-afff-ffffffffffff', 'Advanced Pilates', 'pilates', 'advanced', 'c3d4e5f6-g7h8-4012-a456-789012cdefgh', 8, 75, 40.00, 'Challenge yourself with advanced Pilates', true);

-- Insert Student Packages (Current Active Packages)
INSERT INTO student_packages (id, student_id, package_type, remaining_classes, start_date, end_date, payment_status, last_payment_date, next_due_date, price, is_active) VALUES
-- Monthly packages
('sp1a2b3c-d4e5-f6g7-h8i9-j0k1l2m3n4o5', 's1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6', 'monthly', NULL, '2024-09-01', '2024-09-30', 'current', '2024-09-01', '2024-10-01', 120.00, true),
('sp2b3c4d-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 's2b3c4d5-e6f7-g8h9-i0j1-k2l3m4n5o6p7', 'monthly', NULL, '2024-09-01', '2024-09-30', 'current', '2024-09-01', '2024-10-01', 100.00, true),
('sp3c4d5e-f6g7-h8i9-j0k1-l2m3n4o5p6q7', 's3c4d5e6-f7g8-h9i0-j1k2-l3m4n5o6p7q8', 'monthly', NULL, '2024-08-01', '2024-08-31', 'overdue', '2024-08-01', '2024-09-01', 120.00, true),

-- 8-class packages
('sp4d5e6f-g7h8-i9j0-k1l2-m3n4o5p6q7r8', 's4d5e6f7-g8h9-i0j1-k2l3-m4n5o6p7q8r9', '8-class', 5, '2024-08-15', '2024-10-15', 'current', '2024-08-15', NULL, 180.00, true),
('sp5e6f7g-h8i9-j0k1-l2m3-n4o5p6q7r8s9', 's5e6f7g8-h9i0-j1k2-l3m4-n5o6p7q8r9s0', '8-class', 8, '2024-09-01', '2024-11-01', 'current', '2024-09-01', NULL, 200.00, true),
('sp6f7g8h-i9j0-k1l2-m3n4-o5p6q7r8s9t0', 's6f7g8h9-i0j1-k2l3-m4n5-o6p7q8r9s0t1', '8-class', 2, '2024-08-01', '2024-10-01', 'due', '2024-08-01', '2024-09-15', 160.00, true),

-- Drop-in packages
('sp7g8h9i-j0k1-l2m3-n4o5-p6q7r8s9t0u1', 's8h9i0j1-k2l3-m4n5-o6p7-q8r9s0t1u2v3', 'drop-in', 1, '2024-09-02', NULL, 'current', '2024-09-02', NULL, 30.00, true);

-- Insert Class Sessions (mix of past, current, and future)
INSERT INTO class_sessions (id, class_template_id, instructor_id, session_date, start_time, end_time, capacity, status, notes, is_recurring, recurrence_frequency, recurrence_days_of_week, recurrence_end_date, parent_session_id) VALUES
-- Today's classes (2024-09-02)
('cs1a2b3c-d4e5-f6g7-h8i9-j0k1l2m3n4o5', 'ct1a2b3c-d4e5-f6g7-h8i9-j0k1l2m3n4o5', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', CURRENT_DATE, '09:00', '10:00', 12, 'scheduled', 'Focus on basic positions', false, NULL, NULL, NULL, NULL),
('cs2b3c4d-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 'ct4d5e6f-g7h8-i9j0-k1l2-m3n4o5p6q7r8', 'b2c3d4e5-f6g7-8901-2345-678901bcdefg', CURRENT_DATE, '15:00', '15:45', 15, 'scheduled', 'Fun games and movements', false, NULL, NULL, NULL, NULL),
('cs3c4d5e-f6g7-h8i9-j0k1-l2m3n4o5p6q7', 'ct5e6f7g-h8i9-j0k1-l2m3-n4o5p6q7r8s9', 'c3d4e5f6-g7h8-9012-3456-789012cdefgh', CURRENT_DATE, '18:00', '19:00', 12, 'scheduled', 'Core strengthening focus', false, NULL, NULL, NULL, NULL),

-- This week's other classes
('cs4d5e6f-g7h8-i9j0-k1l2-m3n4o5p6q7r8', 'ct2b3c4d-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', CURRENT_DATE - 1, '10:00', '11:15', 10, 'completed', 'Great progress on port de bras', false, NULL, NULL, NULL, NULL),
('cs5e6f7g-h8i9-j0k1-l2m3-n4o5p6q7r8s9', 'ct3c4d5e-f6g7-h8i9-j0k1-l2m3n4o5p6q7', 'b2c3d4e5-f6g7-8901-2345-678901bcdefg', CURRENT_DATE - 2, '19:00', '20:30', 8, 'completed', 'Advanced combinations', false, NULL, NULL, NULL, NULL),
('cs6f7g8h-i9j0-k1l2-m3n4-o5p6q7r8s9t0', 'ct1a2b3c-d4e5-f6g7-h8i9-j0k1l2m3n4o5', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', CURRENT_DATE + 1, '09:00', '10:00', 12, 'scheduled', 'Work on turnout', false, NULL, NULL, NULL, NULL),
('cs7g8h9i-j0k1-l2m3-n4o5-p6q7r8s9t0u1', 'ct6f7g8h-i9j0-k1l2-m3n4-o5p6q7r8s9t0', 'c3d4e5f6-g7h8-9012-3456-789012cdefgh', CURRENT_DATE + 2, '17:00', '18:15', 8, 'scheduled', 'Challenging workout', false, NULL, NULL, NULL, NULL),

-- Past classes for trend data
('cs8h9i0j-k1l2-m3n4-o5p6-q7r8s9t0u1v2', 'ct1a2b3c-d4e5-f6g7-h8i9-j0k1l2m3n4o5', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', CURRENT_DATE - 7, '09:00', '10:00', 12, 'completed', 'Introduction to barre work', false, NULL, NULL, NULL, NULL),
('cs9i0j1k-l2m3-n4o5-p6q7-r8s9t0u1v2w3', 'ct2b3c4d-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', CURRENT_DATE - 8, '10:00', '11:15', 10, 'completed', 'Center work practice', false, NULL, NULL, NULL, NULL);

-- Insert Session Enrollments
INSERT INTO session_enrollments (session_id, student_id, enrollment_date, is_waitlist) VALUES
-- Today's classes enrollments
('cs1a2b3c-d4e5-f6g7-h8i9-j0k1l2m3n4o5', 's1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6', '2024-08-30 10:00:00', false),
('cs1a2b3c-d4e5-f6g7-h8i9-j0k1l2m3n4o5', 's3c4d5e6-f7g8-h9i0-j1k2-l3m4n5o6p7q8', '2024-08-30 11:00:00', false),
('cs1a2b3c-d4e5-f6g7-h8i9-j0k1l2m3n4o5', 's4d5e6f7-g8h9-i0j1-k2l3-m4n5o6p7q8r9', '2024-08-30 12:00:00', false),
('cs1a2b3c-d4e5-f6g7-h8i9-j0k1l2m3n4o5', 's5e6f7g8-h9i0-j1k2-l3m4-n5o6p7q8r9s0', '2024-08-31 09:00:00', false),

('cs2b3c4d-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 's2b3c4d5-e6f7-g8h9-i0j1-k2l3m4n5o6p7', '2024-08-29 14:00:00', false),
('cs2b3c4d-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 's6f7g8h9-i0j1-k2l3-m4n5-o6p7q8r9s0t1', '2024-08-29 15:00:00', false),
('cs2b3c4d-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 's8h9i0j1-k2l3-m4n5-o6p7-q8r9s0t1u2v3', '2024-08-30 10:00:00', false),

('cs3c4d5e-f6g7-h8i9-j0k1-l2m3n4o5p6q7', 's1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6', '2024-08-28 16:00:00', false),
('cs3c4d5e-f6g7-h8i9-j0k1-l2m3n4o5p6q7', 's5e6f7g8-h9i0-j1k2-l3m4-n5o6p7q8r9s0', '2024-08-29 08:00:00', false),

-- Past classes enrollments for attendance records
('cs4d5e6f-g7h8-i9j0-k1l2-m3n4o5p6q7r8', 's1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6', '2024-08-25 09:00:00', false),
('cs4d5e6f-g7h8-i9j0-k1l2-m3n4o5p6q7r8', 's3c4d5e6-f7g8-h9i0-j1k2-l3m4n5o6p7q8', '2024-08-25 10:00:00', false),
('cs4d5e6f-g7h8-i9j0-k1l2-m3n4o5p6q7r8', 's4d5e6f7-g8h9-i0j1-k2l3-m4n5o6p7q8r9', '2024-08-25 11:00:00', false),

('cs5e6f7g-h8i9-j0k1-l2m3-n4o5p6q7r8s9', 's2b3c4d5-e6f7-g8h9-i0j1-k2l3m4n5o6p7', '2024-08-24 15:00:00', false),
('cs5e6f7g-h8i9-j0k1-l2m3-n4o5p6q7r8s9', 's5e6f7g8-h9i0-j1k2-l3m4-n5o6p7q8r9s0', '2024-08-24 16:00:00', false);

-- Insert Attendance Records
INSERT INTO attendance_records (id, session_id, student_id, status, notes, marked_at, marked_by) VALUES
-- Past completed classes attendance
('ar1a2b3c-d4e5-f6g7-h8i9-j0k1l2m3n4o5', 'cs4d5e6f-g7h8-i9j0-k1l2-m3n4o5p6q7r8', 's1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6', 'present', 'Great focus today', CURRENT_TIMESTAMP - interval '1 day', 'a1b2c3d4-e5f6-7890-1234-567890abcdef'),
('ar2b3c4d-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 'cs4d5e6f-g7h8-i9j0-k1l2-m3n4o5p6q7r8', 's3c4d5e6-f7g8-h9i0-j1k2-l3m4n5o6p7q8', 'late', 'Arrived 10 minutes late', CURRENT_TIMESTAMP - interval '1 day', 'a1b2c3d4-e5f6-7890-1234-567890abcdef'),
('ar3c4d5e-f6g7-h8i9-j0k1-l2m3n4o5p6q7', 'cs4d5e6f-g7h8-i9j0-k1l2-m3n4o5p6q7r8', 's4d5e6f7-g8h9-i0j1-k2l3-m4n5o6p7q8r9', 'present', 'Excellent technique', CURRENT_TIMESTAMP - interval '1 day', 'a1b2c3d4-e5f6-7890-1234-567890abcdef'),

('ar4d5e6f-g7h8-i9j0-k1l2-m3n4o5p6q7r8', 'cs5e6f7g-h8i9-j0k1-l2m3-n4o5p6q7r8s9', 's2b3c4d5-e6f7-g8h9-i0j1-k2l3m4n5o6p7', 'present', 'Strong performance', CURRENT_TIMESTAMP - interval '2 days', 'b2c3d4e5-f6g7-8901-2345-678901bcdefg'),
('ar5e6f7g-h8i9-j0k1-l2m3-n4o5p6q7r8s9', 'cs5e6f7g-h8i9-j0k1-l2m3-n4o5p6q7r8s9', 's5e6f7g8-h9i0-j1k2-l3m4-n5o6p7q8r9s0', 'absent', 'Family emergency', CURRENT_TIMESTAMP - interval '2 days', 'b2c3d4e5-f6g7-8901-2345-678901bcdefg'),

-- More past attendance for better statistics
('ar6f7g8h-i9j0-k1l2-m3n4-o5p6q7r8s9t0', 'cs8h9i0j-k1l2-m3n4-o5p6-q7r8s9t0u1v2', 's1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6', 'present', 'Good progress', CURRENT_TIMESTAMP - interval '7 days', 'a1b2c3d4-e5f6-7890-1234-567890abcdef'),
('ar7g8h9i-j0k1-l2m3-n4o5-p6q7r8s9t0u1', 'cs8h9i0j-k1l2-m3n4-o5p6-q7r8s9t0u1v2', 's3c4d5e6-f7g8-h9i0-j1k2-l3m4n5o6p7q8', 'present', 'Improving flexibility', CURRENT_TIMESTAMP - interval '7 days', 'a1b2c3d4-e5f6-7890-1234-567890abcdef'),
('ar8h9i0j-k1l2-m3n4-o5p6-q7r8s9t0u1v2', 'cs9i0j1k-l2m3-n4o5-p6q7-r8s9t0u1v2w3', 's2b3c4d5-e6f7-g8h9-i0j1-k2l3m4n5o6p7', 'present', 'Excellent class', CURRENT_TIMESTAMP - interval '8 days', 'a1b2c3d4-e5f6-7890-1234-567890abcdef');

-- Insert Payments
INSERT INTO payments (id, student_id, student_package_id, amount, payment_method, payment_type, payment_date, due_date, description, recorded_by) VALUES
-- Recent payments (this month)
('p1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6', 's1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6', 'sp1a2b3c-d4e5-f6g7-h8i9-j0k1l2m3n4o5', 120.00, 'card', 'monthly', '2024-09-01', '2024-09-01', 'September monthly payment', 'a1b2c3d4-e5f6-7890-1234-567890abcdef'),
('p2b3c4d5-e6f7-g8h9-i0j1-k2l3m4n5o6p7', 's2b3c4d5-e6f7-g8h9-i0j1-k2l3m4n5o6p7', 'sp2b3c4d-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 100.00, 'cash', 'monthly', '2024-09-01', '2024-09-01', 'September monthly payment', 'a1b2c3d4-e5f6-7890-1234-567890abcdef'),
('p3c4d5e6-f7g8-h9i0-j1k2-l3m4n5o6p7q8', 's4d5e6f7-g8h9-i0j1-k2l3-m4n5o6p7q8r9', 'sp4d5e6f-g7h8-i9j0-k1l2-m3n4o5p6q7r8', 180.00, 'bank_transfer', '8-class', '2024-08-15', NULL, '8-class package payment', 'b2c3d4e5-f6g7-8901-2345-678901bcdefg'),
('p4d5e6f7-g8h9-i0j1-k2l3-m4n5o6p7q8r9', 's5e6f7g8-h9i0-j1k2-l3m4-n5o6p7q8r9s0', 'sp5e6f7g-h8i9-j0k1-l2m3-n4o5p6q7r8s9', 200.00, 'card', '8-class', '2024-09-01', NULL, '8-class package payment', 'c3d4e5f6-g7h8-9012-3456-789012cdefgh'),
('p5e6f7g8-h9i0-j1k2-l3m4-n5o6p7q8r9s0', 's8h9i0j1-k2l3-m4n5-o6p7-q8r9s0t1u2v3', 'sp7g8h9i-j0k1-l2m3-n4o5-p6q7r8s9t0u1', 30.00, 'cash', 'drop-in', '2024-09-02', NULL, 'Single class payment', 'c3d4e5f6-g7h8-9012-3456-789012cdefgh'),

-- Previous month payments for trends
('p6f7g8h9-i0j1-k2l3-m4n5-o6p7q8r9s0t1', 's1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6', NULL, 120.00, 'card', 'monthly', '2024-08-01', '2024-08-01', 'August monthly payment', 'a1b2c3d4-e5f6-7890-1234-567890abcdef'),
('p7g8h9i0-j1k2-l3m4-n5o6-p7q8r9s0t1u2', 's2b3c4d5-e6f7-g8h9-i0j1-k2l3m4n5o6p7', NULL, 100.00, 'cash', 'monthly', '2024-08-01', '2024-08-01', 'August monthly payment', 'a1b2c3d4-e5f6-7890-1234-567890abcdef'),
('p8h9i0j1-k2l3-m4n5-o6p7-q8r9s0t1u2v3', 's3c4d5e6-f7g8-h9i0-j1k2-l3m4n5o6p7q8', 'sp3c4d5e-f6g7-h8i9-j0k1-l2m3n4o5p6q7', 120.00, 'bank_transfer', 'monthly', '2024-08-01', '2024-08-01', 'August monthly payment (now overdue)', 'a1b2c3d4-e5f6-7890-1234-567890abcdef');

-- Insert Activities (Recent Activities for Dashboard)
INSERT INTO activities (id, activity_type, title, description, student_id, session_id, payment_id, priority, created_at) VALUES
('act1a2b3-c4d5-e6f7-g8h9-i0j1k2l3m4n5', 'payment', 'Payment Received', 'Monthly payment from Alice Smith for September', 's1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6', NULL, 'p1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6', 'high', CURRENT_TIMESTAMP - interval '1 hour'),
('act2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6', 'registration', 'New Student Registration', 'Henry Park completed registration and enrolled in Kids Ballet', 's8h9i0j1-k2l3-m4n5-o6p7-q8r9s0t1u2v3', NULL, NULL, 'medium', CURRENT_TIMESTAMP - interval '2 hours'),
('act3c4d5-e6f7-g8h9-i0j1-k2l3m4n5o6p7', 'enrollment', 'Class Enrollment', 'Bob Johnson enrolled in Kids Ballet class for today', 's2b3c4d5-e6f7-g8h9-i0j1-k2l3m4n5o6p7', 'cs2b3c4d-e5f6-g7h8-i9j0-k1l2m3n4o5p6', NULL, 'low', CURRENT_TIMESTAMP - interval '3 hours'),
('act4d5e6-f7g8-h9i0-j1k2-l3m4n5o6p7q8', 'attendance', 'Attendance Marked', 'Attendance marked for Intermediate Ballet class', NULL, 'cs4d5e6f-g7h8-i9j0-k1l2-m3n4o5p6q7r8', NULL, 'low', CURRENT_TIMESTAMP - interval '1 day'),
('act5e6f7-g8h9-i0j1-k2l3-m4n5o6p7q8r9', 'class', 'Class Completed', 'Advanced Ballet class completed successfully', NULL, 'cs5e6f7g-h8i9-j0k1-l2m3-n4o5p6q7r8s9', NULL, 'medium', CURRENT_TIMESTAMP - interval '2 days'),
('act6f7g8-h9i0-j1k2-l3m4-n5o6p7q8r9s0', 'payment', 'Payment Overdue', 'Carol Davis monthly payment is now overdue', 's3c4d5e6-f7g8-h9i0-j1k2-l3m4n5o6p7q8', NULL, NULL, 'high', CURRENT_TIMESTAMP - interval '3 hours'),
('act7g8h9-i0j1-k2l3-m4n5-o6p7q8r9s0t1', 'enrollment', 'Waitlist Addition', 'Grace Lee added to waitlist for Beginner Ballet', 's7g8h9i0-j1k2-l3m4-n5o6-p7q8r9s0t1u2', 'cs1a2b3c-d4e5-f6g7-h8i9-j0k1l2m3n4o5', NULL, 'medium', CURRENT_TIMESTAMP - interval '4 hours'),
('act8h9i0-j1k2-l3m4-n5o6-p7q8r9s0t1u2', 'payment', 'Package Purchased', 'Elena Vasquez purchased 8-class package', 's5e6f7g8-h9i0-j1k2-l3m4-n5o6p7q8r9s0', NULL, 'p4d5e6f7-g8h9-i0j1-k2l3-m4n5o6p7q8r9', 'medium', CURRENT_TIMESTAMP - interval '5 hours'),
('act9i0j1-k2l3-m4n5-o6p7-q8r9s0t1u2v3', 'class', 'Class Scheduled', 'New Advanced Pilates class scheduled for this week', NULL, 'cs7g8h9i-j0k1-l2m3-n4o5-p6q7r8s9t0u1', NULL, 'low', CURRENT_TIMESTAMP - interval '6 hours'),
('act0j1k2-l3m4-n5o6-p7q8-r9s0t1u2v3w4', 'attendance', 'Late Arrival', 'Carol Davis arrived late to Intermediate Ballet', 's3c4d5e6-f7g8-h9i0-j1k2-l3m4n5o6p7q8', 'cs4d5e6f-g7h8-i9j0-k1l2-m3n4o5p6q7r8', NULL, 'medium', CURRENT_TIMESTAMP - interval '1 day');

-- Update settings with proper targets
INSERT INTO settings (key, value, description) VALUES
('monthly_revenue_target', '6000', 'Monthly revenue target in dollars'),
('weekly_income_target', '1200', 'Weekly income target in dollars'),
('studio_capacity', '50', 'Maximum total studio capacity'),
('max_class_size', '15', 'Maximum students per class')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = CURRENT_TIMESTAMP;

-- Add some makeup sessions and additional complexity
INSERT INTO payments (id, student_id, student_package_id, amount, payment_method, payment_type, payment_date, due_date, description, recorded_by) VALUES
('pm1a2b3c-d4e5-f6g7-h8i9-j0k1l2m3n4o5', 's6f7g8h9-i0j1-k2l3-m4n5-o6p7q8r9s0t1', NULL, 25.00, 'card', 'makeup', '2024-08-25', NULL, 'Makeup class for missed session', 'b2c3d4e5-f6g7-8901-2345-678901bcdefg'),
('pm2b3c4d-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 's7g8h9i0-j1k2-l3m4-n5o6-p7q8r9s0t1u2', NULL, 20.00, 'cash', 'drop-in', '2024-08-20', NULL, 'Single drop-in class', 'c3d4e5f6-g7h8-9012-3456-789012cdefgh');

SELECT 'Sample data inserted successfully!' as result;