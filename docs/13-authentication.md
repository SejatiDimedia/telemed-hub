# 13 — Authentication & Session Management

This document is the authoritative specification for how TeleMedHub implements identity verification, session lifecycle, and token security. Implementation engineers must read this before writing any code in the `auth` module.

---

## 1. Overview

TeleMedHub uses a **stateless JWT + stateful refresh token** authentication model:

- **Access tokens** are short-lived, signed JWTs. They are self-contained and verified without a DB lookup on every request — making them fast and horizontally scalable.
- **Refresh tokens** are opaque, long-lived credentials stored (hashed) in the `refresh_tokens` table. They are stateful — they can be revoked at any time.

This hybrid approach means:
- Revocation of an access token mid-TTL is **not supported** (by design — short 15-minute TTL minimises the risk window).
- Revocation of a refresh token is **immediate** — enforced by checking the `revoked_at` column on the `/auth/refresh` endpoint.

---

## 2. Token Specifications

### 2.1 Access Token (JWT)

| Property | Value |
|---|---|
| Algorithm | HS256 (HMAC-SHA256) |
| Signing Key | From env var `JWT_SECRET` (min 32 bytes, base64-encoded) |
| TTL | 15 minutes (`exp` claim = `iat + 900`) |
| Claims | `sub` (user UUID), `email`, `roles` (string array), `iat`, `exp` |
| Validation | Verified on every authenticated request by RBAC middleware |
| Revocation | Not individually revocable — mitigated by short TTL and Redis blocklist for forced logouts |

**JWT Payload Example:**
```json
{
  "sub": "a1b2c3d4-uuid",
  "email": "rina@example.com",
  "roles": ["patient"],
  "iat": 1720080000,
  "exp": 1720080900
}
```

### 2.2 Refresh Token

| Property | Value |
|---|---|
| Format | Cryptographically random 32-byte token, base64url-encoded (not a JWT) |
| Generation | `crypto/rand` — never `math/rand` |
| TTL | 30 days from issuance |
| Storage | Argon2id hash stored in `refresh_tokens.token_hash` (never plaintext) |
| Presentation | Client stores raw token (e.g., HTTP-only cookie or secure local storage); sends to `/auth/refresh` |
| Rotation | **On every `/auth/refresh` call**, the old refresh token is revoked and a new one is issued (refresh token rotation) — this limits the attack window if a refresh token is stolen |

---

## 3. Password Hashing: Argon2id

All passwords are hashed using **Argon2id** before storage. bcrypt is **not acceptable** for this project — see `04-tech-stack.md` for rationale.

**Parameters (production):**

| Parameter | Value | Reason |
|---|---|---|
| `time` | 1 | Number of passes over memory |
| `memory` | 65536 KiB (64 MB) | Memory cost — makes GPU attacks expensive |
| `parallelism` | 4 | Goroutine/thread count |
| `keyLen` | 32 bytes | Output hash length |
| Target compute time | ~100ms on a 2-core VM | Tuned to balance UX and brute-force resistance |

**Implementation:**
```go
import "golang.org/x/crypto/argon2"

func HashPassword(password string) (string, error) {
    salt := make([]byte, 16)
    if _, err := rand.Read(salt); err != nil {
        return "", err
    }
    hash := argon2.IDKey([]byte(password), salt, 1, 64*1024, 4, 32)
    // Encode as: $argon2id$v=19$m=65536,t=1,p=4$<salt_b64>$<hash_b64>
    encoded := fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
        argon2.Version, 64*1024, 1, 4,
        base64.RawStdEncoding.EncodeToString(salt),
        base64.RawStdEncoding.EncodeToString(hash),
    )
    return encoded, nil
}
```

Store the full encoded string (including parameters) in `users.password_hash` so that parameter changes can be handled transparently on next login.

---

## 4. Authentication Flow

### 4.1 Registration (`POST /auth/register`)

```
Client → POST /auth/register { email, password, role }
  ↓
Handler: validate DTO (email format, password complexity, role enum)
  ↓
Service: check email uniqueness (409 CONFLICT if taken)
  ↓
Service: hash password with Argon2id
  ↓
Repository: INSERT users + INSERT patients/doctors (in same transaction)
  ↓
Response 201: { id, email, role }
```

### 4.2 Login (`POST /auth/login`)

```
Client → POST /auth/login { email, password }
  ↓
Service: load user by email (timing-safe: return generic error if not found)
  ↓
Service: compare password with Argon2id hash (constant-time comparison)
  ↓
Service: generate access token (JWT, 15min)
Service: generate refresh token (crypto/rand 32 bytes)
  ↓
Repository: INSERT refresh_tokens { user_id, token_hash, expires_at, ip, user_agent }
  ↓
Response 200: { access_token, refresh_token, expires_in: 900 }
```

### 4.3 Token Refresh (`POST /auth/refresh`)

```
Client → POST /auth/refresh { refresh_token }
  ↓
Service: load all active refresh_tokens for user (WHERE revoked_at IS NULL AND expires_at > NOW())
  ↓
Service: Argon2id-compare submitted token against stored hashes
  ↓
If no match → 401 TOKEN_INVALID
If expired → 401 TOKEN_EXPIRED
If revoked → 401 TOKEN_REVOKED
  ↓
Service: SET old token.revoked_at = NOW() (rotation — invalidate used token)
Service: INSERT new refresh_token record
Service: generate new access token (JWT)
  ↓
Response 200: { access_token, refresh_token (new), expires_in: 900 }
```

> **Refresh token rotation:** Every `/auth/refresh` call invalidates the old refresh token and issues a new one. If a stolen token is used, the legitimate user's next refresh will fail — alerting them (or triggering automated detection). This is the industry-standard mitigation for refresh token theft.

### 4.4 Logout (`POST /auth/logout`)

```
Client → POST /auth/logout (Authorization: Bearer <access_token>)
Optional header: X-All-Devices: true
  ↓
If X-All-Devices: true → SET revoked_at = NOW() on ALL refresh_tokens for user_id
Else → SET revoked_at = NOW() on the specific refresh_token presented
  ↓
Response 200: { message: "logged out successfully" }
```

Note: Access tokens remain valid until they expire (max 15 minutes). If immediate invalidation is required (e.g., account suspension), use the **Redis access token blocklist** (see §5).

---

## 5. Forced Logout / Access Token Revocation (Redis Blocklist)

For scenarios requiring immediate access token invalidation (account suspension by admin, suspicious activity detection), TeleMedHub uses a **Redis blocklist**:

1. Admin calls `POST /admin/users/{id}/suspend` or a security event triggers forced logout.
2. The service adds the user's `sub` (user UUID) to a Redis key: `blocklist:user:<user_uuid>` with TTL = 15 minutes (access token TTL).
3. RBAC middleware checks this key on every request for that user.
4. Any valid JWT belonging to that user is rejected with `401 SUSPENDED` until the Redis key expires.

This avoids needing to store individual JWT `jti` claims while still allowing immediate session kill.

---

## 6. RBAC Middleware Flow

On every authenticated request (non-public endpoints):

```
1. Extract Authorization header: "Bearer <token>"
2. Verify JWT signature (HS256, JWT_SECRET)
3. Check exp claim (reject if expired → 401 TOKEN_EXPIRED)
4. Check Redis blocklist for user_id (reject if suspended → 403 SUSPENDED)
5. Extract roles from JWT claims
6. Check if caller's role(s) satisfy the endpoint's required role(s)
   → Insufficient role: 403 FORBIDDEN
7. Attach user_id, roles, ip to request context (ctx) for downstream use
```

RBAC rules are defined inline per route group, e.g.:
```go
r.With(middleware.RequireRole("admin")).Post("/admin/users/{id}/suspend", h.SuspendUser)
r.With(middleware.RequireRole("patient", "doctor")).Post("/appointments/{id}/cancel", h.CancelAppointment)
```

---

## 7. Security Headers

The router (chi/Gin middleware) must add these headers on every response:

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Trace-ID` | `<request-scoped UUID>` (for log correlation) |

TLS is terminated at the reverse proxy (Nginx/load balancer in production). The Go app itself does not need to handle TLS in the Docker Compose setup.

---

## 8. Session Revocation Scenarios

| Scenario | Action |
|---|---|
| User-initiated logout (single device) | Revoke specific `refresh_token` record |
| User-initiated logout (all devices) | Revoke ALL `refresh_token` records for user |
| Admin suspends account | Add to Redis blocklist; revoke ALL `refresh_tokens` |
| Refresh token used (rotation) | Old refresh token revoked; new one issued |
| Refresh token expired | Returns `401 TOKEN_EXPIRED`; user must re-login |
| Suspicious concurrent refresh (reuse detection) | If a revoked refresh token is presented, revoke ALL tokens for that user (family revocation — indicates possible theft) |

---

## 9. Rate Limiting on Auth Endpoints

| Endpoint | Limit | Window | Scope |
|---|---|---|---|
| `POST /auth/login` | 5 requests | 1 minute | Per source IP |
| `POST /auth/register` | 10 requests | 1 hour | Per source IP |
| `POST /auth/refresh` | 30 requests | 1 minute | Per IP |

Exceeded limits: HTTP `429 RATE_LIMIT_EXCEEDED` with `Retry-After: <seconds>` header.

Redis key pattern: `rate:ip:<client_ip>:auth_login` — TTL = window duration. Using Redis `INCR` + `EXPIRE` (atomic via Lua script or pipeline).

---

## 10. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | HS256 signing key, min 32 bytes, base64-encoded. Rotate without downtime by running dual-signing for one access token TTL (15 min) |
| `JWT_ACCESS_TTL_SECONDS` | No (default: 900) | Access token TTL |
| `JWT_REFRESH_TTL_DAYS` | No (default: 30) | Refresh token TTL |
| `ARGON2_TIME` | No (default: 1) | Argon2id time parameter |
| `ARGON2_MEMORY_KB` | No (default: 65536) | Argon2id memory parameter in KiB |
| `ARGON2_PARALLELISM` | No (default: 4) | Argon2id parallelism parameter |

---

**Next document:** `08-development-roadmap.md` — sprint plan with implementation order and learning objectives.
