#!/usr/bin/env bash
# Builds the web + API images locally and ships them to the VPS (the VPS is too tight on RAM to build).
# Requires frontend/tidecloak.json from the realm init, and GEMINI_API_KEY in backend/.env.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
VPS="${VPS:-root@103.116.52.198}"
SSH=(ssh -i "${SSH_KEY:-$HOME/.ssh/id_ed25519_vps}" -o BatchMode=yes "$VPS")
SCP=(scp -i "${SSH_KEY:-$HOME/.ssh/id_ed25519_vps}" -q)

jq -e '.jwk.keys | length > 0' "$ROOT/frontend/tidecloak.json" >/dev/null \
  || { echo "frontend/tidecloak.json has no jwk: run infra/tidecloak/init-realm.sh first" >&2; exit 1; }
GEMINI_API_KEY="$(grep ^GEMINI_API_KEY= "$ROOT/backend/.env" | cut -d= -f2-)"
[[ -n "$GEMINI_API_KEY" ]] || { echo "GEMINI_API_KEY missing in backend/.env" >&2; exit 1; }

SERVICES="${SERVICES:-web api}"   # e.g. SERVICES=api bash infra/deploy.sh
images=()
for svc in $SERVICES; do
  dir=$([[ $svc == web ]] && echo frontend || echo backend)
  docker build -t "needtoknow-$svc:latest" "$ROOT/$dir"
  images+=("needtoknow-$svc:latest")
done
docker save "${images[@]}" | gzip -1 | "${SSH[@]}" 'gunzip | docker load'

"${SCP[@]}" "$ROOT/infra/docker-compose.yml" "$ROOT/frontend/tidecloak.json" "$VPS:/root/needtoknow/"
"${SSH[@]}" "cd /root/needtoknow && mkdir -p api-data \
  && (grep -q ^GEMINI_API_KEY= .env || echo 'GEMINI_API_KEY=$GEMINI_API_KEY' >> .env) \
  && docker compose up -d --force-recreate $SERVICES && docker image prune -f >/dev/null && docker compose ps"
