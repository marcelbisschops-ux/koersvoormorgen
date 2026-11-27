#!/bin/bash
# Borging N-213 (27-11-2026): een ingetrokken of ongeldige Cloudflare-token uit een oude omgeving mag nooit meer
# gebruikt worden. Is CLOUDFLARE_API_TOKEN gezet, dan vraagt dit Cloudflare zelf of hij geldig is (de waarde gaat via
# stdin naar curl, niet via de opdrachtregel, en wordt nooit getoond). Ongeldig → variabele weg, wrangler gebruikt dan
# de OAuth-login. Geldig (bijv. in CI) of geen netwerk → ongewijzigd. Gebruik: source scripts/cf-auth.sh; cf_auth_opschonen
cf_auth_opschonen() {
  [ -n "${CLOUDFLARE_API_TOKEN:-}" ] || return 0
  local antw
  antw=$(printf 'Authorization: Bearer %s\n' "$CLOUDFLARE_API_TOKEN" | curl -s -m 10 -H @- https://api.cloudflare.com/client/v4/user/tokens/verify 2>/dev/null) || return 0
  if printf '%s' "$antw" | grep -q '"code":1000\|"code": 1000\|Invalid API Token'; then
    unset CLOUDFLARE_API_TOKEN
    echo "⚠ Ongeldige/ingetrokken CLOUDFLARE_API_TOKEN in de omgeving genegeerd; wrangler gebruikt de OAuth-login." >&2
  fi
  return 0
}
