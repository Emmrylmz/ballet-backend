# Auth Module Swagger Integration

The authentication module has been fully integrated with Swagger UI documentation.

## 🚀 Access Swagger Documentation

Visit: **http://localhost:3001/api-docs**

## 📋 Available Auth Endpoints

### Public Routes (No Authentication Required)

| Method | Endpoint | Description | Schema |
|--------|----------|-------------|---------|
| `POST` | `/api/v1/auth/login` | User login with email/password | `LoginRequest` |
| `POST` | `/api/v1/auth/register` | User registration | `RegisterRequest` |
| `POST` | `/api/v1/auth/activate` | Account activation via deep link | `ActivateAccountRequest` |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset email | `ForgotPasswordRequest` |
| `POST` | `/api/v1/auth/reset-password` | Reset password via deep link | `ResetPasswordRequest` |
| `POST` | `/api/v1/auth/refresh-token` | Refresh access token | `RefreshTokenRequest` |
| `POST` | `/api/v1/auth/check-password-strength` | Check password strength | `PasswordStrengthRequest` |
| `GET` | `/api/v1/auth/health` | Auth service health check | N/A |

### Protected Routes (Require Bearer Token)

| Method | Endpoint | Description | Schema |
|--------|----------|-------------|---------|
| `POST` | `/api/v1/auth/logout` | User logout | `LogoutRequest` |
| `POST` | `/api/v1/auth/change-password` | Change user password | `ChangePasswordRequest` |
| `GET` | `/api/v1/auth/me` | Get current user info | N/A |
| `GET` | `/api/v1/auth/validate-token` | Validate access token | N/A |
| `GET` | `/api/v1/auth/sessions` | Get user sessions | N/A |
| `DELETE` | `/api/v1/auth/sessions/{sessionId}` | Revoke specific session | N/A |

## 🔑 Authentication in Swagger

For protected routes, use the **Authorize** button in Swagger UI:

1. Click the "Authorize" button (🔒) at the top of the Swagger UI
2. Enter your JWT access token in the format: `Bearer your-jwt-token-here`
3. Click "Authorize"
4. Now you can test protected endpoints

## 📖 Request/Response Schemas

### Key Request Schemas

#### `RegisterRequest`
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "role": "student",
  "establishmentId": "a1b2c3d4-e5f6-7890-1234-567890abcdef"
}
```

#### `LoginRequest`
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "establishmentId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "rememberMe": true
}
```

#### `ActivateAccountRequest`
```json
{
  "token": "activation-token-from-email",
  "password": "NewSecurePass123!"
}
```

### Key Response Schemas

#### `LoginResponse`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "establishmentId": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "student",
      "status": "active",
      "emailVerified": true,
      "permissions": ["students:read", "classes:read"]
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token"
    },
    "expiresIn": 900,
    "establishmentInfo": {
      "id": "uuid",
      "name": "Ballet Studio",
      "businessName": "Elite Dance Academy"
    }
  },
  "message": "Login successful"
}
```

#### `AuthUser` Schema
```json
{
  "id": "uuid",
  "establishmentId": "uuid", 
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student",
  "status": "active",
  "emailVerified": true,
  "lastLogin": "2024-01-15T10:30:00Z",
  "permissions": ["students:read", "classes:read"]
}
```

## 🔒 Security Features Documented

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*()_+...)

### Token Security
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- JWT Bearer authentication
- Secure token storage with database sessions

### Rate Limiting
- 5 failed login attempts maximum
- 15-minute lockout after exceeded attempts
- Per-user API rate limiting available

## 🎯 Error Responses

All auth endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "User-friendly error message",
  "code": "ERROR_CODE",
  "details": {
    "additional": "context information"
  }
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

## 🧪 Testing with Swagger

### Quick Test Flow

1. **Health Check**: Test `GET /auth/health` 
2. **Password Strength**: Test `POST /auth/check-password-strength`
3. **Registration**: Test `POST /auth/register` 
4. **Activation**: Use token from email in `POST /auth/activate`
5. **Login**: Test `POST /auth/login`
6. **Protected Routes**: Use "Authorize" with JWT from login response

### Example curl Commands

```bash
# Health check
curl http://localhost:3001/api/v1/auth/health

# Password strength
curl -X POST http://localhost:3001/api/v1/auth/check-password-strength \
  -H "Content-Type: application/json" \
  -d '{"password": "TestPass123!"}'

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

# Login (after activation)
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'

# Get current user (with JWT token)
curl -X GET http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer your-jwt-token-here"
```

## 📈 Schema Validation

All endpoints include comprehensive Joi validation:
- Email format validation
- Password complexity requirements
- UUID format validation for IDs
- Phone number pattern validation
- Enum validation for roles and statuses
- Length constraints for text fields

## 🔗 Deep Links Integration

The auth module includes deep link support for:

### Account Activation
- Email contains: `https://your-app.com/auth/activate?token=activation-token`
- Token expires in 24 hours
- Single-use token

### Password Reset
- Email contains: `https://your-app.com/auth/reset-password?token=reset-token`
- Token expires in 1 hour
- Single-use token

## 🎨 Swagger UI Features

- **Interactive Testing**: Test all endpoints directly from the UI
- **Authentication Support**: Built-in JWT bearer token support
- **Schema Validation**: Real-time request/response validation
- **Code Generation**: Auto-generate client code in multiple languages
- **Export Options**: Export OpenAPI spec in JSON/YAML formats

## 📱 Multi-Tenant Support

The auth system supports multi-tenant architecture:
- Establishment-based user isolation
- Role-based access control within establishments
- Super admin access across all establishments
- Establishment context validation

---

The auth module is now fully documented and ready for development and testing via Swagger UI!