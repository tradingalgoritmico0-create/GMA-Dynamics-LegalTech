# Security & Performance Vault

## 🔒 Security (OWASP Top 10)
- **Injection:** Always use parameterized queries (Supabase SDK does this by default).
- **Broken Access Control:** Rigorously test RLS (Row Level Security) policies.
- **Cryptographic Failures:** Use the SubtleCrypto API for browser-side hashing and encryption.
- **Sensitive Data:** Never store PII (Personally Identifiable Information) in cleartext.

## ⚡ Performance Optimization
- **Code Splitting:** Use `React.lazy()` for heavy components like Admin Panels.
- **Asset Optimization:** Use WebP for images and minify all PDF processing logic.
- **Memoization:** Apply `useMemo` and `useCallback` to prevent unnecessary re-renders in complex dashboards.
