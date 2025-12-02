# iframe Testing (Local Development)

Test how the SPA behaves when embedded in an iframe (simulating production CEP environment).

## Architecture
```
   Browser → https://cep.test/imageinf/ui/ (UI) or /imageinf/api/ (API)
             ↓
         CEP Portal nginx (mock)
             ↓
         proxies → http://localhost:8080/imageinf/ui/ and /imageinf/api/
             ↓
         Your service nginx (port 8080)
             ↓
         /imageinf/ui/ → Proxied to Vite at port 5173 
         /imageinf/api/ → Backend API
```

## Configuration

Run the automated token setup:
```bash
make setup-tapis-token
```

This will prompt for your Tapis site selection and credentials, then automatically create `.env.iframe` with your JWT token.

**Note:** Tapis tokens expire after a few hours. If you see authentication errors or the login button appears in the iframe test, re-run `make setup-tapis-token` to get a fresh token.

## Running iframe simulation setup

You need **3 terminals** running simultaneously:

### Terminal 1: Backend + Nginx
```bash
make start
```

This starts:
- Backend API (FastAPI)
- Nginx proxy at `http://localhost:8080`

### Terminal 2: Vite Dev Server
```bash
cd client
npm run dev
```

This starts the Vite dev server with hot module replacement at port 5173.

### Terminal 3: Run "CEP" Portal
```bash
make start-iframe-cep-test-simulation
```

This starts a mock CEP portal that:
- Runs at `https://cep.test/` (ports 80/443)
- Serves an iframe test page
- Provides mock `/api/auth/tapis/` endpoint with your JWT token
- Proxies `/imageinf/` → `http://localhost:8080/imageinf/`

## Testing Scenarios

### Scenario 1: Direct Access (NOT in iframe)
Open `http://localhost:8080/imageinf/ui/`

**Expected behavior:**
- App detects it's NOT in an iframe
- Shows login button
- User must manually authenticate

### Scenario 2: iframe Access (IN iframe - Production simulation)
Open `https://cep.test/`

**Expected behavior:**
- App loads inside iframe on the CEP portal page
- App detects it's IN an iframe
- Automatically fetches token from portal's /api/auth/tapis/ endpoint Automatically fetches token from portal's /api/auth/tapis/ endpoint Automatically fetches token from portal's /api/auth/tapis/ endpoint
- No login button shown (user is automatically authenticated)
