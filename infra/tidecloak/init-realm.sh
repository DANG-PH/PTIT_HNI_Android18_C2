#!/usr/bin/env bash
# Provisions the NeedToKnow realm on the VPS TideCloak using Tide's own template script (tcinit.sh):
# realm + Tide licence (VRK) + IGA in Tide mode + first admin (human enrollment gate) + adapter export.
#
# Usage: TIDE_LICENSE_EMAIL=<you@domain> TIDE_TERMS_ACCEPTED=yes bash infra/tidecloak/init-realm.sh
#   KC_PASSWORD is read from the VPS (/root/needtoknow/.env) unless already set.
set -euo pipefail
HERE="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
ROOT="$(cd "$HERE/../.." && pwd -P)"

# Licensing a realm needs the user's own email and their agreement to https://tide.org/legal (AP-90).
[[ -n "${TIDE_LICENSE_EMAIL:-}" ]] || { echo "Set TIDE_LICENSE_EMAIL (the user's licence email)" >&2; exit 2; }
[[ "${TIDE_TERMS_ACCEPTED:-}" == "yes" ]] || { echo "The user must agree to https://tide.org/legal (TIDE_TERMS_ACCEPTED=yes)" >&2; exit 2; }

VPS="${VPS:-root@103.116.52.198}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519_vps}"
if [[ -z "${KC_PASSWORD:-}" ]]; then
  KC_PASSWORD="$(ssh -i "$SSH_KEY" -o BatchMode=yes "$VPS" 'grep ^KC_BOOTSTRAP_ADMIN_PASSWORD= /root/needtoknow/.env | cut -d= -f2-')"
fi
[[ -n "$KC_PASSWORD" ]] || { echo "Could not read the TideCloak bootstrap password" >&2; exit 1; }

export KC_USER=admin KC_PASSWORD
export TIDECLOAK_LOCAL_URL="${TIDECLOAK_URL:-https://tide.dangpham.id.vn}"
export NEW_REALM_NAME=needtoknow
export CLIENT_NAME=needtoknow-web
export CLIENT_APP_URL=http://localhost:3000          # realm.json also lists https://ntk.dangpham.id.vn
export REALM_JSON_PATH="$HERE/realm.json"
export SUBSCRIPTION_EMAIL="$TIDE_LICENSE_EMAIL"
export ADAPTER_OUTPUT_PATH="$ROOT/frontend/tidecloak.json"

exec bash "$HERE/tcinit.sh"
