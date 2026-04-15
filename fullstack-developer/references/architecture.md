# High-Level Engineering Patterns

## 1. Clean Architecture & SOLID
- **S.O.L.I.D:** Always apply Single Responsibility and Dependency Inversion.
- **Separation of Concerns:** Keep Business Logic (Services) decoupled from UI (Components) and Data (Repositories).

## 2. Design Patterns
- **Strategy Pattern:** For multi-provider payment gateways (e.g., switching between MP and Stripe).
- **Observer Pattern:** For real-time updates using Supabase Realtime.
- **Factory Pattern:** For generating complex judicial certificates.

## 3. State Management
- **Atomic State:** Use local state for UI, but shared state (Context/Zustand) for global auth and plan data.
- **Query Caching:** Minimize DB calls by using intelligent caching strategies.
