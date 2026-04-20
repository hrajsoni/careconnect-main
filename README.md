CareConnect
A Next-Generation Home Healthcare Delivery Platform


Abstract

1. Abstract
CareConnect is a comprehensive, full-stack home healthcare management platform specifically engineered to bridge the gap between patients requiring at-home medical attention and qualified healthcare professionals. By offering role-based routing, the system allows for real-time booking of nurses, ambulance dispatches, and secure doctor consultations.

2. Live Project Links
Platform Application (Vercel): [Insert Live Vercel Link Here]
API Backend (Render): [Insert Live Render Link Here]
3. Open-Source Source Code & Technical Documentation
The entire system's source code, component hierarchy, database schemas, and configuration setup are publicly available. Evaluators can explore the technical depth, commit history, and system architecture diagrams directly in the official GitHub Repository:

Core System Modules)

4. Application Architecture & Components
CareConnect employs strict authentication and role-based access control, rendering four unique dashboards based on user authorization:

1. Patient Portal

Intuitive browsing and booking of specialized home healthcare services.
Real-time online doctor appointment scheduling.
Emergency ambulance dispatch requests routed instantly to available transport arrays.
Secure, token-based simulated payment processing.
2. Nurse Portal

Calendar management for assigned patient home-visits.
Real-time revenue tracking implementing an automated 70% (Nurse) / 30% (Platform) organizational split.
Profile and specialized medical service management.
3. Care Assistant Portal

Designed for rapid response transportation.
Implements automated GPS coordinate tracking for real-time dispatch routing.
Accept or reject emergency ambulance requests dynamically.
4. Administrator Portal

Centralized system oversight governing users, doctors, and nurses.
Master control of platform pricing parameters and base service limits.
Total analytics of accrued platform revenue.
5. Technology Stack
Frontend Layer: Next.js 14, React.js, Tailwind CSS (Hosted on Vercel)
Backend/API Layer: Node.js, Express.js (Hosted on Render)
Database Layer: MongoDB / Mongoose ODM (Hosted on MongoDB Atlas)
Security: Stateless Bearer-Token JWT Authentication, BCrypt Hashing, Custom CORS Middlewares.
