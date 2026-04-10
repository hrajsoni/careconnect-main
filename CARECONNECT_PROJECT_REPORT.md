# PROJECT REPORT: CARECONNECT
## A Comprehensive Role-Based Home Healthcare Management System

---

## TABLE OF CONTENTS
1.  **ABSTRACT**
2.  **CHAPTER 1: INTRODUCTION**
    *   1.1 Project Overview
    *   1.2 Motivation
    *   1.3 Problem Statement
    *   1.4 Project Objectives
    *   1.5 Scope & Limitations
3.  **CHAPTER 2: LITERATURE SURVEY**
    *   2.1 Existing Systems Analysis
    *   2.2 Proposed System Advantages
4.  **CHAPTER 3: SYSTEM ANALYSIS & FEASIBILITY**
    *   3.1 Technical Feasibility
    *   3.2 Operational Feasibility
    *   3.3 Economic Feasibility
    *   3.4 Software & Hardware Requirements
5.  **CHAPTER 4: SYSTEM DESIGN**
    *   4.1 System Architecture
    *   4.2 Entity Relationship Diagram (ERD)
    *   4.3 Use Case Modeling
    *   4.4 Data Dictionary
6.  **CHAPTER 5: IMPLEMENTATION & SECURITY**
    *   5.1 Technology Stack Details
    *   5.2 Authentication Logic (JWT & Cookies)
    *   5.3 Role-Based Access Control (RBAC)
    *   5.4 Validation Hooks
7.  **CHAPTER 6: TESTING & RESULTS**
    *   6.1 Unit Testing
    *   6.2 Integration Testing
    *   6.3 Test Cases Table
8.  **CHAPTER 7: CONCLUSION & FUTURE SCOPE**
    *   7.1 Conclusion
    *   7.2 Future Enhancements
9.  **REFERENCES**

---

### ABSTRACT
**CareConnect** is a sophisticated web platform designed to streamline the discovery and booking of home-based healthcare services. It serves as a unified ecosystem for three primary stakeholders: **Patients**, **Nurses/Care Assistants**, and **Administrators**. The project leverages a high-performance stack (Next.js, Node.js, MongoDB) to ensure scalability and security. By implementing a mandatory identity-verification workflow for caregivers, CareConnect builds a "Circle of Trust," allowing families to book medical professional visits with confidence.

---

### CHAPTER 1: INTRODUCTION
#### 1.1 Project Overview
CareConnect is a digital marketplace for professional home nursing. Unlike generic healthcare apps, it focuses specifically on post-surgical care, elderly assistance, and professional nursing visits.

#### 1.2 Motivation
The motivation stems from the difficulty of finding qualified nurses in urban centers without relying on expensive, unverified middle-men. We aim to direct-link verified professionals with those in need.

#### 1.3 Problem Statement
Current home-care solutions lack:
*   Standardized pricing based on specific services.
*   Centralized repositories for medical visit outcomes (vitals tracking).
*   Robust proof-of-identity verification for home-visiting staff.

#### 1.4 Project Objectives
1.  Automate the booking lifecycle from request to completion.
2.  Maintain a permanent digital record of patient vitals (BP, Sugar, Temp) from each visit.
3.  Secure financial transactions using status-tracking references.
4.  Provide an Admin control center to prevent unauthorized providers from joining.

---

### CHAPTER 2: LITERATURE SURVEY
#### 2.1 Existing Systems Analysis
*   **Manual Systems:** Dependent on phone calls; zero tracking or record-keeping.
*   **General Medical Platforms (e.g., Practo):** Focus on clinic visits/doctors; often ignore the specific logistics of home-based long-term nursing.
*   **Agency Apps:** High commission rates and lack of direct communication between the caregiver and the family.

#### 2.2 Proposed System Advantages
*   **Direct Interaction:** Bypasses agency overheads.
*   **Vitals Tracking:** Integrated Visit Summary for clinical continuity.
*   **Stateless Security:** Uses JWT for higher security compared to session-based systems.

---

### CHAPTER 3: SYSTEM ANALYSIS & FEASIBILITY
#### 3.1 Technical Feasibility
The project uses **Next.js 15+** and **Tailwind CSS** for the frontend, and **Node.js/Express** for the backend. These are industry-standard, high-performance tools with vast documentation, making the system technically viable and maintainable.

#### 3.2 Operational Feasibility
The UI is designed for users with minimal technical skills. Patients can book in 3 clicks, and nurses can manage their "Service List" and "Daily Schedule" through a dedicated dashboard.

#### 3.3 Hardware & Software Requirements
**Software Requirements:**
*   **Client Side:** Modern Web Browser (Chrome, Edge, Firefox).
*   **Server Side:** Node.js v18+, MongoDB Atlas (Cloud Database).
*   **Development:** VS Code, Postman (API Testing).

**Hardware Requirements:**
*   **Server:** 2GB RAM (Minimum), Dual-core CPU.
*   **Client:** Any device with 4GB RAM and internet connectivity.

---

### CHAPTER 4: SYSTEM DESIGN
#### 4.1 System Architecture
The system follows a **Decoupled Architecture**:
1.  **Frontend (UI):** Built with Next.js for Server-Side Rendering (SSR).
2.  **Backend (API):** Consumed via RESTful endpoints.
3.  **Database:** Scalable NoSQL storage for flexible schemas.

#### 4.2 Data Dictionary
**Table: Users**
| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | Full name of the user |
| `email` | String | Unique login identifier (Lowercase) |
| `role` | Enum | 'patient', 'nurse', 'care_assistant', 'admin' |
| `isApproved` | Boolean | True only if Admin verifies ID/License |
| `qualification` | String | Educational background (Nurses only) |

**Table: Bookings**
| Field | Type | Description |
| :--- | :--- | :--- |
| `patientId` | ObjectID | Reference to User (Patient) |
| `nurseId` | ObjectID | Reference to User (Nurse) |
| `status` | Enum | 'pending', 'accepted', 'in_progress', 'completed' |
| `visitSummary`| Object | Records vitals like BP, Temp, Sugar |

---

### CHAPTER 5: IMPLEMENTATION & SECURITY
#### 5.1 Authentication (Hardened JWT)
Authentication is handled via **HTTP-only Cookies**. This ensures that the JWT token cannot be accessed by malicious scripts (XSS protection). 

**Code Logic Snippet:**
```javascript
// Verification middleware
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = await User.findById(decoded.id);
```

#### 5.2 Role-Based Access Control (RBAC)
We implemented custom middleware (`requireRole`) to ensure only authorized users access specific data. 
*   **Admin:** Access to User Verification and sitewide statistics.
*   **Nurse:** Access to assigned bookings and service pricing.
*   **Patient:** Access to booking history and profile.

---

### CHAPTER 6: TESTING & RESULTS
#### 6.1 Test Cases Table
| ID | Test Case | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| TC-01 | Register as Nurse | User created with `isApproved: false` | PASS |
| TC-02 | Login without correct password | Deny access with 401 Unauthorized | PASS |
| TC-03 | Patient books a service | Booking entry created in DB | PASS |
| TC-04 | Unapproved Nurse dashboard access | Redirect to "Wait for Approval" page | PASS |

---

### CHAPTER 7: CONCLUSION & FUTURE SCOPE
#### 7.1 Conclusion
CareConnect successfully provides a secure, efficient, and role-based environment for home healthcare. By automating the verification and vitals-tracking process, it significantly reduces the risk for patients.

#### 7.2 Future Scope
*   **IoT Integration:** Wearable devices to automatically sync BP and Pulse to the CareConnect dashboard.
*   **AI Matchmaking:** Recommending the best nurse based on proximity and specialization.
*   **Offline Mode:** Allowing nurses to record vitals in low-internet areas.

---

### REFERENCES
1. MongoDB Atlas Documentation (cloud.mongodb.com)
2. MDN Web Docs (JavaScript/Node.js guide)
3. OWASP Security Testing Guide
