# CARECONNECT SECURITY AUDIT - ACTION PLAN

**Date Generated**: 2026-03-31
**Status**: 🔴 CRITICAL - DO NOT DEPLOY
**Total Issues Found**: 56 (Frontend) + 3 (Backend Critical Vulnerabilities)

---

## 🚨 DEPLOYMENT BLOCKERS (Fix These First - 10 Minutes)

### Backend Critical Vulnerabilities:

#### 1️⃣ Patient Can Book for Anyone
**File**: `backend/controllers/bookingsController.js` line 355
**Risk**: Financial fraud - victim charged for unwanted bookings
**Fix**: 1 line change
```javascript
// BEFORE (VULNERABLE):
const booking = new Booking({
  patientId,  // from request body

// AFTER (FIXED):
const booking = new Booking({
  patientId: req.user.id,  // from JWT token
```

#### 2️⃣ Patient Can Mark Any Payment as Paid
**File**: `backend/controllers/paymentController.js` line 144-205
**Risk**: Payment fraud - attacker can mark fake payments as complete
**Fix**: Add 7 lines
```javascript
// Add at start of markPaymentAsPaid function:
const payment = await Payment.findById(paymentId).populate("booking");

if (!payment) return res.status(404).json({ error: "Not found" });

// NEW: Validate ownership
if (req.user.role === "patient" &&
    payment.booking.patientId.toString() !== req.user.id) {
  return res.status(403).json({ error: "Cannot mark others' payments" });
}

// NEW: Validate state (idempotency)
if (payment.status !== "pending") {
  return res.status(400).json({ error: "Only pending payments can be marked paid" });
}
```

#### 3️⃣ Nurse Can Update Any Booking Status
**File**: `backend/controllers/bookingsController.js` line 406-446
**Risk**: Service fraud - one nurse can complete another's bookings
**Fix**: Add 5 lines
```javascript
exports.updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const booking = await Booking.findById(id);
  if (!booking) return res.status(404).json({ error: "Not found" });

  // NEW: Ownership check
  if (booking.nurseId.toString() !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Cannot update others' bookings" });
  }

  // Rest of code...
```

**⏱️ TOTAL TIME TO FIX**: ~10 minutes

---

## 🔧 FRONTEND CRITICAL ISSUES (Priority Fix)

### 11 Critical Frontend Issues:

1. **Hardcoded API Base URL** (33 instances)
   - Impact: Production deployment impossible
   - Time: 30 min
   - Create: `.env.local`, `.env.production` files
   - Replace: `const API_BASE = "..."`  with `process.env.NEXT_PUBLIC_API_BASE`

2. **Tokens in localStorage** (36+ instances)
   - Impact: XSS → account takeover
   - Time: 2 hours (backend + frontend)
   - Fix: Move to HTTPOnly cookies (backend-managed)

3. **Sensitive Data in localStorage** (email, phone, location)
   - Impact: GDPR/HIPAA violation
   - Time: 1 hour
   - Fix: Remove from localStorage, fetch from /me endpoint instead

4. **Frontend-Only Authorization** (AuthGuard, AdminGuard)
   - Impact: UX issue (backend prevents actual data leak)
   - Time: Already protected by backend middleware ✓
   - Note: Frontend check can be bypassed, but backend validates

5. **Missing CSRF Tokens** (all POST/PUT endpoints)
   - Impact: Form hijacking attacks possible
   - Time: 2 hours
   - Fix: Generate and send CSRF tokens with state-changing requests

6. **No Request Timeouts** (30+ fetch calls)
   - Impact: Hanging requests freeze UI
   - Time: 1 hour
   - Fix: Implement AbortController with 10s timeout

7. **Unvalidated User Input** (XSS vulnerability)
   - Impact: Malicious scripts in user data
   - Time: 30 min (React already escapes, verify no dangerouslySetInnerHTML)
   - Fix: Add DOMPurify on backend for user input

8. **localStorage.clear() Too Aggressive**
   - Impact: Clears all data on logout
   - Time: 15 min
   - Fix: Only remove auth tokens

9. **Inconsistent Redirects** (window.location.href vs router.push)
   - Impact: Race conditions, stale cache
   - Time: 30 min
   - Fix: Use router.push() consistently

10. **Missing File Upload Validation** (backend only checked frontend)
    - Impact: Malicious file uploads
    - Time: 1 hour
    - Fix: Backend file type/size validation

11. **Password Field Security**
    - Impact: Browser saves passwords insecurely
    - Time: 15 min
    - Fix: Add `autoComplete="current-password"`, password strength feedback

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Critical Backend Fixes (TODAY)
```
- [ ] Fix createBooking ownership validation
- [ ] Fix markPaymentAsPaid ownership validation
- [ ] Fix updateBookingStatus ownership validation
- [ ] Test: Try to book for someone else → Should fail
- [ ] Test: Try to mark others' payments → Should fail
- [ ] Test: Try to update others' bookings → Should fail
- [ ] Code review of all 3 fixes
```

### Phase 2: Frontend Security (THIS WEEK)
```
- [ ] Move API_BASE to environment variables
- [ ] Create .env.local and .env.production
- [ ] Backend: Implement HTTPOnly cookie for tokens
- [ ] Frontend: Remove sensitive data from localStorage
- [ ] Frontend: Use credentials: 'include' in fetch calls
- [ ] Add CSRF token middleware to backend
- [ ] Send CSRF tokens with all POST/PUT requests
- [ ] Implement request timeouts with AbortController
- [ ] Remove localStorage.clear(), use selective removal
- [ ] Replace window.location.href with router.push()
- [ ] Test localStorage bypass attacks
```

### Phase 3: Data Validation (THIS WEEK)
```
- [ ] Backend: Add DOMPurify for user input sanitization
- [ ] Backend: Add file type/size validation
- [ ] Frontend: Add search debounce (500ms)
- [ ] Frontend: Add form validation
- [ ] Frontend: Test XSS payloads in booking notes
```

### Phase 4: Error Handling (NEXT WEEK)
```
- [ ] Centralize API error handling
- [ ] Add loading skeletons to all pages
- [ ] Add timeout error messages
- [ ] Add network error handling
- [ ] Add empty states to all lists
- [ ] Create error boundary component
```

### Phase 5: Code Quality (ONGOING)
```
- [ ] Replace `any` types with specific types
- [ ] Split large components (>500 lines)
- [ ] Extract repeated API parsing logic
- [ ] Add debounce to search
- [ ] Remove console.error from production
- [ ] Add Jest tests for permission checks
```

---

## 🔐 SECURITY TESTING BEFORE DEPLOYMENT

Run these tests BEFORE going to production:

### Test 1: Patient Booking Fraud
```bash
1. Login as Patient A
2. Get Patient B's ID
3. POST /api/bookings/create with patientId = Patient B
4. Expected: 403 Forbidden (or booking created for Patient A only)
5. Actual: ???
```

### Test 2: Payment Mark-as-Paid Fraud
```bash
1. Login as Patient A
2. Find Payment belonging to Patient B
3. PUT /api/payments/mark-paid/:paymentId
4. Expected: 403 Forbidden
5. Actual: ???
```

### Test 3: Booking Status Hijacking
```bash
1. Login as Nurse A
2. Get Booking ID for Nurse B
3. PUT /api/bookings/:id/status with status="completed"
4. Expected: 403 Forbidden
5. Actual: ???
```

### Test 4: Admin Bypass
```bash
1. Login as Patient
2. Open DevTools console
3. Run: localStorage.setItem("role", "admin")
4. Refresh page
5. Click "View All Bookings"
6. Frontend: Shows admin page
7. API call: Returns 403 (backend rejects)
8. Expected: Backend correctly blocks
```

### Test 5: XSS in Booking Notes
```bash
1. Admin edits patient to have name:
   "John<img src=x onerror='alert(\"XSS\")'>"
2. View booking details
3. Expected: No alert, text escaped
4. Actual: Verify React escapes it
```

### Test 6: Invalid Token Handling
```bash
1. Modify token in localStorage to invalid value
2. Try to fetch data
3. Expected: 401 Unauthorized, redirect to login
4. Actual: ???
```

---

## 📊 SEVERITY & TIME BREAKDOWN

| Category | Count | Critical | High | Medium | Low | Est. Time |
|----------|-------|----------|------|--------|-----|-----------|
| **Backend Fixes** | 3 | 3 | - | - | - | 30 min |
| **Frontend Security** | 11 | 11 | - | - | - | 8 hours |
| **High Issues** | 18 | - | 18 | - | - | 12 hours |
| **Medium Issues** | 17 | - | - | 17 | - | 8 hours |
| **Low Issues** | 10 | - | - | - | 10 | 4 hours |
| **Testing & QA** | - | - | - | - | - | 4 hours |
| **Code Review** | - | - | - | - | - | 2 hours |
| **TOTAL** | **58** | **14** | **18** | **17** | **10** | **~40 hours** |

---

## 📈 DEPLOYMENT TIMELINE

**Current Status**: 🔴 CRITICAL

### Minimum Viable Production (MVP) - 1 Day
```
✅ Backend vulnerability fixes (3 critical)
✅ API_BASE environment variables
✅ CSRF token implementation
✅ Request timeouts
✅ Security testing
= Ready for soft launch with limited users
```

### Production Ready - 3-5 Days
```
✅ All the above PLUS:
✅ HTTPOnly cookies for tokens
✅ Frontend security overhaul
✅ Error handling improvements
✅ Data validation
✅ Full test suite passing
```

### Fully Hardened - 2 Weeks
```
✅ All the above PLUS:
✅ Code quality improvements
✅ Performance optimization
✅ Penetration testing
✅ Compliance audit (GDPR/HIPAA)
✅ Load testing
```

---

## 💡 KEY DECISIONS

### 1. HTTPOnly Cookies vs localStorage
**Decision**: Use HTTPOnly cookies for tokens
**Reasoning**: Prevents XSS token theft
**Backend Change**: Generate `Set-Cookie: authToken=xxx; HttpOnly; Secure; SameSite=Strict`
**Frontend Change**: Remove from localStorage, fetch with `credentials: 'include'`

### 2. CSRF Protection Strategy
**Decision**: Add CSRF tokens to all state-changing requests
**Reasoning**: Prevent form hijacking
**Implementation**: Backend generates token, frontend sends in X-CSRF-Token header

### 3. Ownership Validation Pattern
**Decision**: Create shared middleware for consistent checks
**Reasoning**: Prevent copy-paste bugs, easier maintenance
**Pattern**: Create `validateOwnership(field)` middleware

### 4. Error Handling Strategy
**Decision**: Centralize in utility function
**Reasoning**: Consistent error messages, easier debugging
**Implementation**: Create `handleApiResponse()` utility used by all pages

---

## 📚 DOCUMENTATION TODO

- [ ] Create SECURITY.md with security practices
- [ ] Create .env.example with required variables
- [ ] Document API endpoints with examples
- [ ] Create deployment guide (test vs production)
- [ ] Write testing checklist
- [ ] Document authentication flow
- [ ] Create SQL injection prevention guide
- [ ] Document GDPR compliance measures

---

## 👥 TEAM ASSIGNMENTS

**Suggested Team Distribution** (adjust as needed):

### Backend Security (40%)
- **Dev 1**: Fix 3 critical vulnerabilities + data validation
- **Dev 2**: Implement CSRF tokens + session management
- **Reviewer**: Security expert reviews all changes

### Frontend Security (40%)
- **Dev 3**: Move to environment variables + HTTPOnly cookies
- **Dev 4**: Error handling + input validation
- **Dev 5**: Testing & security verification

### Testing & QA (20%)
- **QA 1**: Run security test checklist
- **QA 2**: Performance testing & load testing
- **Reviewer**: Final security audit before launch

---

## 🎯 SUCCESS CRITERIA

**Before going to production, verify:**

✅ All 3 critical backend vulnerabilities fixed & tested
✅ All security tests passing (see above)
✅ No hardcoded API URLs (using environment variables)
✅ No sensitive data in localStorage
✅ CSRF tokens implemented
✅ Request timeouts working
✅ Error handling for all API calls
✅ XSS prevention verified
✅ Role-based access control working
✅ Rate limiting on sensitive endpoints
✅ All 56 frontend issues triaged (11 critical fixed, others planned)
✅ Security code review completed
✅ Penetration testing passed
✅ GDPR/HIPAA compliance verified
✅ Documentation complete
✅ Team trained on security practices

---

## 📞 QUESTIONS TO ANSWER

Before implementation, clarify:

1. **Token Expiration**: How long should JWT tokens last? (24h, 7d, etc.)
2. **Refresh Tokens**: Should backend support token refresh? (recommended for long sessions)
3. **Payment Gateway**: Is there integration with payment API that needs CSRF handling?
4. **Notifications**: Should failed operations show toast notifications? (recommended)
5. **Rate Limiting**: What's acceptable rate for search API? (suggest 10 req/min/user)
6. **File Upload Limits**: Max file size and types? (suggest 5MB, JPG/PNG/PDF only)
7. **Session Timeout**: Auto-logout after inactivity? (recommend 30 min)
8. **Audit Logging**: Should admin actions be logged? (required for GDPR)

---

## 📝 FINAL NOTES

**Overall Assessment**:
The application has **good architectural foundations** (middleware pattern, role-based access) but **critical vulnerabilities in data ownership validation**. The 3 backend issues are easily fixable but **must be done before any production deployment**.

**Risk if deployed as-is**:
- Financial fraud possible (patient booking for others, false payment marks)
- XSS attacks likely (if any HTML injection found elsewhere)
- Data exposure risk (admin role check bypassable in frontend)
- Regulatory violations (GDPR, HIPAA from PII exposure)

**Good news**: All vulnerabilities are fixable and don't require major rewrites.

**Estimated effort to MVP**: **1-2 days** (just backend + core security)
**Estimated effort to production ready**: **3-5 days** (with frontend hardening)

**Recommendation**: Fix backend vulnerabilities TODAY, then tackle frontend issues before soft launch.

---

**Audit Complete** | **Status**: Awaiting team action
