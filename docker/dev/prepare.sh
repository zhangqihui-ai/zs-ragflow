#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

command -v uv >/dev/null || { echo 'Install uv before preparing dependencies.' >&2; exit 1; }
command -v git >/dev/null || { echo 'Install git before preparing dependencies.' >&2; exit 1; }

# Containers require Linux archives, including when the host runs macOS.
target_arch=${RAGFLOW_TARGET_ARCH:-$(uname -m)}
uv run tools/scripts/download_dev_deps.py --target-os linux --target-arch "$target_arch" "$@"
uv run deps/download_deps.py "$@"

# Same tokenizer dictionaries as the production Dockerfile; neither downloader fetches them.
if [[ ! -d deps/infinity-resource ]]; then
    git clone --depth 1 https://github.com/infiniflow/resource.git deps/infinity-resource
fi
for directory in rag opencc wordnet; do
    if [[ ! -d "deps/infinity-resource/$directory" ]]; then
        echo "Missing deps/infinity-resource/$directory; finish downloading the resource repository." >&2
        exit 1
    fi
done
echo 'Local dependencies ready. Run: docker compose -f docker-compose-dev.yml up --build'
