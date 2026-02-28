# by_iLy_Audit_Log_Viewer

A read-only audit log viewer for Internet Computer (ICP) canisters. Displays a
paginated table of system events -- timestamp, principal, action, entity -- with
role-based access control that restricts the view to admin users.

Extracted from a production enterprise portfolio management platform. The
component is fully functional as a standalone module.

* Built on caffeine by Devan Johnathan Bailey

---

## What It Does

- Exposes a `getAuditLogs(page, pageSize)` query on the backend canister
- Returns a paginated slice of `AuditEntry` records plus a total count
- Exposes a `getMyRole()` query so the frontend can check the caller's role
- The React frontend renders a table with color-coded action badges, principal
  truncation, loading skeletons, error/retry state, and numeric page controls
- Non-admin callers see an access-denied screen instead of the table

The sample canister ships with 25 hardcoded entries so you can verify pagination
immediately after deployment.

---

## Who This Is For

Backend or full-stack developers building on ICP who need a drop-in audit trail
viewer for an existing canister. The backend is a thin query layer you can swap
for a real log store; the frontend component is the production UI.

Useful for:
- Internal admin panels on ICP
- Compliance or audit dashboards
- Any scenario where you store structured event logs in canister stable memory

---

## Deploy as a Standalone Canister

**Prerequisites:** `dfx` >= 0.21, Node.js >= 18, `npm` or `pnpm`.

```sh
# 1. Clone the repo
git clone https://github.com/DevanBailey/by_iLy_Audit_Log_Viewer.git
cd by_iLy_Audit_Log_Viewer

# 2. Start a local replica
dfx start --background

# 3. Deploy the backend canister
dfx deploy audit_log_viewer

# 4. Note the canister ID printed by dfx, then set it in the frontend env
echo "VITE_CANISTER_ID=<canister-id>" > frontend/.env

# 5. Install frontend dependencies and start the dev server
cd frontend
npm install
npm run dev

The app will be available at http://localhost:5173. Sign in with Internet Identity. The sample data uses 2vxsx-fae as the admin principal (the default anonymous identity in local development); all other identities will see the access-denied screen.
