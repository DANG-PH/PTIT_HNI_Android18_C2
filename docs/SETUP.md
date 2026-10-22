# Setup

NeedToKnow has three parts:

| Part | Path | Runs on |
|---|---|---|
| TideCloak (identity, E2EE, IGA) | `infra/` | Docker `tideorg/tidecloak-dev`, wired to Tide's production ORK network |
| Web app (Next.js 16 + `@tidecloak/nextjs`) | `frontend/` | port 3000 (dev) / 3100 (prod) |
| API (NestJS + SQLite + Gemini) | `backend/` | port 3101 |

All data in the demo is synthetic.

## 1. TideCloak

```bash
mkdir -p tidecloak-data && sudo chown 1000:1000 tidecloak-data
docker run -d --name ntk-tidecloak -p 8080:8080 \
  -v "$PWD/tidecloak-data:/opt/keycloak/data/h2" \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD="<a strong password>" \
  tideorg/tidecloak-dev:latest
```

Behind a reverse proxy, add `-e KC_HOSTNAME=https://<your-tide-host> -e KC_PROXY_HEADERS=xforwarded -e KC_HTTP_ENABLED=true`.
`infra/docker-compose.yml` and `infra/nginx/needtoknow.conf` show the production layout.

## 2. Provision the realm

`infra/tidecloak/realm.json` defines the realm. It contains:

- the `needtoknow-web` public client;
- the `_tide_vault.selfencrypt` and `_tide_vault.selfdecrypt` default roles, used for Tide self-encryption with the tag `vault`;
- the `ntk-operator` role for the operator console.

Run Tide's template initializer. It does the following:

1. Licenses the realm (VRK keygen on the Tide network).
2. Enables IGA in Tide mode.
3. Creates the first admin.
4. Exports `frontend/tidecloak.json`, which includes the embedded JWK.

```bash
TIDE_LICENSE_EMAIL=<your email> TIDE_TERMS_ACCEPTED=yes \
TIDECLOAK_URL=http://localhost:8080 KC_PASSWORD="<bootstrap password>" \
  bash infra/tidecloak/init-realm.sh
```

`TIDE_TERMS_ACCEPTED=yes` means you agree to https://tide.org/legal.

The script stops at **ACTION REQUIRED** and prints a link. Open the link and enroll your Tide account. The script continues on its own once enrollment finishes.

For the quorum demo, add two more admins in the Tide admin console (`/realms/needtoknow/tide-console/`). Each new admin enrolls with their own link. Give each one the `tide-realm-admin` client role, then approve those change requests. With 3 admins, every governed change needs 2 approvals.

To grant the operator role, assign the `ntk-operator` realm role to a user in the console. The assignment becomes a change request that needs the quorum.

## 3. API

```bash
cd backend
cp .env.example .env          # set GEMINI_API_KEY
npm install
npm run start:dev             # http://localhost:3101/api/health
npm run test:e2e              # auth guard tests
```

The API reads `../frontend/tidecloak.json`. Override it with `TIDECLOAK_CONFIG` or `CLIENT_ADAPTER`. It verifies every request's Tide JWT against the embedded JWK. It stores only ciphertext.

## 4. Web app

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_BASE=http://localhost:3101" > .env.local
npm run dev                   # http://localhost:3000
```

Sign in, click **Load demo documents**, then try the two suggested questions. Run them once normally and once with **Simulate hijacked AI** turned on.

## 5. Production (single VPS)

```bash
docker build -t needtoknow-web:latest frontend
docker build -t needtoknow-api:latest backend
# copy images + infra/docker-compose.yml + frontend/tidecloak.json to the server, then:
docker compose up -d
```

nginx routes `/api/` to the API and everything else to the web app (`infra/nginx/needtoknow.conf`).
