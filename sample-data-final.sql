-- Sample Data for Ballet Management System
-- Run this after the main schema is created

-- Clear existing data and settings
TRUNCATE TABLE activities, payments, attendance_records, session_enrollments, 
                class_sessions, student_packages, class_templates, students, instructors, settings
                RESTART IDENTITY CASCADE;

-- Insert Instructors (simplified UUIDs)
INSERT INTO instructors (id, name, email, phone, specialization, is_active) VALUES
('a1b2c3d4-e5f6-4890-a234-567890abcdef', 'Sarah Johnson', 'sarah@ballet.com', '+1234567890', ARRAY['ballet', 'pilates'], true),
('a2b3c4d5-e6f7-4801-a345-678901bcdefg', 'Emma Wilson', 'emma@ballet.com', '+1234567891', ARRAY['ballet'], true),
('a3d4e5f6-a7b8-4012-a456-789012cdefgh', 'Lisa Chen', 'lisa@ballet.com', '+1234567892', ARRAY['pilates'], true),
('a4e5f6a7-b8c9-4123-a567-890123defghi', 'Maria Rodriguez', 'maria@ballet.com', '+1234567893', ARRAY['ballet'], false);

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
('cccccccc-cccc-4ccc-accc-cccccccccccc', 'Advanced Ballet', 'ballet', 'advanced', 'a2b3c4d5-e6f7-4801-a345-678901bcdefg', 8, 90, 45.00, 'For experienced ballet dancers', true),
('dddddddd-dddd-4ddd-addd-dddddddddddd', 'Kids Ballet (Ages 5-8)', 'ballet', 'kids', 'a2b3c4d5-e6f7-4801-a345-678901bcdefg', 15, 45, 20.00, 'Fun introduction to ballet for young children', true),
('eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee', 'Pilates Fundamentals', 'pilates', 'beginner', 'a3d4e5f6-a7b8-4012-a456-789012cdefgh', 12, 60, 30.00, 'Learn the basics of Pilates', true),
('ffffffff-ffff-4fff-afff-ffffffffffff', 'Advanced Pilates', 'pilates', 'advanced', 'a3d4e5f6-a7b8-4012-a456-789012cdefgh', 8, 75, 40.00, 'Challenge yourself with advanced Pilates', true);

-- Insert Student Packages
INSERT INTO student_packages (id, student_id, package_type, remaining_classes, start_date, end_date, payment_status, last_payment_date, next_due_date, price, is_active) VALUES
-- Monthly packages
('99999999-9999-4999-a999-999999999999', '11111111-1111-4111-a111-111111111111', 'monthly', NULL, '2024-09-01', '2024-09-30', 'current', '2024-09-01', '2024-10-01', 120.00, true),
('10101010-1010-4010-a010-101010101010', '22222222-2222-4222-a222-222222222222', 'monthly', NULL, '2024-09-01', '2024-09-30', 'current', '2024-09-01', '2024-10-01', 100.00, true),
('20202020-2020-4020-a020-202020202020', '33333333-3333-4333-a333-333333333333', 'monthly', NULL, '2024-08-01', '2024-08-31', 'overdue', '2024-08-01', '2024-09-01', 120.00, true),

-- 8-class packages
('30303030-3030-4030-a030-303030303030', '44444444-4444-4444-a444-444444444444', '8-class', 5, '2024-08-15', '2024-10-15', 'current', '2024-08-15', NULL, 180.00, true),
('40404040-4040-4040-a040-404040404040', '55555555-5555-4555-a555-555555555555', '8-class', 8, '2024-09-01', '2024-11-01', 'current', '2024-09-01', NULL, 200.00, true),
('50505050-5050-4050-a050-505050505050', '66666666-6666-4666-a666-666666666666', '8-class', 2, '2024-08-01', '2024-10-01', 'due', '2024-08-01', '2024-09-15', 160.00, true),

-- Drop-in packages
('60606060-6060-4060-a060-606060606060', '88888888-8888-4888-a888-888888888888', 'drop-in', 1, '2024-09-02', NULL, 'current', '2024-09-02', NULL, 30.00, true);

-- Insert Class Sessions
INSERT INTO class_sessions (id, class_template_id, instructor_id, session_date, start_time, end_time, capacity, status) VALUES
-- Today's classes
('70707070-7070-4070-a070-707070707070', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'a1b2c3d4-e5f6-4890-a234-567890abcdef', CURRENT_DATE, '09:00:00', '10:00:00', 12, 'scheduled'),
('80808080-8080-4080-a080-808080808080', 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', 'a1b2c3d4-e5f6-4890-a234-567890abcdef', CURRENT_DATE, '10:30:00', '11:45:00', 10, 'scheduled'),
('90909090-9090-4090-a090-909090909090', 'dddddddd-dddd-4ddd-addd-dddddddddddd', 'a2b3c4d5-e6f7-4801-a345-678901bcdefg', CURRENT_DATE, '15:00:00', '15:45:00', 15, 'scheduled'),

-- This week's classes
('01010101-0101-4101-a101-010101010101', 'eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee', 'a3d4e5f6-a7b8-4012-a456-789012cdefgh', CURRENT_DATE + INTERVAL '1 day', '18:00:00', '19:00:00', 12, 'scheduled'),
('02020202-0202-4202-a202-020202020202', 'cccccccc-cccc-4ccc-accc-cccccccccccc', 'a2b3c4d5-e6f7-4801-a345-678901bcdefg', CURRENT_DATE + INTERVAL '2 days', '19:00:00', '20:30:00', 8, 'scheduled'),
('03030303-0303-4303-a303-030303030303', 'ffffffff-ffff-4fff-afff-ffffffffffff', 'a3d4e5f6-a7b8-4012-a456-789012cdefgh', CURRENT_DATE + INTERVAL '3 days', '17:30:00', '18:45:00', 8, 'scheduled'),

-- Past classes
('04040404-0404-4404-a404-040404040404', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'a1b2c3d4-e5f6-4890-a234-567890abcdef', CURRENT_DATE - INTERVAL '1 day', '09:00:00', '10:00:00', 12, 'completed'),
('05050505-0505-4505-a505-050505050505', 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', 'a1b2c3d4-e5f6-4890-a234-567890abcdef', CURRENT_DATE - INTERVAL '2 days', '10:30:00', '11:45:00', 10, 'completed'),
('06060606-0606-4606-a606-060606060606', 'eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee', 'a3d4e5f6-a7b8-4012-a456-789012cdefgh', CURRENT_DATE - INTERVAL '3 days', '18:00:00', '19:00:00', 12, 'completed');

-- Insert Session Enrollments
INSERT INTO session_enrollments (id, session_id, student_id, enrollment_date) VALUES
-- Today's enrollments
('07070707-0707-4707-a707-070707070707', '70707070-7070-4070-a070-707070707070', '11111111-1111-4111-a111-111111111111', '2024-08-28 10:00:00'),
('08080808-0808-4808-a808-080808080808', '70707070-7070-4070-a070-707070707070', '22222222-2222-4222-a222-222222222222', '2024-08-28 10:15:00'),
('09090909-0909-4909-a909-090909090909', '80808080-8080-4080-a080-808080808080', '33333333-3333-4333-a333-333333333333', '2024-08-29 14:30:00'),
('10101010-1010-4010-b010-101010101010', '90909090-9090-4090-a090-909090909090', '44444444-4444-4444-a444-444444444444', '2024-08-30 11:20:00'),

-- Past enrollments
('11111111-1111-4111-b111-111111111111', '04040404-0404-4404-a404-040404040404', '11111111-1111-4111-a111-111111111111', '2024-08-25 09:00:00'),
('12121212-1212-4212-a212-121212121212', '05050505-0505-4505-a505-050505050505', '22222222-2222-4222-a222-222222222222', '2024-08-26 16:45:00'),
('13131313-1313-4313-a313-131313131313', '06060606-0606-4606-a606-060606060606', '55555555-5555-4555-a555-555555555555', '2024-08-27 12:30:00');

-- Insert Attendance Records
INSERT INTO attendance_records (id, session_id, student_id, status, notes) VALUES
('14141414-1414-4414-a414-141414141414', '04040404-0404-4404-a404-040404040404', '11111111-1111-4111-a111-111111111111', 'present', 'Great improvement in posture'),
('15151515-1515-4515-a515-151515151515', '05050505-0505-4505-a505-050505050505', '22222222-2222-4222-a222-222222222222', 'present', 'Worked on advanced combinations'),
('16161616-1616-4616-a616-161616161616', '06060606-0606-4606-a606-060606060606', '55555555-5555-4555-a555-555555555555', 'late', 'Arrived 10 minutes late');

-- Insert Payments (using correct enum values)
INSERT INTO payments (id, student_id, student_package_id, amount, payment_method, payment_type, payment_date, description) VALUES
-- Recent payments
('17171717-1717-4717-a717-171717171717', '11111111-1111-4111-a111-111111111111', '99999999-9999-4999-a999-999999999999', 120.00, 'card', 'package', '2024-09-01', 'Monthly package payment'),
('18181818-1818-4818-a818-181818181818', '22222222-2222-4222-a222-222222222222', '10101010-1010-4010-a010-101010101010', 100.00, 'bank_transfer', 'package', '2024-09-01', 'Monthly package payment'),
('19191919-1919-4919-a919-191919191919', '44444444-4444-4444-a444-444444444444', '30303030-3030-4030-a030-303030303030', 180.00, 'card', 'package', '2024-08-15', '8-class package payment'),

-- Drop-in payment
('21212121-2121-4121-a121-212121212121', '88888888-8888-4888-a888-888888888888', '60606060-6060-4060-a060-606060606060', 30.00, 'cash', 'drop_in', '2024-09-02', 'Drop-in class payment');

-- Insert Activities
INSERT INTO activities (id, activity_type, title, description, student_id, payment_id, created_at) VALUES
('22222222-2222-4222-b222-222222222222', 'payment', 'Payment Received', 'Payment received from Alice Smith for monthly package', '11111111-1111-4111-a111-111111111111', '17171717-1717-4717-a717-171717171717', '2024-09-01 10:30:00'),
('23232323-2323-4323-a323-232323232323', 'enrollment', 'Class Enrollment', 'Bob Johnson enrolled in Beginner Ballet class', '22222222-2222-4222-a222-222222222222', NULL, '2024-08-28 14:15:00'),
('24242424-2424-4424-a424-242424242424', 'payment', 'Payment Received', 'Payment received from Diana Prince for 8-class package', '44444444-4444-4444-a444-444444444444', '19191919-1919-4919-a919-191919191919', '2024-08-15 16:45:00'),
('25252525-2525-4525-a525-252525252525', 'attendance', 'Class Attendance', 'Elena Vasquez attended Pilates Fundamentals class', '55555555-5555-4555-a555-555555555555', NULL, CURRENT_DATE - INTERVAL '3 days' + TIME '18:30:00'),
('26262626-2626-4626-a626-262626262626', 'payment', 'Overdue Payment', 'Payment overdue for Carol Davis monthly package', '33333333-3333-4333-a333-333333333333', NULL, '2024-09-01 00:00:00'),
('28282828-2828-4828-a828-282828282828', 'payment', 'Payment Received', 'Drop-in payment received from Henry Park', '88888888-8888-4888-a888-888888888888', '21212121-2121-4121-a121-212121212121', '2024-09-02 09:15:00');

-- Insert Settings
INSERT INTO settings (key, value, description) VALUES
('monthly_revenue_target', '"5000.00"', 'Monthly revenue target for the studio'),
('weekly_revenue_target', '"1250.00"', 'Weekly revenue target for the studio'),
('daily_revenue_target', '"178.57"', 'Daily revenue target for the studio'),
('class_cancellation_hours', '"24"', 'Hours before class when cancellation is allowed'),
('max_students_per_class', '"15"', 'Maximum number of students allowed per class'),
('studio_email', '"info@balletstudio.com"', 'Main studio contact email'),
('studio_phone', '"+1-555-BALLET"', 'Main studio contact phone number');

SELECT 'Sample data inserted successfully!' as result;