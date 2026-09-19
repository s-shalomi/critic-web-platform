# Auth Domain Documentation

## Overview
The Auth domain manages student access-code authentication, teacher credential verification, and JWT session token generation/validation across the CRITIC web platform.

## Key Files
- [`jwt.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/auth/jwt.ts): Encapsulates JWT signing and verification using `jose` with HS256 algorithm.
- [`authService.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/auth/authService.ts): Core domain service performing student access-code validation and teacher password hashing verification.

## API Contracts
- `POST /api/auth/student-login`: Authenticates student via access code (e.g., `CLIMATE2026`).
- `POST /api/auth/teacher-login`: Authenticates teacher via email and password (e.g., `teacher@school.edu`).

## Extensibility & Security
- Student identities are anonymous and tied strictly to generated access codes. No email or name is stored for students.
- Passwords for teachers are hashed via `bcryptjs`.
