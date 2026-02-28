## `CHANGELOG.md`

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-02-28

### Added
- `AuditEntry` type definition (`timestamp`, `principal`, `action`, `entity`)
- `getAuditLogs(page, pageSize)` query: returns paginated slice + total count
- `getMyRole()` query: returns caller role string (`"admin"` or `"user"`)
- 25 hardcoded sample entries for immediate local verification
- React frontend component with paginated table, color-coded action badges,
  principal truncation, loading skeletons, error/retry state
- Admin role gate: non-admin callers see an access-denied screen
- `dfx.json` for standalone deployment
- `examples/usage.md` integration walkthrough
- MIT license
