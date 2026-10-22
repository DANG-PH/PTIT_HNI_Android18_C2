#!/usr/bin/env bash
# Demo: an attacker holding the server's ROOT credential (Keycloak master admin) tries to make a user
# an operator. With TideCloak IGA the call "succeeds" (2xx) but nothing changes: it only files a change
# request that needs Tide admins to sign in their own enclaves.
#
# Usage: bash infra/tidecloak/try-escalate.sh [username]   (default: admin)
set -euo pipefail
T="${TIDECLOAK_URL:-https://tide.dangpham.id.vn}"; R=needtoknow; TARGET="${1:-admin}"
VPS="${VPS:-root@103.116.52.198}"; SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519_vps}"
PW="${KC_PASSWORD:-$(ssh -i "$SSH_KEY" -o BatchMode=yes "$VPS" 'grep ^KC_BOOTSTRAP_ADMIN_PASSWORD= /root/needtoknow/.env | cut -d= -f2-')}"

tok() { curl -s -X POST "$T/realms/master/protocol/openid-connect/token" \
  -d "username=admin&password=$PW&grant_type=password&client_id=admin-cli" | jq -r .access_token; }
roles() { curl -s -H "Authorization: Bearer $(tok)" "$T/admin/realms/$R/users/$USER_ID/role-mappings/realm/composite" \
  | jq -r '[.[].name | select(startswith("default") | not)] | sort | join(", ")'; }

USER_ID=$(curl -s -H "Authorization: Bearer $(tok)" "$T/admin/realms/$R/users?username=$TARGET&exact=true" | jq -r '.[0].id')
ROLE=$(curl -s -H "Authorization: Bearer $(tok)" "$T/admin/realms/$R/roles/ntk-operator")

echo "▶ Attacker uses the server's master admin credential to grant 'ntk-operator' to '$TARGET'"
echo "  roles before: $(roles)"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $(tok)" -H 'Content-Type: application/json' \
  "$T/admin/realms/$R/users/$USER_ID/role-mappings/realm" -d "[$ROLE]")
echo "  server answered: HTTP $code"
echo "  roles after:  $(roles)"
echo "▶ What actually happened: a change request waiting for Tide admins' enclave signatures"
curl -s -H "Authorization: Bearer $(tok)" "$T/admin/realms/$R/iga/change-requests?status=PENDING" \
  | jq -r '.[] | select(.actionType=="GRANT_ROLES") | "  \(.actionType)  signatures \(.authorizationCount // 0)/\(.threshold)  status \(.status)"'
