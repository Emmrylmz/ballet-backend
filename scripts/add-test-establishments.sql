-- Test establishments and user-establishment relationships

-- Create test establishments
INSERT INTO establishments (id, name, business_name, address, phone, email, created_at, updated_at) 
VALUES 
  ('est-1', 'İstanbul Balet Okulu', 'İstanbul Balet Akademisi Ltd.', 'Beşiktaş, İstanbul', '+90 212 555 0101', 'info@istanbulbalet.com', NOW(), NOW()),
  ('est-2', 'Ankara Dans Merkezi', 'Ankara Dans ve Sanat Merkezi', 'Çankaya, Ankara', '+90 312 555 0202', 'info@ankaradans.com', NOW(), NOW()),
  ('est-3', 'İzmir Sanat Akademisi', 'İzmir Sanat ve Kültür Akademisi', 'Konak, İzmir', '+90 232 555 0303', 'info@izmirsanat.com', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  business_name = EXCLUDED.business_name,
  updated_at = NOW();

-- Add test user-establishment relationships
-- Assuming we have a test user, let's create one first if it doesn't exist
INSERT INTO users (id, email, password_hash, first_name, last_name, status, email_verified, created_at, updated_at)
VALUES (
  'test-user-123', 
  'test@example.com', 
  '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEF', -- This is a dummy hash
  'Test', 
  'User', 
  'active', 
  true, 
  NOW(), 
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = NOW();

-- Now add user-establishment relationships for the test user
INSERT INTO user_establishments (user_id, establishment_id, role, status, is_primary, assigned_by, created_at, updated_at)
VALUES 
  ((SELECT id FROM users WHERE email = 'test@example.com'), 'est-1', 'instructor', 'active', true, null, NOW(), NOW()),
  ((SELECT id FROM users WHERE email = 'test@example.com'), 'est-2', 'student', 'active', false, null, NOW(), NOW()),
  ((SELECT id FROM users WHERE email = 'test@example.com'), 'est-3', 'manager', 'active', false, null, NOW(), NOW())
ON CONFLICT (user_id, establishment_id) DO UPDATE SET
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Verify the data
SELECT 
  u.email,
  u.first_name,
  u.last_name,
  e.name as establishment_name,
  ue.role,
  ue.is_primary,
  ue.status
FROM users u
JOIN user_establishments ue ON u.id = ue.user_id
JOIN establishments e ON ue.establishment_id = e.id
WHERE u.email = 'test@example.com'
ORDER BY ue.is_primary DESC, e.name;