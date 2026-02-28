

## Deploy as a Standalone Canister

**Prerequisites:** `dfx` >= 0.21, Node.js >= 18, `npm` or `pnpm`.

```sh
# 1. Clone the repo
git clone https://github.com/your-org/by_iLy_Audit_Log_Viewer.git
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