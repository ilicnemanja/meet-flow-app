# MeetFlow

MeetFlow is a small full-stack project that demonstrates **Microsoft Single Sign-On (SSO)** using **OpenID Connect**, along with **OAuth 2.0 authorization** to schedule meetings in **Outlook Calendar** via **Microsoft Graph**.

The project is intentionally designed as a _backend-centric integration_, focusing on real-world identity flows, secure token handling, and clean system boundaries rather than UI complexity.

---

## Project Goals

This project exists to practice and understand:

- Microsoft Entra ID (Azure AD) authentication using OpenID Connect
- OAuth 2.0 authorization and consent flows
- Secure handling of access and refresh tokens
- Integration with Microsoft Graph for calendar operations
- Separation of concerns between frontend, backend, and external providers
- Production-style system design patterns

It is meant as a **learning and reference implementation**, not a feature-complete product.

---

## High-Level Architecture

The repository is structured as a simple monorepo:

```
apps/
  frontend/   → Web client (TanStack Start)
  backend/    → API server (NestJS)
```

### System Boundary

**Inside the system:**

- Frontend application
- Backend API
- Token storage and business logic

**Outside the system:**

- Microsoft Entra ID (identity provider)
- Microsoft Graph (calendar API)

The frontend never communicates directly with Microsoft Graph. All OAuth tokens and calendar operations are handled by the backend.

---

## Authentication & Authorization Model

MeetFlow uses a combined flow that includes:

- **OpenID Connect (OIDC)** for authentication (who the user is)
- **OAuth 2.0** for authorization (what the app is allowed to do)

When a user signs in with Microsoft:

1. The backend initiates an OIDC login flow
2. The user authenticates with Microsoft (SSO experience)
3. Microsoft returns:

   - An ID token (user identity)
   - An access token (API access)
   - A refresh token (long-lived authorization)

4. The backend stores tokens securely and creates an application session

OAuth scopes include calendar permissions such as `Calendars.ReadWrite`.

---

## Meeting Scheduling Flow

1. User logs in via Microsoft SSO
2. User submits meeting details from the frontend
3. Frontend calls the backend API
4. Backend:

   - Retrieves a valid access token
   - Refreshes the token if necessary
   - Calls Microsoft Graph to create a calendar event

5. The meeting appears in the user’s Outlook calendar

The backend is responsible for reliability, idempotency, and error handling.

---

## Non-Functional Considerations

This project explicitly focuses on non-functional requirements such as:

- **Security**: tokens are never exposed to the frontend
- **Reliability**: graceful handling of token expiration and API failures
- **Maintainability**: clear separation between identity, authorization, and business logic
- **Extensibility**: architecture allows additional providers (e.g. Google Calendar) in the future

---

## Environment Configuration

Environment variables are required for Microsoft Entra ID and Graph integration.

Sensitive configuration files (`.env`, `.env.local`, etc.) are ignored by Git.

An example file (`.env.example`) should be used to document required variables.

---

## Status

This project is under active development and iteration.

The primary focus is learning, experimentation, and architectural clarity rather than UI polish.

---

## License

This project is for educational purposes.
