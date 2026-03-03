#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
INSTALL_HOME="${BB_INSTALL_HOME:-$HOME}"
BB_HOME="${INSTALL_HOME}/.beadboard"
TARGET_DIR="${BB_HOME}/bin"
RUNTIME_DIR="${BB_HOME}/runtime"
CURRENT_JSON="${RUNTIME_DIR}/current.json"
VERSION="${BB_RUNTIME_VERSION:-0.1.0}"

write_file_atomic() {
  local target="$1"
  local tmp="${target}.tmp.$$"
  cat > "${tmp}"
  mv "${tmp}" "${target}"
}

mkdir -p "${TARGET_DIR}" "${RUNTIME_DIR}"

write_file_atomic "${CURRENT_JSON}" <<EOF
{
  "version": "${VERSION}",
  "runtimeRoot": "${REPO_ROOT}",
  "installMode": "repo-shim-fallback",
  "shimTarget": "${REPO_ROOT}/install/beadboard.mjs"
}
EOF

write_file_atomic "${TARGET_DIR}/beadboard" <<EOF
#!/usr/bin/env bash
set -euo pipefail
BB_HOME="\${BB_INSTALL_HOME:-\$HOME}/.beadboard"
CURRENT_JSON="\${BB_HOME}/runtime/current.json"
resolve_runtime_root() {
  if [ -f "\${CURRENT_JSON}" ]; then
    local root
    root="\$(node -e "const fs=require('fs');try{const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));if(j&&typeof j.runtimeRoot==='string')process.stdout.write(j.runtimeRoot)}catch{}" "\${CURRENT_JSON}")"
    if [ -n "\${root}" ]; then
      printf '%s' "\${root}"
      return 0
    fi
  fi
  printf '%s' "${REPO_ROOT}"
}
RUNTIME_ROOT="\$(resolve_runtime_root)"
exec node "\${RUNTIME_ROOT}/install/beadboard.mjs" "\$@"
EOF

write_file_atomic "${TARGET_DIR}/bb" <<EOF
#!/usr/bin/env bash
set -euo pipefail
BB_HOME="\${BB_INSTALL_HOME:-\$HOME}/.beadboard"
CURRENT_JSON="\${BB_HOME}/runtime/current.json"
resolve_runtime_root() {
  if [ -f "\${CURRENT_JSON}" ]; then
    local root
    root="\$(node -e "const fs=require('fs');try{const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));if(j&&typeof j.runtimeRoot==='string')process.stdout.write(j.runtimeRoot)}catch{}" "\${CURRENT_JSON}")"
    if [ -n "\${root}" ]; then
      printf '%s' "\${root}"
      return 0
    fi
  fi
  printf '%s' "${REPO_ROOT}"
}
RUNTIME_ROOT="\$(resolve_runtime_root)"
exec npx --yes tsx "\${RUNTIME_ROOT}/tools/bb.ts" "\$@"
EOF

chmod +x "${TARGET_DIR}/beadboard" "${TARGET_DIR}/bb"

cat <<MSG
Installed BeadBoard shims:
- ${TARGET_DIR}/beadboard
- ${TARGET_DIR}/bb
- ${CURRENT_JSON}

Add to PATH if needed:
  export PATH="${TARGET_DIR}:\$PATH"
MSG
