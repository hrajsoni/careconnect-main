# WORKFLOW & SYSTEM AUDIT REPORT
**CareConnect Application**
**Date**: 2026-03-31
**Focus**: End-to-end user workflows and cross-system vulnerabilities

---

## EXECUTIVE SUMMARY

This audit traces how **frontend and backend vulnerabilities combine to break critical workflows**. The good news: backend middleware architecture is sound. The bad news: **ownership validation is inconsistently applied to data mutation operations**.

### Key Findings:
- **CRITICAL**: Patient can create bookings for anyone (financial fraud)
- **CRITICAL**: Patient can mark any payment as paid (payment fraud)
- **HIGH**: Any nurse can update any booking status (service fraud)
- **MEDIUM**: Frontend role checks bypassable (but backend validates)
- **MEDIUM**: Search API can be hammered (DoS risk)

**Deployment Status**: 🔴 DO NOT DEPLOY - 3 critical backend vulnerabilities

---

## WORKFLOW 1: Patient Books a Nurse

### Step-by-Step Execution Flow

**Step 1: Patient Logs In**
```
Action: User enters email/password on login/page.tsx
Frontend: Sends POST /api/auth/login (no CSRF token - CRITICAL)
Backend: auth.js validates credentials, returns JWT token
Token Storage: Stored in localStorage (not HttpOnly - CRITICAL)
```

**Step 2: Frontend Redirects to Dashboard**
```
Action: router.push("/dashboard/patient") after login
Frontend: AuthGuard.tsx checks role from localStorage
Risk: Role check bypassable (user can modify localStorage)
Backend: When frontend calls API, backend validates token role
Result: Frontend UX issue, backend prevents actual damage
```

**Step 3: Patient Views Available Nurses**
```
Action: GET /api/nurses with ?location=,?service= filters
Frontend: nurses/page.tsx sends request
Backend: Returns filtered nurse list
Issue: No debounce - each keystroke = API call
Risk: 1000 users typing = 10,000+ requests/min = DoS
```

**Step 4: Patient Selects Nurse and Books**
```
Action: User clicks "Book" button (booking form)
Frontend: app sends POST /api/bookings/create with:
{
  "patientId": "PATIENT_ID",  // <-- FROM REQUEST BODY
  "nurseId": "NURSE_ID",
  "date": "2026-04-05",
  "time": "14:00",
  "location": "123 Main St",
  "notes": "..."
}

Backend Route: backend/routes/booking.js:37
router.post("/create", requireAuth, requireRole("patient"), createBooking);

Backend Controller: backend/controllers/bookingsController.js:246-280
```

### 🚨 CRITICAL VULNERABILITY: Patient Can Book for Someone Else

**Code (bookingsController.js:246-280):**
```javascript
exports.createBooking = async (req, res) => {
  const { patientId, nurseId, service, date, time, location, notes } = req.body;

  // VULNERABILITY: patientId accepted from request body without validation
  if (!patientId || !nurseId || !service || !date || !time || !location) {
    return res.status(400).json({ ... });
  }

  // ... validation ...

  // Line 355: Creates booking with user-provided patientId
  const booking = new Booking({
    patientId,  // <-- SHOULD BE: req.user.id (from JWT token)
    nurseId,
    service,
    date,
    time,
    location,
    notes,
    status: "pending",
    totalAmount: calculatedAmount
  });
```

**Attack Scenario - Patient Fraud:**
```
1. Attacker (Patient A) logs in successfully
   Token: { userId: "PATIENT_A_ID", role: "patient" }

2. Attacker gets victim Patient B's ID from:
   - Public profile URL
   - Search results (if IDs visible)
   - Admin dashboard (if they bypass auth)

3. Attacker calls: POST /api/bookings/create with:
{
  "patientId": "PATIENT_B_ID",  // <-- Victim's ID
  "nurseId": "NURSE_ID",
  "date": "2026-04-05",
  "time": "14:00",
  "location": "123 Main St",
  "notes": "Book this for my victim"
}

4. Backend receives request:
   - requireAuth: ✓ Valid JWT token
   - requireRole("patient"): ✓ Token has patient role
   - Creates booking with patientId = PATIENT_B_ID

5. Result:
   - Booking created for Patient B
   - Patient B notified of booking
   - Patient B charged when Nurse accepts
   - Payment shows for Patient B
   - GDPR violation: Financial loss to victim
```

**Business Impact:**
- Victim charged for services they didn't book
- Victim may accept service from nurse thinking they booked it
- Nurse confused about who actually booked
- Payment reconciliation fails
- Chargeback disputes
- Regulatory violations

**Severity:** 🔴 **CRITICAL - Production data loss risk**

**Fix (Simple):**
```javascript
// backend/controllers/bookingsController.js:355
const booking = new Booking({
  patientId: req.user.id,  // Force to logged-in user, ignore request body
  nurseId,
  // ... rest unchanged
});
```

### Step 5: Payment Created

```
Assuming: Payment created at booking time
Question: Who owns the payment?
Question: What initiates payment status change?
Result: Booking created with status "pending"
```

---

## WORKFLOW 2: Patient Marks Payment as Paid

### Step-by-Step Payment Fraud

**Step 1: Booking Accepted**
```
Nurse clicks "Accept Booking"
Backend: updateBookingStatus changes to "accepted"
Payment created with status: "pending"
```

**Step 2: Service Provided**
```
Nurse completes service
Booking marked "completed"
Payment still "pending" awaiting confirmation
```

**Step 3: Patient Marks Payment Paid**
```
Frontend: patient/page.tsx shows payment
Frontend: Button "Mark as Paid"
Frontend: Calls PUT /api/payments/mark-paid/:paymentId
```

### 🚨 CRITICAL VULNERABILITY: Any Patient Can Mark Any Payment Paid

**Backend Route (payment.js:39):**
```javascript
router.put("/mark-paid/:paymentId",
  requireAuth,
  requireRole("patient", "admin"),
  markPaymentAsPaid
);
```

**Backend Controller (paymentController.js:144-205):**
```javascript
exports.markPaymentAsPaid = async (req, res) => {
  const { paymentId } = req.params;
  const { reference, method } = req.body;

  const payment = await Payment.findById(paymentId);

  if (!payment) {
    return res.status(404).json({ error: "Payment not found" });
  }

  // VULNERABILITY: No check if req.user.id === payment.patientId
  // Any patient can mark ANY payment as paid

  payment.status = "paid";
  payment.reference = reference || `PAY-${Date.now()}`;
  payment.paymentMethod = method || payment.paymentMethod;
  await payment.save();

  res.status(200).json({ success: true, message: "Payment marked as paid" });
};
```

**Attack Scenario - Payment Fraud:**
```
1. Attacker (Patient A) logs in
   Token: { userId: "PATIENT_A_ID", role: "patient" }

2. Attacker in database/API finds Payment #12345
   This payment belongs to Patient B
   Associated with Booking: Nurse C + Patient B

3. Attacker calls: PUT /api/payments/mark-paid/12345
   Body: {
     "reference": "FAKE-REFERENCE-12345",
     "method": "credit_card"
   }

4. Backend checks:
   - requireAuth: ✓ Valid token
   - requireRole("patient"): ✓ Patient role
   - NO ownership check → Proceeds

5. Payment #12345 status changed to "paid"
   Database: Payment.status = "paid"

6. Results:
   - Payment shows as paid for Patient B + Nurse C
   - Nurse C thinks they were paid
   - Patient B thinks they confirmed payment
   - Attacker (Patient A) marked fake payment
   - Later: Patient B disputes "double payment"
   - System confused - payment already marked paid by Patient A
```

**Real-World Consequences:**
- Nurse never receives payment (marked before actual transfer)
- Patient B disputes payment (already marked paid)
- Chaos in reconciliation
- Fraud investigation required

**Severity:** 🔴 **CRITICAL - Financial system compromise**

**Fix (Simple):**
```javascript
exports.markPaymentAsPaid = async (req, res) => {
  const { paymentId } = req.params;
  const { reference, method } = req.body;

  const payment = await Payment.findById(paymentId)
    .populate("booking");  // Get booking details

  if (!payment) {
    return res.status(404).json({ error: "Payment not found" });
  }

  // ADD THIS: Validate ownership
  if (req.user.role === "patient" &&
      payment.booking.patientId.toString() !== req.user.id) {
    return res.status(403).json({
      error: "You can only mark payments you own as paid"
    });
  }

  // ADD THIS: Validate state
  if (payment.status !== "pending") {
    return res.status(400).json({
      error: "Can only mark pending payments as paid"
    });
  }

  payment.status = "paid";
  payment.reference = reference || `PAY-${Date.now()}`;
  await payment.save();
};
```

---

## WORKFLOW 3: Nurse Updates Booking Status

### 🚨 HIGH SEVERITY: Any Nurse Can Update Any Booking Status

**Backend Route (booking.js:39):**
```javascript
router.put("/status/:id",
  requireAuth,
  requireRole("nurse", "admin"),
  updateBookingStatus
);
```

**Backend Controller (bookingsController.js:406-446):**
```javascript
exports.updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const booking = await Booking.findById(id);

  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  // VULNERABILITY: No check if booking.nurseId === req.user.id
  // Any nurse can update status of any booking

  if (!["pending", "accepted", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  booking.status = status;
  await booking.save();

  res.status(200).json({ success: true, booking });
};
```

**Attack Scenario - Service Fraud:**
```
1. Booking #200:
   - Patient: Patient A
   - Nurse: Nurse B
   - Status: pending
   - Payment: pending

2. Attacker (Nurse A, different nurse) logs in
   Token: { userId: "NURSE_A_ID", role: "nurse" }

3. Attacker calls: PUT /api/bookings/200/status
   Body: { status: "completed" }

4. Backend checks:
   - requireAuth: ✓ Valid token
   - requireRole("nurse"): ✓ Nurse role
   - NO ownership check → Proceeds

5. Booking #200 status changed to "completed"
   - But Nurse A didn't provide the service!
   - Service provider is Nurse B
   - Nurse B gets no credit
   - Payment marked complete (possibly auto-processed)

6. Consequences:
   - Nurse B didn't provide service but shows complete
   - Nurse A gets payment for service they didn't provide
   - Patient A received no service but charged
   - System records fraudulent completion
```

**Severity:** 🟠 **HIGH - Service/payment fraud**

**Fix:**
```javascript
// Add ownership check
if (booking.nurseId.toString() !== req.user.id && req.user.role !== "admin") {
  return res.status(403).json({
    error: "You can only update bookings assigned to you"
  });
}
```

---

## WORKFLOW 4: Admin Approves Nurse (Frontend Security)

### Finding: Frontend Role Check Bypassable (Backend Protected)

**Frontend Issue (AuthGuard.tsx:37):**
```typescript
const role = localStorage.getItem("role");  // Bypassable

if (requiredRole && role !== requiredRole) {
  router.replace(dashboardMap[role] || "/dashboard/patient");
}
```

**Backend Protection (admin.js:39):**
```javascript
router.use(requireAuth, requireRole("admin"));  // Validates token
```

**Scenario: User Bypasses Frontend Check**
```
1. Regular user opens browser console
2. Runs: localStorage.setItem("role", "admin");
3. Refreshes page
4. Frontend AuthGuard sees role="admin" ✓
5. Allows access to /dashboard/admin page
6. User sees admin UI
7. Clicks "View Nurses" to view pending nurses
8. Frontend calls: GET /api/admin/nurses
9. Backend receives request with token: { role: "patient", id: "..." }
10. requireRole("admin") validates token.role
11. Token says patient, not admin → 403 Forbidden
12. Backend response: "Unauthorized"
13. User sees error message
```

**Result:**
- Frontend check bypassable ✓
- Backend protection prevents data leak ✓
- Poor UX: User sees admin page, then gets blocked error ✓

**Severity:** 🟡 **MEDIUM - UX issue, no data leak**

---

## WORKFLOW 5: Search Nurses (No Rate Limiting)

### Issue: API Hammering Risk

**Frontend Search Flow (nurses/page.tsx):**
```
User types: J → API call
User types: Jo → API call
User types: Joh → API call
User types: John → API call
Result: 4 API calls for 4 characters

Scale:
- 1000 concurrent users
- Average search: 8 characters
- Result: 8,000 API calls/minute to same endpoint
- Server resource exhaustion
- All users affected (cascading failure)
```

**Fix: Add debounce on frontend**
```typescript
const searchDebounce = debounce(() => {
  fetchNurses(searchLocation, searchService);
}, 500);  // Only call API after 500ms of no typing
```

---

## DATA OWNERSHIP VALIDATION MATRIX

| Endpoint | Operation | Validates Owner? | Issue | Severity |
|----------|-----------|------------------|-------|----------|
| POST /bookings/create | Create | ❌ NO | Patient can book for anyone | 🔴 CRITICAL |
| GET /bookings/patient/:id | Read | ✅ YES | Middleware validates | PROTECTED |
| GET /bookings/nurse/:id | Read | ✅ YES | Middleware validates | PROTECTED |
| PUT /bookings/status/:id | Update | ❌ NO | Nurse can update any booking | 🟠 HIGH |
| PUT /bookings/update/:id | Update | ❌ NO | Unknown if validated | NEEDS CHECK |
| PUT /payments/mark-paid/:id | Update | ❌ NO | Patient can mark any payment | 🔴 CRITICAL |
| GET /admin/bookings | Read | ✅ YES | Middleware + role validation | PROTECTED |
| PUT /admin/approve-nurse/:id | Update | ✅ YES | Assumed admin-only | NEEDS CHECK |

---

## CRITICAL FINDINGS SUMMARY

### 3 Critical Vulnerabilities Blocking Production:

#### 1. Patient Can Create Bookings for Anyone
| Aspect | Details |
|--------|---------|
| **File** | backend/controllers/bookingsController.js:355 |
| **Root Cause** | `patientId` accepted from request body, not validated against JWT |
| **Attack** | Attacker books service for victim, victim charged |
| **Fix** | `patientId: req.user.id` |
| **Severity** | 🔴 CRITICAL |
| **Time to Fix** | 2 minutes |

#### 2. Patient Can Mark Any Payment as Paid
| Aspect | Details |
|--------|---------|
| **File** | backend/controllers/paymentController.js:144-205 |
| **Root Cause** | No ownership check before updating payment status |
| **Attack** | Attacker marks fake payment as paid, payment system corrupted |
| **Fix** | Add `if (payment.patientId !== req.user.id) return 403` |
| **Severity** | 🔴 CRITICAL |
| **Time to Fix** | 5 minutes |

#### 3. Nurse Can Update Any Booking Status
| Aspect | Details |
|--------|---------|
| **File** | backend/controllers/bookingsController.js:406-446 |
| **Root Cause** | No ownership check before updating status |
| **Attack** | Nurse A marks Nurse B's booking complete, collects payment |
| **Fix** | Add `if (booking.nurseId !== req.user.id) return 403` |
| **Severity** | 🟠 HIGH |
| **Time to Fix** | 3 minutes |

---

## ARCHITECTURAL STRENGTHS

Despite the vulnerabilities found, the backend has good foundations:

✅ **Authentication Middleware Works**
```javascript
// Validates JWT token on every protected request
const requireAuth = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid token" });
  }
};
```

✅ **Role-Based Access Control Middleware Works**
```javascript
// Prevents unauthorized roles from accessing endpoints
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};
```

✅ **Privacy Middleware Exists for GET Routes**
```javascript
// Custom check in booking.js:17-25 prevents cross-user access
router.get("/nurse/:nurseId", ..., (req, res, next) => {
  if (req.user.role === "nurse" && req.user.id !== req.params.nurseId) {
    return res.status(403).json({ error: "Cannot view others' bookings" });
  }
  next();
}, getNurseBookings);
```

**Problem:** Ownership checks not consistently applied to mutation endpoints (POST, PUT).

---

## RECOMMENDED FIXES (Priority Order)

### IMMEDIATE (Do before production):

1. **Fix createBooking** (2 min)
```javascript
// Line 355 in bookingsController.js
patientId: req.user.id,  // Force to logged-in user
```

2. **Fix markPaymentAsPaid** (5 min)
```javascript
// Add at line 150 in paymentController.js
if (req.user.role === "patient" && payment.booking.patientId.toString() !== req.user.id) {
  return res.status(403).json({ error: "Forbidden" });
}
if (payment.status !== "pending") {
  return res.status(400).json({ error: "Can only mark pending payments" });
}
```

3. **Fix updateBookingStatus** (3 min)
```javascript
// Add at line 410 in bookingsController.js
if (booking.nurseId.toString() !== req.user.id && req.user.role !== "admin") {
  return res.status(403).json({ error: "Forbidden" });
}
```

### SHORT-TERM (This week):

4. **Create Shared Middleware Pattern**
```javascript
// Create: backend/middleware/ownership.js
const validateOwnership = (ownerField) => async (req, res, next) => {
  const model = req.model;  // Set by controller
  const record = await model.findById(req.params.id);

  if (record[ownerField].toString() !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  req.record = record;
  next();
};
```

5. **Add Debounce to Frontend Search**
6. **Implement Request Timeouts**

---

## TESTING CHECKLIST

Before production, verify:

- [ ] Try POST /bookings/create with different patientId → Must fail
- [ ] Try PUT /payments/mark-paid with others' payment ID → Must fail
- [ ] Try PUT /bookings/status with not-your booking → Must fail
- [ ] Try accessing /api/admin/* without admin role → Must fail with 403
- [ ] Try modifying localStorage role, then call admin API → Must fail with 403
- [ ] Verify JWT token in Authorization header validated on all requests
- [ ] Verify all mutation endpoints check request ownership
- [ ] Load test search endpoint with 1000 concurrent requests
- [ ] Verify no SQL injection via search parameters

---

## DEPLOYMENT BLOCKER CHECKLIST

**🔴 CANNOT DEPLOY until:**
- [ ] createBooking ownership validation added
- [ ] markPaymentAsPaid ownership validation added
- [ ] updateBookingStatus ownership validation added
- [ ] Security tests passing (above checklist)
- [ ] Code review of backend vulnerability fixes

---

**Report Complete**
**Risk Level: CRITICAL - 3 Critical Vulnerabilities Found**
**Recommendation: Do not deploy to production until fixes applied**
