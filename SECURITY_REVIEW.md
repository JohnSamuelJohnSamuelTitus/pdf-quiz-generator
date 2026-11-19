# LearnSphere — Comprehensive Cybersecurity & Security Review
**Academic Module:** CSE279 Personalized Learning Platform  
**Architecture:** Secure Full-Stack Web Application  
**Audit Scope:** Ingestion, Auth, API Proxy, Database, and Guest Sessions  
**Status:** Audited & Verified  
**Date:** November 2026

---

## 1. Threat Model & Security Posture

LearnSphere processes user-supplied documents, syllabus outlines, and personal academic data. The platform incorporates defense-in-depth principles to prevent file-based exploits, privilege escalation, cross-tenant data leakage, and credential exposure.

---

## 2. File Upload & Ingestion Security

File upload pipelines represent one of the highest-risk attack surfaces in web applications. LearnSphere implements strict controls:

| Security Domain | Mitigation Strategy | Verification Status |
| :--- | :--- | :--- |
| **Path Traversal / Arbitrary File Write** | Memory Storage (`multer.memoryStorage()`). No files are written to server disk storage or temporary OS paths. Buffers are processed in RAM and discarded. | **VERIFIED SAFE** |
| **Denial of Service (Zip / File Bomb)** | Strict 25MB ceiling enforced at the Multer middleware layer. Over-sized payloads are rejected with HTTP 413 before memory allocation. | **VERIFIED SAFE** |
| **MIME Spoofing / Malicious Executables** | Dual-layer verification: checks `file.mimetype` against `application/pdf`, `text/plain`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, plus strict file extension inspection (`.pdf`, `.txt`, `.docx`). Executables (`.exe`, `.sh`, `.bat`, `.js`) are immediately rejected. | **VERIFIED SAFE** |
| **Buffer Exploits / Memory Leaks** | Buffers are read directly via isolated streams or dynamic imports (`pdf-parse`, `mammoth`). Garbage collector cleans buffers upon controller completion. | **VERIFIED SAFE** |

---

## 3. Login-Free Guest Session Isolation & Account Migration

LearnSphere enables students to use the platform immediately without mandatory registration while preserving strict tenant isolation:

1. **Guest Identifier Generation**:
   - Guest IDs follow the format: `guest_${timestamp}_${crypto_random_alphanumeric}`.
   - Example: `guest_1731671234567_k8d9f2a`.
2. **Session Header Validation**:
   - Handled via `requireSession` middleware.
   - The client transmits the guest token via the `X-Guest-Session` header.
   - If invalid or absent, a new isolated guest record is created in `guest_sessions`.
3. **Database-Level Isolation**:
   - All student tables (`learning_projects`, `uploaded_documents`, `topic_notes`, `quiz_attempts`, `student_progress`) filter queries by `user_id = ?`.
   - A guest session cannot access or query another guest's or registered user's projects.
4. **Atomic Account Migration**:
   - When a guest student registers or logs in, `migrateGuestData(guestId, targetUserId)` reassigns all records (`UPDATE ... SET user_id = ? WHERE user_id = ?`) atomically.
   - The obsolete guest record is purged from `guest_sessions`.

---

## 4. Secret Isolation & API Key Masking

1. **Server-Side API Proxy Boundary**:
   - External APIs are contacted solely from the Node.js server.
   - Client browsers never receive or possess third-party API keys.
2. **Credential Masking in API Responses**:
   - In the API & Integrations Centre (`/api/integrations`), all API keys are masked before JSON serialization:
     - Input: `sk-openalex-live-prod-secret-9948271`
     - Transmitted to Client: `sk-o••••••••8271`
   - Eliminates risk of secret exposure in browser dev tools, HTTP interception, or client-side logs.

---

## 5. SQL Injection & Database Safety

- **Parameterized Prepared Statements**:
  - Every SQL interaction across the codebase uses parameterized inputs:
    ```ts
    await run('SELECT * FROM learning_projects WHERE id = ? AND user_id = ?', [id, userId]);
    ```
  - String concatenation or dynamic interpolation of user input into SQL statements is prohibited.
- **Relational Integrity**:
  - SQLite foreign key constraints (`ON DELETE CASCADE`) maintain referential integrity. Deleting a learning project automatically cascades to its units, topics, uploaded documents, document sections, and topic notes.

---

## 6. Authentication & Cryptographic Standards

- **Password Hashing**: Bcrypt with 10 salt rounds (`bcrypt.hashSync(password, 10)`). Plaintext passwords are never logged, stored, or serialized.
- **JWT Signing**: Signed with HMAC-SHA256 and verified on every authenticated request.
- **CORS Configuration**: Whitelisted methods (`GET, POST, PUT, PATCH, DELETE, OPTIONS`) and explicit allowed headers (`Content-Type, Authorization, X-Guest-Session`).
