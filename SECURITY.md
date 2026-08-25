# Security policy

Security fixes target the latest `main` revision.

Do not report vulnerabilities with real merchant records, credentials,
pseudonymous identifiers, API keys, or database artifacts in a public issue.
Use GitHub private vulnerability reporting when available.

Reports should include the affected route, expected and observed behavior,
impact, and a sanitized reproduction. The browser must never receive
`INTERNAL_API_KEY`, `OPENAI_API_KEY`, direct DuckDB access, or raw records
belonging to another merchant.
