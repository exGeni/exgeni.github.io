#!/usr/bin/env bash
# deploy.sh [TARGET] — publish the photo booth's server part to the old hosting (MochaHost,
# exgenius.pro) over the cPanel UAPI. GitHub Pages serves the booth page but runs no PHP, so
# targi-pracy/orlen/api.php (and the styles.json it reads) stay on the hosting, at
# public_html/TARGET (default: targi-pracy/orlen). With them goes hosting/orlen.htaccess, which
# sends every other address in that directory to the page on GitHub Pages, and
# hosting/cv.htaccess goes to public_html/$CV_TARGET (default: cv), which sends the old CV
# address there too. Nothing else in public_html is touched.
#
# api.php is uploaded last, then the script waits until $SITE_URL/TARGET/api.php reports the
# new file's revision (the host's OPcache serves the old file for a while): status for id
# 0000000000000000 answers {"state":"gone","rev":<first 12 hex of its md5>}.
#
#   with-envars.sh MOCHAHOST_CPANEL_URL MOCHAHOST_CPANEL_USER MOCHAHOST_CPANEL_API_TOKEN -- \
#     hosting/deploy.sh
set -euo pipefail
target=${1:-targi-pracy/orlen}
cv_target=${CV_TARGET:-cv}
root=$(cd "$(dirname "$0")/.." && pwd)
booth="$root/targi-pracy/orlen"

hdr="Authorization: cpanel ${MOCHAHOST_CPANEL_USER:?}:${MOCHAHOST_CPANEL_API_TOKEN:?}"
base="${MOCHAHOST_CPANEL_URL:?}"; base="${base%/}"
site="${SITE_URL:-https://exgenius.pro}"
ok() { python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if $1 else 1)"; }

# Create public_html/<dir> one level at a time (API2 Fileman::mkdir; an existing dir is fine).
mkdirs() {
  local path=public_html p
  IFS=/ read -ra parts <<<"$1"
  for p in "${parts[@]}"; do
    curl -sS -m 60 -G -H @<(echo "$hdr") "$base/json-api/cpanel" \
      --data-urlencode cpanel_jsonapi_user="$MOCHAHOST_CPANEL_USER" --data-urlencode cpanel_jsonapi_apiversion=2 \
      --data-urlencode cpanel_jsonapi_module=Fileman --data-urlencode cpanel_jsonapi_func=mkdir \
      --data-urlencode path="$path" --data-urlencode name="$p" >/dev/null
    path="$path/$p"
  done
  # mkdir answers the same for "created" and "exists"; listing the directory is the real check.
  curl -sS -m 60 -G -H @<(echo "$hdr") "$base/execute/Fileman/list_files" --data-urlencode dir="$path" \
    | ok 'd.get("status")' || { echo "deploy: cannot create $path" >&2; exit 1; }
}

# upload DIR LOCAL_FILE [NAME]: one file into public_html/DIR, under NAME if given.
upload() {
  local name=${3:-$(basename "$2")} resp
  resp=$(curl -sS -m 120 -H @<(echo "$hdr") -F dir="public_html/$1" -F overwrite=1 \
    -F "file-1=@$2;filename=$name" "$base/execute/Fileman/upload_files")
  echo "$resp" | ok 'd.get("status") and d["data"]["succeeded"]==1' \
    || { echo "deploy: upload failed: $name" >&2; exit 1; }
  echo "deploy: public_html/$1/$name"
}

mkdirs "$cv_target"
upload "$cv_target" "$root/hosting/cv.htaccess" .htaccess
mkdirs "$target"
# api.php goes last, so the styles that match it are already in place when it switches.
upload "$target" "$booth/styles.json"
upload "$target" "$root/hosting/orlen.htaccess" .htaccess
upload "$target" "$booth/api.php"

rev=$(md5sum "$booth/api.php" | cut -c1-12)
for _ in $(seq 1 "${SMOKE_TRIES:-30}"); do
  curl -sS -m 20 "$site/$target/api.php?a=status&id=0000000000000000" 2>/dev/null | ok "d.get('rev')=='$rev'" \
    && { echo "deploy: $site/$target/api.php serves revision $rev"; exit 0; }
  sleep 2
done
echo "deploy: $site/$target/api.php does not serve revision $rev" >&2
exit 1
