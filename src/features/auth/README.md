# Authentication Module

A production-level authentication module for the Ballet Studio Management system with comprehensive security features, deep-link user activation, and role-based access control.

## Features

### 🔐 Core Authentication
- User registration with email verification
- Account activation via deep links 
- Secure login/logout with JWT tokens
- Password reset with email links
- Token refresh mechanism
- Multi-tenant establishment support

### 🛡️ Security Features
- bcrypt password hashing (12 rounds)
- Rate limiting and login attempt tracking
- Account lockout after failed attempts
- Password strength validation
- Email verification required
- Audit logging for all auth events
- Session management with revocation

### 👥 Role-Based Access Control (RBAC)
- 5 user roles: `super_admin`, `admin`, `instructor`, `student`, `parent`
- Permission-based middleware
- Establishment-scoped access control
- Dynamic permission assignment

### 📧 Email Integration
- Beautiful HTML email templates
- Account activation emails
- Password reset emails  
- Welcome emails after activation
- Development console email provider
- Production SMTP provider ready

### 🏢 Multi-Tenant Architecture
- Establishment-based isolation
- Per-establishment user management
- Cross-establishment access for super admins
- Establishment context validation

## API Endpoints

### Public Routes
```
POST /api/v1/auth/login            - User login
POST /api/v1/auth/register         - User registration  
POST /api/v1/auth/activate         - Account activation
POST /api/v1/auth/forgot-password  - Request password reset
POST /api/v1/auth/reset-password   - Reset password with token
POST /api/v1/auth/refresh-token    - Refresh access token
POST /api/v1/auth/check-password-strength - Validate password
GET  /api/v1/auth/health           - Health check
```

### Protected Routes (require authentication)
```
POST /api/v1/auth/logout           - User logout
POST /api/v1/auth/change-password  - Change password
GET  /api/v1/auth/me              - Get current user
GET  /api/v1/auth/validate-token  - Validate current token
GET  /api/v1/auth/sessions        - Get user sessions
DELETE /api/v1/auth/sessions/:id  - Revoke session
```

## Components

### Services

#### `TokenService`
- JWT token generation and verification
- Access token (15 min) and refresh token (7 days) management
- Secure token storage with database sessions
- Token revocation and cleanup

#### `PasswordService`
- bcrypt password hashing
- Password strength validation
- Entropy calculation
- Secure temporary password generation
- Compromised password checking

#### `EmailService`
- Email template rendering
- Deep-link generation for activation
- Development and production email providers
- Beautiful HTML templates with CSS styling

#### `AuthService`
Main authentication business logic:
- User registration and activation flows
- Login with rate limiting
- Password reset workflows
- Token management
- Comprehensive error handling

### Middleware

#### `AuthMiddleware`
- Token extraction and verification
- User authentication
- Role-based route protection
- Permission checking
- Establishment access control
- Request logging
- Rate limiting by user

### Repository & Database

#### `AuthRepository`
- User CRUD operations
- Permission management
- Audit logging
- Session management
- Establishment queries

#### Database Tables
- `users` - User accounts and profiles
- `user_sessions` - Active refresh tokens
- `user_invitations` - Invitation tokens
- `auth_audit_logs` - Security event logging
- `permissions` & `role_permissions` - RBAC system

## Configuration

### Environment Variables
```env
# JWT Secrets (CHANGE IN PRODUCTION!)
JWT_ACCESS_SECRET=your-super-secret-jwt-access-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key-change-in-production

# Frontend Configuration
FRONTEND_URL=http://localhost:3000
COMPANY_NAME=Ballet Studio Management
SUPPORT_EMAIL=support@balletmanagement.com
```

### Security Settings
```typescript
{
  maxLoginAttempts: 5,           // Max failed login attempts
  lockoutDuration: 15,           // Lockout duration in minutes
  passwordMinLength: 8,          // Minimum password length
  passwordRequireUppercase: true, // Require uppercase letters
  passwordRequireLowercase: true, // Require lowercase letters  
  passwordRequireNumbers: true,   // Require numbers
  passwordRequireSymbols: true,   // Require special characters
  tokenExpiryTime: 15,           // Access token expiry (minutes)
  refreshTokenExpiryTime: 7,     // Refresh token expiry (days)
  activationTokenExpiry: 24,     // Activation token expiry (hours)
  passwordResetTokenExpiry: 1    // Reset token expiry (hours)
}
```

## Usage Examples

### Protecting Routes with Middleware

```typescript
// Require authentication
app.use('/api/v1/protected', authMiddleware.authenticate());

// Require specific roles
app.use('/api/v1/admin', 
  authMiddleware.authenticate(),
  authMiddleware.requireRoles('admin', 'super_admin')
);

// Require specific permissions
app.use('/api/v1/students',
  authMiddleware.authenticate(),
  authMiddleware.requirePermissions('students:read')
);

// Establishment access control
app.use('/api/v1/establishment/:establishmentId',
  authMiddleware.authenticate(),
  authMiddleware.requireEstablishmentAccess()
);
```

### Registration Flow

```typescript
// 1. User submits registration
const response = await fetch('/api/v1/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'student',
    establishmentId: 'establishment-uuid'
  })
});

// 2. User receives activation email with deep link
// Link format: https://app.com/auth/activate?token=activation-token

// 3. User clicks link and activates account
const activateResponse = await fetch('/api/v1/auth/activate', {
  method: 'POST',
  body: JSON.stringify({
    token: 'activation-token-from-email'
  })
});

// Returns: { user, tokens, establishmentInfo }
```

### Login Flow

```typescript
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    establishmentId: 'establishment-uuid', // Optional for super_admin
    rememberMe: true
  })
});

const { user, tokens, establishmentInfo } = response.data;
// Store tokens securely (httpOnly cookies recommended)
```

### Using Authentication in Requests

```typescript
// Include access token in Authorization header
const response = await fetch('/api/v1/protected-endpoint', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

// Handle token expiration
if (response.status === 401) {
  // Refresh token
  const refreshResponse = await fetch('/api/v1/auth/refresh-token', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });
  
  if (refreshResponse.ok) {
    const { accessToken: newAccessToken } = refreshResponse.data;
    // Retry original request with new token
  } else {
    // Redirect to login
  }
}
```

## Security Best Practices

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one number
- At least one special character
- No common weak passwords
- No sequential characters (123, abc)
- Limited repeated characters

### Token Security
- Access tokens expire after 15 minutes
- Refresh tokens expire after 7 days
- Refresh tokens stored as hashed values
- All user tokens revoked on password change
- Session tracking with IP and user agent

### Rate Limiting
- 5 failed login attempts per email/IP
- 15-minute lockout after max attempts
- Per-user API rate limiting available
- Comprehensive audit logging

### Email Security
- Activation tokens expire after 24 hours
- Password reset tokens expire after 1 hour
- All email links are single-use
- Email enumeration protection

## Error Handling

The auth module uses custom `AuthError` class with structured error responses:

```typescript
{
  success: false,
  message: "User-friendly error message",
  code: "ERROR_CODE",
  details?: { additional: "context" }
}
```

### Common Error Codes
- `INVALID_CREDENTIALS` - Wrong email/password
- `ACCOUNT_NOT_ACTIVATED` - Account needs activation
- `ACCOUNT_SUSPENDED` - Account is suspended
- `TOO_MANY_ATTEMPTS` - Rate limit exceeded
- `WEAK_PASSWORD` - Password doesn't meet requirements
- `EMAIL_ALREADY_EXISTS` - Email already registered
- `TOKEN_INVALID` - Invalid or expired token
- `INSUFFICIENT_PERMISSIONS` - Access denied

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES establishments(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL,
    status user_status DEFAULT 'active',
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Sessions Table  
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Audit Logs Table
```sql
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
```

## Integration

The auth module integrates seamlessly with the application:

```typescript
// In Application.ts
private async setupAuthModule(): Promise<void> {
  const authFactory = AuthFactory.getInstance();
  const authModule = authFactory.createAuthModule(
    this.database,
    this.logger,
    this.config.auth
  );
  
  this.authMiddleware = authModule.authMiddleware;
  // Auth routes automatically registered at /api/v1/auth
}
```

## Testing

Test the auth endpoints using curl or your preferred API client:

```bash
# Health check
curl http://localhost:3001/api/v1/auth/health

# Register user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User", 
    "role": "student",
    "establishmentId": "establishment-uuid"
  }'

# Login user
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

## Production Considerations

1. **Environment Variables**: Update all JWT secrets and email credentials
2. **HTTPS**: Use HTTPS in production for secure token transmission
3. **Email Provider**: Configure production SMTP service (SendGrid, SES, etc.)
4. **Rate Limiting**: Adjust limits based on your traffic patterns
5. **Monitoring**: Set up alerts for failed login attempts and auth errors
6. **Backup**: Regular backups of user and session data
7. **GDPR Compliance**: Implement data retention and deletion policies

## Architecture Benefits

- **Modular Design**: Easy to extend and modify
- **Security First**: Built with security best practices
- **Multi-Tenant Ready**: Supports multiple establishments
- **Audit Trail**: Complete logging for security compliance
- **Developer Friendly**: Well-documented APIs and error handling
- **Production Ready**: Comprehensive security features and monitoring

This auth module provides a solid foundation for secure user authentication and authorization in the Ballet Studio Management system.