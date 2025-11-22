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
         /imageinf/ui/ → Built React files
         /imageinf/api/ → Backend API (FastAPI)
```

## Configuration

1. Copy the example env file:
```bash
cp .env.iframe.example .env.iframe
```

2. Edit `.env.iframe` and replace the JWT token with your actual Tapis token:
```bash
JWT_TOKEN=your_actual_jwt_token_here
```

## Running iframe Tests

You need **2 terminals** running simultaneously:

### Terminal 1: Service with Built Client
```bash
make start-built
```

This command:
- Builds the React client (`npm run build`)
- Starts the backend API (FastAPI)
- Starts nginx serving the built client files
- Service available at `http://localhost:8080/imageinf/ui/` 

### Terminal 2: Mock CEP Portal
```bash
make start-iframe-test
```

This starts a mock CEP portal that:
- Runs at `https://cep.test/` (ports 80/443)
- Serves an iframe test page
- Provides mock `/api/auth/tapis/` endpoint with your JWT token
- Proxies `/imageinf/` → `http://localhost:8080/imageinf`

## Testing Scenarios

### Scenario 1: Direct Access (NOT in iframe)
Open `http://localhost:8080imageinf/ui`

**Expected behavior:**
- App detects it's NOT in an iframe
- Shows login button
- User must manually authenticate

### Scenario 2: iframe Access (IN iframe - Production simulation)
Open `https://cep.test/`  (or `https://cep.test/imageinf/ui` without iframe)

**Expected behavior:**
- App loads inside iframe on the CEP portal page
- App detects it's IN an iframe
- Automatically fetches token from parent window via `/api/auth/tapis/`
- No login button shown
- User is automatically authenticated

## Stopping Services
```bash
# Stop service
make stop-built

# Stop CEP portal
make stop-iframe-test
```
