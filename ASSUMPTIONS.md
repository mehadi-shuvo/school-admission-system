# Assumptions and Implemented Rules

This document distinguishes verified implementation behavior from assignment-level scope assumptions.

## Verified domain rules

### Classes and seat accounting

- A class name is trimmed, required, at most 150 characters, and unique. The database unique index is case-sensitive.
- `totalSeats` must be positive.
- `availableSeats = totalSeats - heldSeats - confirmedSeats`.
- `heldSeats` counts only `HELD` reservations whose `expiresAt` is later than the current UTC time. `confirmedSeats` counts all `CONFIRMED` reservations.

### Reservation states

| State | Meaning | Outcome |
|---|---|---|
| `HELD` | Temporary reservation before expiry | May be confirmed, cancelled, or expired. |
| `CONFIRMED` | Finalized simulated admission | Terminal; repeated confirmation succeeds idempotently. |
| `CANCELLED` | Student released a valid hold | Terminal; repeated cancellation succeeds idempotently. |
| `EXPIRED` | Hold reached its expiry time | Terminal; cannot be confirmed or cancelled. |

Attempts to apply an unsupported state transition return the API's conflict response.

### Hold duration and expiry

- `HOLD_DURATION_SECONDS` is a positive-integer TTL; the application default is 600 seconds.
- `HOLD_EXPIRY_SCAN_INTERVAL_SECONDS` is a positive-integer worker interval; the application default is 30 seconds.
- Logical expiry occurs exactly at `expiresAt`: expired `HELD` rows are excluded from occupancy immediately.
- Persisted expiry is eventual: the worker updates overdue `HELD` rows to `EXPIRED` at startup and on subsequent scans. Capacity-changing requests also expire overdue holds for their class while holding that class row.
- The normal Compose file forwards `HOLD_DURATION_SECONDS`, but not the worker scan interval, so the application default applies there.

### Student identity and duplicates

- Student IDs must be exactly 17 ASCII digits, with leading zeroes preserved.
- The supplied `X-Student-Id` header identifies the owner for assignment purposes. A different supplied ID cannot confirm or cancel an existing hold.
- A student may have at most one active (`HELD` or `CONFIRMED`) reservation for a class. After expiry or cancellation, a later hold is allowed when capacity exists.
- This is intentionally not real authentication or identity verification.

### Concurrency and idempotency

- Create, confirm, and cancel use database transactions and lock the relevant class row with PostgreSQL `FOR UPDATE`.
- A filtered unique index on active statuses protects against duplicate student/class reservations.
- PostgreSQL, not process-local memory, coordinates capacity across independent backend instances.
- Background expiry conditionally updates only overdue `HELD` records. Multiple worker instances do not transition confirmed or cancelled records.

## Verified UI behavior

- The class list polls every five seconds while the browser tab is visible and refreshes after visibility returns.
- The Student ID is held in application memory for the current frontend session; it is not a sign-in flow.
- The payment button is a simulated admission-fee action that triggers reservation confirmation only.
- Reservation history supports lookup, loading, empty, error, retry, confirmation, cancellation, and changing the Student ID.

## Assignment scope exclusions

- Class creation is exposed without administrator authentication or role authorization.
- No payment processor, financial transaction, receipt, refund, email, or SMS workflow exists.
- No identity-provider integration exists; the Student ID is a lightweight assignment mechanism.
- No public deployment URL is assumed.
- PostgreSQL is private in the normal Compose network; production infrastructure and secret-management policy are outside this repository.
