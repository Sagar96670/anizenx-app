# Security Specification: Master VIP Paywall & Payment System

This security specification outlines the data invariants, threat model, and "Dirty Dozen" malicious payloads used to verify our Zero-Trust Firebase Security Rules.

## 1. Core Data Invariants

1. **User VIP State Isolation**: 
   - A normal user CANNOT directly modify their own `isVip`, `tier`, `planId`, `activatedAt`, or `expiresAt` fields. Only the Super Admin can approve manual requests or process auto callbacks.
   - Users can initialize or update their own profile fields like `userName`, `email`, and `photoURL` as long as `isVip` remains `false`.

2. **Administrative Payment Settings**:
   - Only the Super Admin (`sagars19585@gmail.com`) is authorized to write or modify the `settings/payment` document.
   - Standard users and guests can read `settings/payment` to render QR codes, bank accounts, and UPI copy actions.

3. **Manual VIP Payment Requests (`vip_requests` collection)**:
   - Any authenticated user can create a manual request under their own `userId` with state set to `pending`.
   - Normal users CANNOT modify an existing request once created (fields are immutable for contributors).
   - Only the Super Admin (`sagars19585@gmail.com`) can update a request to `approved` or `rejected`.
   - The document ID of the request must be securely validated to prevent injection of malicious keys.

---

## 2. The "Dirty Dozen" Attack Payloads

### Identity Spoofing & Privilege Escalation
1. **Payload #1 (Self-VIP Activation)**: A normal user attempts to directly set `isVip: true` on their user document.
2. **Payload #2 (Self-Promoted Admin Role)**: A normal user attempts to write to the `admins` collection.
3. **Payload #3 (Hijacked Settings)**: A normal user attempts to overwrite `settings/payment` with their own bank account.

### Manual Request Tampering
4. **Payload #4 (Self-Approve Request)**: A user attempts to update a `vip_requests` document status from `pending` to `approved`.
5. **Payload #5 (ID Poisoning Attack)**: A user submits a request with an invalid or dangerously long ID (e.g. 2KB string).
6. **Payload #6 (Steal Other User's Submission)**: User A attempts to edit User B's manual VIP payment request.
7. **Payload #7 (Bypassing pending status on create)**: A user creates a request directly with `status: 'approved'`.
8. **Payload #8 (Shadow Fields Insertion)**: A user creates a request containing shadow fields to bypass schema size checking.

### PII & Relational Violations
9. **Payload #9 (Unauthenticated Reading)**: An unauthenticated guest attempts to query the `vip_requests` collection.
10. **Payload #10 (Mass Data Scraping)**: A signed-in user attempts to view all user profiles in the `/users` collection.
11. **Payload #11 (Modifying processing status)**: A user tries to clear their payment history `paymentMethod` on their user doc.
12. **Payload #12 (Type Safety Violation)**: A user submits a request with `priceInr` as a string instead of an integer.

---

## 3. Test Runner Schema (Mock Verification)

All 12 of the above payloads MUST be rejected with `PERMISSION_DENIED` by our Firestore Security rules.
- Authenticated state is strictly evaluated on the server side.
- Token email must match `'sagars19585@gmail.com'` to qualify for administrative access.
