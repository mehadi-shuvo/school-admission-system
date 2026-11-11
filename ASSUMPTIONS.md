# Assumptions

## Purpose

This file explains choices made where the assignment does not give an exact rule. Required assignment rules are already implemented; they are not optional.

## Main decisions

| ID | Decision | Why / system result |
|---|---|---|
| A01 | A class and its shift are one class record. Class names are required, trimmed, and unique. | The assignment says every shift is a separate class but gives no fixed naming format. Unique names avoid confusion. Names are case-sensitive. |
| A02 | The 17-digit Student ID identifies the student and hold owner. It is not real login or identity proof. | The assignment has no login system. Leading zeroes are kept. Anyone with a valid ID can use it, so this is not suitable for a real school system. |
| A03 | One student can have only one `HELD` or `CONFIRMED` reservation in the same class. After cancellation or expiry, they may apply again if a seat is free. | This stops duplicate active applications while allowing released seats to be used again. Duplicate active requests return `409 Conflict`. |
| A04 | A hold expires when `expiresAt <= now`. An expired hold no longer uses a seat. | The assignment does not define the exact time boundary. This rule gives one clear answer at the expiry time and makes the seat reusable immediately. |
| A05 | The system has both logical and saved expiry. | Seat counts ignore an overdue hold immediately. A background worker later saves its status as `EXPIRED`, so seat release does not wait for the worker. |
| A06 | Only the hold owner can confirm or cancel an active hold. Confirmation and repeated cancellation are safe to repeat. | Confirmation means simulated fee payment only. Repeated confirmation stays `CONFIRMED`; repeated cancellation stays successful. Expired, cancelled, or confirmed holds cannot use invalid actions. |
| A07 | First-come-first-served means the request that gets the database lock while a seat is free succeeds. | Exact internet arrival order cannot be guaranteed. PostgreSQL transactions and row locks prevent overbooking, including with more than one backend process. |
| A08 | Hold time is configurable with `HOLD_DURATION_SECONDS` (default: 600 seconds). The worker scan interval is configurable separately (default: 30 seconds). | The assignment sets the hold default but not the worker timing. Both values must be positive numbers. |
| A09 | The frontend refreshes available seats every five seconds while the tab is visible. | The assignment requires updates without reloading the page but does not specify how often. Requests do not overlap, and the backend still makes the final seat decision. |
| A10 | PostgreSQL stays private in Docker. The browser uses `/api`; Nginx forwards it to `FRONTEND_API_UPSTREAM` (default: `backend:8080`). | This keeps database access off the host and lets the frontend backend target be changed without exposing it to browser code. |

## Operational behaviour

- The migration service runs after PostgreSQL is healthy.
- The PostgreSQL named volume keeps data after a normal container restart or `docker compose down`.
- Errors follow the API contract: invalid input `400`, wrong owner `403`, missing item `404`, and seat/state conflict `409`.

## Optional verification

The repository includes frontend unit tests, Playwright browser tests, and an optional two-backend Docker test. The bonus test checks that two API processes sharing one database cannot overbook seats.

## Limits

- There is no real login, admin authorization, or identity verification.
- Payment is simulated; there is no payment gateway, receipt, refund, email, or SMS.
- This is an assignment project, not a full production admissions platform.
