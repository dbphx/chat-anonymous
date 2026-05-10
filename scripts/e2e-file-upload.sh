#!/usr/bin/env bash
# E2E: tạo phòng → upload file (ASCII + tên tiếng Việt NFD) → GET /uploads/... phải 200.
# Cần: curl, python3; khuyến nghị: jq (nếu không có thì dùng python).
set -euo pipefail

BASE="${E2E_BASE_URL:-http://127.0.0.1:8081}"
BASE="${BASE%/}"
ROOM_NAME="e2e-file-$(date +%s)"
SECRET="${E2E_ROOM_SECRET:-e2e-secret-$$}"
USER="${E2E_USER:-e2e-user}"

die() { echo "e2e FAIL: $*" >&2; exit 1; }
ok() { echo "e2e OK: $*"; }

wait_ready() {
  local i=0
  while (( i < 60 )); do
    if curl -fsS "${BASE}/api/rooms?page=1&limit=1" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    (( i++ )) || true
  done
  die "backend không phản hồi tại ${BASE} sau 60s (đặt E2E_BASE_URL nếu cần)"
}

http_code() {
  curl -sS -o /dev/null -w '%{http_code}' "$@"
}

# jq path như .[-1].file.url — python fallback đơn giản: lấy message cuối có file
extract_last_file_url() {
  local json="$1"
  if command -v jq >/dev/null 2>&1; then
    echo "$json" | jq -r '[.[] | select(.file != null)] | last | .file.url // empty'
  else
    echo "$json" | python3 -c "
import json, sys
data = json.loads(sys.stdin.read())
for m in reversed(data):
    f = m.get('file') or {}
    u = f.get('url')
    if u:
        print(u)
        break
"
  fi
}

wait_ready

echo "→ Tạo phòng ${ROOM_NAME}"
CREATE_RESP="$(curl -fsS -X POST "${BASE}/api/rooms" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"${ROOM_NAME}\",\"password\":\"${SECRET}\"}")"

ROOM_ID="$(echo "$CREATE_RESP" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id') or '')")"
[[ -n "$ROOM_ID" ]] || die "không lấy được room id: $CREATE_RESP"

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

ASCII_FILE="${WORKDIR}/hello.txt"
echo 'e2e-payload' > "$ASCII_FILE"

echo "→ Upload file ASCII"
curl -fsS -X POST "${BASE}/api/rooms/${ROOM_ID}/messages" \
  -F "user=${USER}" \
  -F "secret=${SECRET}" \
  -F "content=e2e" \
  -F "file=@${ASCII_FILE};type=text/plain" >/dev/null

VI_PATH="$(python3 -c "
import tempfile, os, unicodedata
td = '''${WORKDIR}'''
# Tên file NFD (hay gây lệch với URL NFC trên macOS)
raw = 'Bùi Phụng-e2e.jpg'
name = unicodedata.normalize('NFD', raw)
path = os.path.join(td, name)
with open(path, 'wb') as f:
    f.write(b'fake-jpeg')
print(path)
")"

echo "→ Upload file Unicode (NFD trên đĩa): $(basename "$VI_PATH")"

curl -fsS -X POST "${BASE}/api/rooms/${ROOM_ID}/messages" \
  -F "user=${USER}" \
  -F "secret=${SECRET}" \
  -F "content=e2e-vi" \
  -F "file=@${VI_PATH};type=image/jpeg" >/dev/null

echo "→ Lấy danh sách tin (X-Room-Secret)"
MSG_JSON="$(curl -fsS "${BASE}/api/rooms/${ROOM_ID}/messages" \
  -H "X-Room-Secret: ${SECRET}")"

URL_PATH="$(extract_last_file_url "$MSG_JSON" | tr -d '\r')"
[[ -n "$URL_PATH" ]] || die "không có file.url trong messages"

case "$URL_PATH" in
  http://*|https://*) FILE_URL="$URL_PATH" ;;
  *) FILE_URL="${BASE}${URL_PATH}" ;;
esac

# curl yêu cầu URL được mã hóa (đặc biệt ký tự Unicode trong /uploads/...)
encode_url() {
  python3 -c "
from urllib.parse import urlparse, urlunparse, quote
import os
raw = os.environ['E2E_RAW_URL']
p = urlparse(raw)
enc = quote(p.path, safe='/')
print(urlunparse((p.scheme, p.netloc, enc, p.params, p.query, p.fragment)))
"
}

# MinIO/API đã trả URL tuyệt đối đúng encoding — chỉ encode khi URL tương đối (/uploads/...)
if [[ "$FILE_URL" != http://* && "$FILE_URL" != https://* ]]; then
  export E2E_RAW_URL="$FILE_URL"
  FILE_URL="$(encode_url)"
  unset E2E_RAW_URL
fi

code="$(http_code "$FILE_URL")"
[[ "$code" == "200" ]] || die "GET file (URL từ API) HTTP $code — $FILE_URL"

echo "→ GET HEAD cùng URL"
code_h="$(curl -sS -o /dev/null -w '%{http_code}' -I "$FILE_URL")"
[[ "$code_h" == "200" ]] || die "HEAD file HTTP $code_h"

echo "→ GET với path NFD (mô phỏng client gửi tên đã tách dấu — chỉ khi file qua API /uploads local)"
ALT_SKIP=0
if [[ "$FILE_URL" == *":9000"* ]] && [[ "$FILE_URL" == *"/chat-uploads/"* ]]; then
  ALT_SKIP=1
  ok "bỏ qua GET NFD alternate (MinIO object key là NFC; không có fallback NFD như đĩa local)"
fi

if [[ "$ALT_SKIP" -eq 0 ]]; then
  set +e
  ALT_URL="$(
    E2E_FILE_URL="$FILE_URL" python3 -c "
import os, sys, unicodedata
from urllib.parse import urlparse, urlunparse, quote, unquote

file_url = os.environ['E2E_FILE_URL']
u = urlparse(file_url)
path = unquote(u.path)
parent = os.path.dirname(path)
bn = os.path.basename(path)
bn_nfd = unicodedata.normalize('NFD', bn)
if bn_nfd == bn:
    sys.exit(2)
alt_path = parent.rstrip('/') + '/' + bn_nfd
qp = quote(alt_path, safe='/')
print(urlunparse((u.scheme, u.netloc, qp, '', '', '')))
")"
  ALT_PY_EXIT=$?
  set -e

  if [[ "$ALT_PY_EXIT" -eq 2 ]]; then
    ALT_SKIP=1
    ok "bỏ qua GET NFD (Unicode đã cùng dạng NFD trên đĩa)"
  elif [[ "$ALT_PY_EXIT" -ne 0 ]]; then
    die "tạo URL NFD alternate (exit ${ALT_PY_EXIT})"
  fi

  if [[ "$ALT_SKIP" -eq 0 ]]; then
    [[ -n "$ALT_URL" ]] || die "URL NFD alternate rỗng"
    code_alt="$(http_code "$ALT_URL")"
    [[ "$code_alt" == "200" ]] || die "GET file (NFD alternate) HTTP $code_alt — $ALT_URL"
  fi
fi

if [[ "$ALT_SKIP" -eq 0 ]]; then
  ok "upload + GET + HEAD + NFD alternate OK (${FILE_URL})"
else
  ok "upload + GET + HEAD OK (${FILE_URL})"
fi
