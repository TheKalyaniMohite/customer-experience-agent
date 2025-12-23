# Security & Privacy

## Data Protection

### Encryption
- All data is encrypted at rest using AES-256
- Data in transit is protected with TLS 1.3
- Database backups are encrypted
- API keys are hashed and never stored in plain text

### Data Centers
- Primary data centers in US (Virginia) and EU (Frankfurt)
- SOC 2 Type II certified facilities
- 24/7 physical security and monitoring
- Redundant power and cooling systems

## Privacy

### Data Collection
We collect only the data necessary to provide our services:
- Account information (name, email)
- Customer data you upload
- Usage analytics (anonymized)
- Support communications

### Data Retention
- Active account data: Retained while account is active
- Deleted accounts: Data purged within 30 days
- Backups: Retained for 90 days then permanently deleted
- Audit logs: Retained for 1 year

### GDPR Compliance
- Right to access your data
- Right to data portability
- Right to be forgotten
- Data Processing Agreement available

### CCPA Compliance
- Do not sell personal information
- Right to know what data is collected
- Right to delete personal data
- Non-discrimination for exercising rights

## Authentication & Access

### Single Sign-On (SSO)
Enterprise plans include SSO support:
- SAML 2.0
- OAuth 2.0 / OpenID Connect
- Active Directory integration
- Google Workspace
- Okta, OneLogin, Azure AD

### Two-Factor Authentication (2FA)
Enable 2FA for extra security:
1. Go to Settings > Security > Two-Factor Auth
2. Choose method: Authenticator app or SMS
3. Scan QR code or enter phone number
4. Enter verification code
5. Save backup codes securely

### Password Requirements
- Minimum 12 characters
- Must include uppercase and lowercase letters
- Must include at least one number
- Must include at least one special character
- Cannot match previous 5 passwords

## Session Security
- Sessions expire after 24 hours of inactivity
- Concurrent session limit: 5 devices
- View active sessions in Settings > Security
- Remote logout available for all sessions

## IP Allowlisting (Enterprise)
Restrict access to specific IP addresses:
1. Go to Settings > Security > IP Allowlist
2. Add trusted IP addresses or ranges
3. Enable enforcement
4. Users from non-listed IPs will be blocked

## Security Incident Response
If you suspect unauthorized access:
1. Change your password immediately
2. Review active sessions and revoke unknown ones
3. Check audit logs for suspicious activity
4. Contact security@example.com
5. Enable 2FA if not already active

## Reporting Vulnerabilities
We have a responsible disclosure program:
- Email: security@example.com
- PGP key available on our website
- Response within 48 hours
- Bug bounty program for qualifying reports


