# LearnSphere — External API Failure Resilience Report
**Academic Module:** CSE279 Personalized Learning Platform  
**Component:** Comprehensive API Failure Simulation & Fault Tolerance Suite  
**Test Suite:** `tests/api-failures.test.ts`  
**Status:** 100% Pass Rate (10/10 Tests Passed)  
**Date:** November 2026

---

## 1. Objective & Methodology

LearnSphere treats external APIs as inherently unpredictable network dependencies. To prevent client crashes, infinite loading spinners, corrupted database states, or unhandled promise rejections, every API service is fortified with strict timeouts, structured fallback models, and circuit breaker patterns.

All nine (9) mandatory failure conditions were tested against the application's actual service layer using controlled HTTP test servers and simulation fixtures.

---

## 2. Failure Condition Results Matrix

| Failure Condition | Simulation Mechanism | Service Layer Behavior | Fallback / Recovery Strategy | Result |
| :--- | :--- | :--- | :--- | :--- |
| **1. Successful Response** | Live / Mock HTTP 200 with valid schema | Decodes JSON, computes latency, caches response | Cached for 60 min; instant UI rendering | **PASS** |
| **2. HTTP 404 (Not Found)** | Controlled server responds with 404 | Trapped in service layer; throws typed error or returns `null` | Returns clean empty dataset or theoretical overview; no crash | **PASS** |
| **3. HTTP 429 (Rate Limit)** | Controlled server returns 429 Too Many Requests | Catches 429; marks provider status as degraded | Switches seamlessly to deterministic fallback questions and local DB | **PASS** |
| **4. HTTP 500 (Server Error)** | Controlled server returns 500 Internal Error | Traps 500 error; prevents unhandled rejection | Activates fallback study materials and cached definitions | **PASS** |
| **5. Network Unavailable** | Connection reset (`ECONNREFUSED` / DNS drop) | Catches network exception within try/catch block | Returns verified local fallback questions citing course topics | **PASS** |
| **6. Request Timeout** | Delayed response exceeding 4000ms threshold | `AbortController.abort()` triggers after timeout window | Logs latency as timeout; falls back immediately; no hanging requests | **PASS** |
| **7. Invalid / Malformed JSON** | Controlled server responds with invalid raw text | `res.json()` catch block intercepts parsing syntax error | Activates fallback structure; prevents JSON parse exception crash | **PASS** |
| **8. Empty Response** | Controlled server returns `{}` or empty array | Validates array length and required fields | Returns empty array; UI displays elegant EmptyState component | **PASS** |
| **9. Missing Expected Fields** | Response missing expected properties (e.g. `extract`) | Optional chaining (`?.`) and fallback default assignments | Synthesizes clean fallback title/summary without undefined errors | **PASS** |

---

## 3. Test Execution Verification

Extracted directly from automated Vitest execution:

```
 ✓ tests/api-failures.test.ts (10 tests) 431ms
   ✓ API Failure Simulation & Resilience Suite > Condition 1: Handles successful response with structured parsing
   ✓ API Failure Simulation & Resilience Suite > Condition 2: Handles HTTP 404 gracefully without crash
   ✓ API Failure Simulation & Resilience Suite > Condition 3: Handles HTTP 429 rate limiting with fallback
   ✓ API Failure Simulation & Resilience Suite > Condition 4: Handles HTTP 500 server error with fallback
   ✓ API Failure Simulation & Resilience Suite > Condition 5: Handles network unavailability gracefully
   ✓ API Failure Simulation & Resilience Suite > Condition 6: Enforces strict timeout on hanging requests
   ✓ API Failure Simulation & Resilience Suite > Condition 7: Handles malformed JSON payload without crashing
   ✓ API Failure Simulation & Resilience Suite > Condition 8: Handles empty responses cleanly
   ✓ API Failure Simulation & Resilience Suite > Condition 9: Handles missing expected fields defensively
   ✓ API Failure Simulation & Resilience Suite > Database safety: API failures never corrupt database records
```

---

## 4. Key Architectural Safeguards

1. **Deterministic Quiz Fallback**: If Open Trivia DB or any external quiz API is degraded, `QuestionGeneratorService` deterministically generates multi-choice, true/false, and short-answer questions from local database topics and uploaded documents.
2. **Database Isolation**: External API responses are validated and mapped into typed interfaces before database ingestion. Failed or partial responses are never written to the SQLite database.
3. **No Sensitive Leaks**: Backend stack traces or third-party error bodies are sanitized in Express middleware before returning generic, helpful messages to the frontend.
