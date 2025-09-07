# HTTP-Only Cookie Authentication Integration Guide

This guide explains how to integrate the new secure HTTP-only cookie authentication system in your Ballet Neli Backend.

## 🛡️ Key Security Features

- **HTTP-only Cookies**: Tokens are inaccessible to JavaScript (XSS protection)
- **SameSite=Strict**: CSRF attack prevention
- **Secure Flags**: HTTPS-only transmission in production
- **Automatic Expiry**: Browser-managed token lifecycle
- **Proactive Refresh**: Tokens refresh before expiration
- **Security Headers**: CSP, HSTS, and other security headers

## 📋 Integration Steps

### 1. Update Your Application Entry Point

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { CorsConfigurationService } from './config/corsConfig.js';
import { LoggerService } from './services/LoggerService.js';

const app = express();
const logger = new LoggerService();
const corsConfig = new CorsConfigurationService(logger);

// Essential middleware for cookie authentication
app.use(cookieParser()); // Required for parsing cookies
app.use(cors(corsConfig.getCorsOptions())); // CORS with credentials
app.use(helmet(corsConfig.getSecurityHeaders())); // Security headers

// Your existing middleware...
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log CORS configuration
corsConfig.logConfiguration();
```

### 2. Initialize Services with Cookie Support

```typescript
// src/services/authServiceFactory.ts
import { AuthService } from '../features/auth/auth.service.js';
import { CookieService } from '../features/auth/services/CookieService.js';
import { TokenService } from '../features/auth/services/TokenService.js';
// ... other imports

export function createAuthServices(
  db: DatabaseService,
  logger: LoggerService,
  config: AuthConfig
) {
  // Initialize cookie service
  const cookieService = new CookieService(logger, {
    domain: process.env.COOKIE_DOMAIN,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    accessTokenExpiry: config.securitySettings.tokenExpiryTime * 60, // Convert to seconds
    refreshTokenExpiry: config.securitySettings.refreshTokenExpiryTime * 24 * 60 * 60 // Convert to seconds
  });

  // Initialize other services
  const tokenService = new TokenService(db, logger, {
    accessTokenSecret: config.accessTokenSecret,
    refreshTokenSecret: config.refreshTokenSecret,
    securitySettings: config.securitySettings
  });

  const authRepository = new AuthRepository(db, logger);
  const passwordService = new PasswordService(logger);
  const emailService = new EmailService(logger);

  // Create auth service with cookie support
  const authService = new AuthService(
    authRepository,
    tokenService,
    passwordService,
    emailService,
    cookieService, // Add cookie service
    logger,
    {
      securitySettings: config.securitySettings,
      frontendUrl: config.frontendUrl,
      companyName: config.companyName,
      supportEmail: config.supportEmail
    }
  );

  return {
    authService,
    cookieService,
    tokenService,
    authRepository
  };
}
```

### 3. Set Up Authentication Middleware

```typescript
// src/middleware/authSetup.ts
import { CookieAuthMiddleware } from '../features/auth/middleware/cookieAuthMiddleware.js';

export function setupAuthMiddleware(services: {
  tokenService: TokenService;
  cookieService: CookieService;
  authRepository: AuthRepository;
  logger: LoggerService;
}) {
  const cookieAuthMiddleware = new CookieAuthMiddleware(
    services.tokenService,
    services.cookieService,
    services.authRepository,
    services.logger
  );

  return {
    // Required authentication
    authenticate: cookieAuthMiddleware.authenticate,
    
    // Optional authentication
    optionalAuth: cookieAuthMiddleware.optionalAuthenticate,
    
    // Role-based access control
    requireRole: cookieAuthMiddleware.requireRole,
    
    // Establishment access control
    requireEstablishmentAccess: cookieAuthMiddleware.requireEstablishmentAccess
  };
}
```

### 4. Update Route Handlers

```typescript
// src/features/auth/auth.routes.ts
import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { setupAuthMiddleware } from '../../middleware/authSetup.js';

export function createAuthRoutes(
  authController: AuthController,
  authMiddleware: ReturnType<typeof setupAuthMiddleware>
) {
  const router = Router();

  // Public routes (no authentication required)
  router.post('/login', authController.login.bind(authController));
  router.post('/register', authController.register.bind(authController));
  router.post('/activate', authController.activateAccount.bind(authController));
  router.post('/forgot-password', authController.forgotPassword.bind(authController));
  router.post('/reset-password', authController.resetPassword.bind(authController));

  // Protected routes (authentication required)
  router.post('/refresh-token', 
    authMiddleware.authenticate, 
    authController.refreshToken.bind(authController)
  );
  
  router.post('/logout', 
    authMiddleware.authenticate, 
    authController.logout.bind(authController)
  );
  
  router.get('/me', 
    authMiddleware.authenticate, 
    authController.getCurrentUser.bind(authController)
  );

  router.post('/change-password',
    authMiddleware.authenticate,
    authController.changePassword.bind(authController)
  );

  // Role-based protected routes
  router.get('/admin/users',
    authMiddleware.authenticate,
    authMiddleware.requireRole(['admin', 'manager']),
    // your admin handler
  );

  return router;
}
```

### 5. Environment Variables

Add these environment variables to your `.env` file:

```env
# Cookie Configuration
COOKIE_DOMAIN=your-domain.com  # Optional: set for subdomain sharing
NODE_ENV=production  # Enables secure cookies in production

# CORS Configuration
FRONTEND_URL=https://your-frontend.com
ADMIN_FRONTEND_URL=https://admin.your-domain.com  # If different
ALLOWED_ORIGINS=https://your-frontend.com,https://admin.your-domain.com

# Security
JWT_ACCESS_SECRET=your-super-secure-access-secret
JWT_REFRESH_SECRET=your-super-secure-refresh-secret
```

## 🔧 Usage Examples

### Frontend Integration (JavaScript/TypeScript)

```typescript
// Frontend API client configuration
const apiClient = axios.create({
  baseURL: 'https://your-api.com/api',
  withCredentials: true, // Essential for HTTP-only cookies
  headers: {
    'Content-Type': 'application/json',
  }
});

// Login example
async function login(email: string, password: string) {
  try {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
      rememberMe: true
    });
    
    // No tokens in response - they're set as HTTP-only cookies
    return response.data; // Contains user data and expiresIn
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

// Logout example
async function logout() {
  try {
    await apiClient.post('/auth/logout');
    // Cookies are automatically cleared by the server
    // Redirect to login page
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

// Automatic token refresh (handled by interceptor)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        // Attempt to refresh token
        await apiClient.post('/auth/refresh-token');
        // Retry original request
        return apiClient.request(error.config);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
```

## 🧪 Testing

### 1. Test Cookie Security

```bash
# Test login and check cookies
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -c cookies.txt \
  -v

# Test authenticated endpoint with cookies
curl -X GET http://localhost:3000/api/auth/me \
  -b cookies.txt \
  -v

# Test logout and cookie clearing
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt \
  -c cookies_after_logout.txt \
  -v
```

### 2. Validate Cookie Attributes

```javascript
// Browser console - check cookie attributes
document.cookie.split(';').forEach(cookie => {
  console.log(cookie.trim());
});

// Should show:
// - HttpOnly flag (cookies not accessible via JavaScript)
// - Secure flag (in production)
// - SameSite=Strict flag
```

## 🚨 Migration from Token-Based Auth

### 1. Frontend Changes Required

```typescript
// BEFORE: Manual token management
localStorage.setItem('accessToken', response.data.tokens.accessToken);
localStorage.setItem('refreshToken', response.data.tokens.refreshToken);

// Authorization header
headers: {
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
}

// AFTER: Automatic cookie management
// Remove all localStorage token code
// Add withCredentials: true to axios config
// Remove Authorization headers
```

### 2. Backend Migration Script

```typescript
// migration/migrateToHttpOnlyCookies.ts
export async function migrateExistingSessions() {
  // This migration helps transition existing sessions
  // Run this during deployment to minimize user disruption
  
  const logger = new LoggerService();
  logger.info('Starting HTTP-only cookie migration...');
  
  // Invalidate all existing sessions to force re-login
  // This ensures all users get the new secure cookie setup
  await db.query(`
    UPDATE user_sessions 
    SET is_revoked = true 
    WHERE is_revoked = false
  `);
  
  logger.info('All existing sessions invalidated. Users will need to re-login.');
}
```

## 🔒 Security Best Practices

### 1. Production Checklist

- [ ] HTTPS enabled (required for secure cookies)
- [ ] `NODE_ENV=production` set
- [ ] Proper CORS origins configured
- [ ] Security headers enabled
- [ ] Cookie domain properly configured
- [ ] Rate limiting implemented
- [ ] Token cleanup job scheduled

### 2. Monitoring

```typescript
// Add to your monitoring system
export function setupSecurityMonitoring(logger: LoggerService) {
  // Monitor failed authentication attempts
  // Monitor token refresh patterns
  // Alert on unusual cookie behavior
  // Track CORS violations
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Cookies not being set**
   - Check CORS credentials: true
   - Verify HTTPS in production
   - Check cookie domain configuration

2. **Authentication fails after deployment**
   - Verify environment variables
   - Check CORS allowed origins
   - Confirm cookie-parser middleware

3. **Token refresh not working**
   - Check refresh token expiry
   - Verify cookie attributes
   - Check middleware order

### Debug Mode

```typescript
// Enable debug logging
process.env.DEBUG_COOKIES = 'true';

// The cookie service will log detailed information
// about cookie operations
```

This secure HTTP-only cookie authentication system provides enterprise-level security while maintaining a smooth user experience. All tokens are now protected from XSS attacks and automatically managed by the browser.