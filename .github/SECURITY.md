![banner.png](../assets/banner.png)
# Security Policy

## Reporting a Vulnerability

**Please do not open public GitHub issues for security vulnerabilities.**

If you discover a security vulnerability in SimsForge, please email the maintainers directly with:

1. Description of the vulnerability
2. Steps to reproduce (if possible)
3. Potential impact
4. Suggested fix (if available)

**Security reports will be handled with the highest priority.**

## Supported Versions

Security updates are provided for:

| Version | Supported |
| ------- | --------- |
| 1.0.x   | ✅ Yes    |

## Security Best Practices

### For Users

- Keep SimsForge updated to the latest version
- Use strong, unique passwords
- Enable two-factor authentication when available
- Never share your API keys or authentication tokens
- Report suspicious activity immediately

### For Developers

When contributing, follow these security guidelines:

#### Input Validation

- **Always validate and sanitize user input**
- Use Zod for schema validation on all API endpoints
- Validate on both frontend and backend
- Whitelist expected input patterns

```typescript
// Good
const modSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(10000),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
});

// Use validation
const validated = modSchema.parse(userInput);
```

#### SQL Injection Prevention

- Use parameterized queries and prepared statements (pg library handles this)
- Never concatenate user input into SQL queries
- Use ORM/query builders when available

```typescript
// Good
const result = await db.query(
  'SELECT * FROM mods WHERE category_id = $1',
  [categoryId]
);

// Never do this
const result = await db.query(
  `SELECT * FROM mods WHERE category_id = ${categoryId}` // ❌ VULNERABLE
);
```

#### Cross-Site Scripting (XSS) Prevention

- React auto-escapes by default - leverage this
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Sanitize HTML content with appropriate libraries
- Use Content Security Policy (CSP) headers

```typescript
// Good - React auto-escapes
<div>{userContent}</div>

// Avoid - unless you really need HTML
<div dangerouslySetInnerHTML={{ __html: userContent }} />
```

#### Authentication & Authorization

- Always verify user permissions before data access
- Use role-based access control (RBAC)
- Implement proper middleware for route protection
- Check permissions at both API and database levels

```typescript
// Good - Verify ownership
const mod = await Mod.findById(modId);
if (mod.creatorId !== currentUser.id) {
  throw new UnauthorizedError();
}
```

#### Sensitive Data

- Never log passwords, tokens, or API keys
- Use environment variables for secrets
- Hash passwords with Argon2
- Implement rate limiting on authentication endpoints

```typescript
// Good
logger.info('User login attempt', { userId }); // ✅

// Bad
logger.info('User login', { username, password }); // ❌
```

#### Dependencies

- Keep dependencies updated
- Review security advisories: `npm audit`
- Use tools like Dependabot for automated updates
- Remove unused dependencies

```bash
# Check for vulnerabilities
npm audit

# Update to latest secure versions
npm audit fix
```

#### CORS & CSRF Protection

- Configure CORS properly - only allow trusted origins
- Implement CSRF tokens for state-changing operations
- Use SameSite cookie attribute

```typescript
// Good - Restrictive CORS
cors({
  origin: ['https://simsforge.com', 'https://app.simsforge.com'],
  credentials: true,
})
```

#### Rate Limiting

- Implement rate limiting on all public endpoints
- Use stricter limits on sensitive operations (login, password reset)
- Include rate limit headers in responses

```typescript
// Already implemented in backend
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
}));
```

#### Error Handling

- Don't expose sensitive error details to clients
- Log errors securely server-side
- Return generic error messages to users

```typescript
// Good
try {
  // operation
} catch (error) {
  logger.error('Database error', { error }); // Logged server-side
  res.status(500).json({ error: 'An error occurred' }); // Generic response
}
```

## Security Headers

The backend implements security headers via Helmet:

```typescript
// Implemented
app.use(helmet());
```

This includes:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security
- Content-Security-Policy

## Database Security

- Use PostgreSQL with encryption at rest
- Enable SSL/TLS for database connections
- Use strong database passwords
- Implement principle of least privilege for DB users
- Regular backups with encryption

## API Security

- Authenticate all API requests
- Validate all input
- Implement rate limiting
- Use HTTPS for all communication
- Implement API versioning
- Log suspicious activity

## Deployment Security

When deploying, ensure:

- ✅ All environment variables are set securely
- ✅ Secrets are not committed to version control
- ✅ HTTPS is enforced
- ✅ Database backups are encrypted
- ✅ Access logs are monitored
- ✅ Firewalls restrict unnecessary ports
- ✅ Regular security audits are performed

## Compliance

SimsForge commits to:

- Regular security audits
- Prompt patching of vulnerabilities
- Clear security disclosure policy
- User data protection
- Transparent security practices

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)

---

Thank you for helping keep SimsForge secure! 🔐
