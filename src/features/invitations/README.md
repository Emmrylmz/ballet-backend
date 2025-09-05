# Invitation System

A comprehensive invitation system that allows managers to invite instructors and instructors to invite students with role-based access control and configurable expiry settings.

## Features

### 🎯 **Role-Based Invitations**
- **Managers** can invite instructors
- **Instructors** can invite students to classes
- **Role verification** at database level

### 🔗 **Dynamic Invitation Links**
- **Secure token-based** invitation URLs
- **One-time use** for instructor invitations
- **Configurable expiry** for student invitations (max 24 hours)
- **Automatic cleanup** of expired invitations

### ⚙️ **Configurable Settings**
- **Maximum expiry hours** for student invitations
- **Enable/disable** invitation types per establishment
- **Default expiry settings**
- **Approval requirements** for instructors

### 🛡️ **Security Features**
- **JWT authentication** required for protected endpoints
- **Rate limiting** on invitation creation and acceptance
- **Email validation** and duplicate prevention
- **Audit trail** for all invitation actions

## Database Schema

Run the following SQL to set up the invitation system:

```bash
# Apply the schema
psql -d ballet_neli -f database-invitations-schema.sql
```

## API Endpoints

### Public Endpoints (No Authentication)

#### Validate Invitation Token
```http
GET /invitations/validate/{token}
```

#### Accept Invitation
```http
POST /invitations/accept/{token}
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe", 
  "password": "securepassword",
  "phone": "+1234567890",
  "emergencyContact": "+1234567891",
  "emergencyContactName": "Jane Doe",
  "birthDate": "1990-01-01",
  "medicalNotes": "No known allergies"
}
```

### Protected Endpoints (Authentication Required)

#### Invite Instructor (Managers Only)
```http
POST /invitations/invite-instructor
Authorization: Bearer {jwt_token}
X-Establishment-ID: {establishment_id}
Content-Type: application/json

{
  "email": "instructor@example.com",
  "message": "Welcome to our team!"
}
```

#### Invite Student (Instructors & Managers)
```http
POST /invitations/invite-student
Authorization: Bearer {jwt_token}
X-Establishment-ID: {establishment_id}
Content-Type: application/json

{
  "email": "student@example.com",
  "sessionId": "uuid-of-class-session",
  "message": "Join our ballet class!",
  "expiryHours": 12
}
```

#### Get Invitations (Managers Only)
```http
GET /invitations?type=student&status=pending&limit=10
Authorization: Bearer {jwt_token}
X-Establishment-ID: {establishment_id}
```

#### Revoke Invitation (Managers Only)
```http
POST /invitations/{invitationId}/revoke
Authorization: Bearer {jwt_token}
X-Establishment-ID: {establishment_id}
```

#### Invitation Settings
```http
# Get settings
GET /invitations/settings
Authorization: Bearer {jwt_token}

# Update settings  
PUT /invitations/settings
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "studentInvitationMaxHours": 24,
  "instructorInvitationEnabled": true,
  "studentInvitationEnabled": true,
  "defaultExpiryHours": 12
}
```

#### Get Statistics
```http
GET /invitations/stats
Authorization: Bearer {jwt_token}
X-Establishment-ID: {establishment_id}
```

## Integration Guide

### 1. **Add to Main Application**

```typescript
// In your main app.ts or routes setup
import { createInvitationModule } from './features/invitations/invitation.factory.js';

const invitationRoutes = createInvitationModule(
  db,
  logger, 
  tokenService,
  authRepository,
  passwordService
);

app.use('/api/invitations', invitationRoutes);
```

### 2. **Start Cleanup Service**

```typescript
import { InvitationCleanupService } from './features/invitations/invitation.cleanup.service.js';
import { InvitationRepository } from './features/invitations/invitation.repository.js';

const invitationRepository = new InvitationRepository(db);
const cleanupService = new InvitationCleanupService(invitationRepository, logger);

// Start the cleanup service
cleanupService.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  cleanupService.stop();
});
```

### 3. **Environment Variables**

```bash
# .env file
FRONTEND_URL=http://localhost:3000
INVITATION_EMAIL_ENABLED=true
```

## Usage Examples

### Frontend Integration

```typescript
// Validate invitation token
const response = await fetch(`/api/invitations/validate/${token}`);
const { data } = await response.json();

if (data) {
  // Show registration form with establishment info
  console.log(`Join ${data.establishmentName} as ${data.type}`);
}

// Accept invitation
const registrationData = {
  firstName: 'John',
  lastName: 'Doe',
  password: 'securepassword',
  // ... other fields
};

const acceptResponse = await fetch(`/api/invitations/accept/${token}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(registrationData)
});
```

### Manager Dashboard

```typescript
// Send instructor invitation
const inviteInstructor = async (email: string, message?: string) => {
  const response = await fetch('/api/invitations/invite-instructor', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Establishment-ID': establishmentId
    },
    body: JSON.stringify({ email, message })
  });
  
  return response.json();
};

// Get invitation statistics
const getStats = async () => {
  const response = await fetch('/api/invitations/stats', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Establishment-ID': establishmentId
    }
  });
  
  return response.json();
};
```

### Instructor Class Management

```typescript
// Invite student to specific class
const inviteToClass = async (email: string, sessionId: string) => {
  const response = await fetch('/api/invitations/invite-student', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Establishment-ID': establishmentId
    },
    body: JSON.stringify({
      email,
      sessionId,
      message: 'Join our ballet class this week!',
      expiryHours: 24
    })
  });
  
  return response.json();
};
```

## Security Considerations

### ✅ **Implemented Safeguards**
- **Rate limiting** (20 invitations/hour per user)
- **Token expiry** enforcement
- **Role-based access control** 
- **Email validation**
- **Duplicate invitation** prevention
- **Audit logging** for all actions

### 🔒 **Best Practices**
- Use HTTPS in production
- Set strong JWT secrets
- Monitor invitation usage
- Regular cleanup of expired data
- Validate all input data

## Monitoring & Maintenance

### Automatic Cleanup
- **Expired invitations** marked every hour
- **Old audit logs** cleaned up after 90 days
- **Unused tokens** automatically invalidated

### Health Checks
```sql
-- Check invitation health
SELECT 
  status,
  type,
  COUNT(*) as count
FROM invitations 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY status, type;
```

### Performance Optimization
- **Indexed queries** for fast lookups
- **Parallel execution** for related queries  
- **Cached role checks**
- **Batch operations** where possible

## Troubleshooting

### Common Issues

**"Invitation not found"**
- Token may be expired or invalid
- Check token format and expiry

**"Insufficient permissions"**
- Verify user role (manager for instructors, instructor+ for students)
- Check establishment access

**"User already exists"**
- Email already registered in establishment
- Use different email or check existing users

### Debug Queries

```sql
-- Find pending invitations
SELECT * FROM invitation_details WHERE status = 'pending';

-- Check user permissions
SELECT u.email, u.role, u.establishment_id 
FROM users u WHERE u.id = 'user-id';

-- View invitation audit trail
SELECT * FROM invitation_audit_log 
WHERE invitation_id = 'invitation-id' 
ORDER BY created_at DESC;
```