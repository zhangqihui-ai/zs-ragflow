#!/usr/bin/env bash
set -euo pipefail
cd /ragflow

# Reject incomplete local preparation before compiling or starting any server.
required=(
    /opt/ragflow-native-libs/office_oxide/lib/liboffice_oxide.a
    /opt/ragflow-native-libs/pdfium-static/lib/libpdfium.a
    "/opt/ragflow-native-libs/pdf_oxide/lib/linux_$(go env GOARCH)/libpdf_oxide.a"
    deps/cl100k_base.tiktoken
    deps/NotoSansCJKsc-VF.ttf
    deps/huggingface.co/BAAI/bge-m3/sentencepiece.bpe.model
    deps/huggingface.co/BAAI/bge-large-en-v1.5/vocab.txt
    deps/huggingface.co/Qwen/Qwen3-Embedding-0.6B/tokenizer.json
    deps/huggingface.co/intfloat/e5-mistral-7b-instruct/tokenizer.json
)
for model in det.ort layout.ort tsr.ort rec.ort ocr.res; do
    required+=("$DEEPDOC_MODEL_DIR/$model")
done
missing=0
for path in "${required[@]}"; do
    if [[ ! -s "$path" ]]; then
        echo "Missing dependency: $path" >&2
        missing=1
    fi
done
if ! find /opt/ragflow-native-libs/onnxruntime -name libonnxruntime.a -size +0c -print -quit 2>/dev/null | grep -q .; then
    echo 'Missing ONNX Runtime static archive.' >&2
    missing=1
fi
for directory in rag opencc wordnet; do
    if [[ ! -d "/usr/share/infinity/resource/$directory" ]]; then
        echo "Missing tokenizer dictionary directory: $directory" >&2
        missing=1
    fi
done
if ((missing)); then
    echo 'Run bash docker/dev/prepare.sh on the host before starting development containers.' >&2
    exit 1
fi
# Refresh the build cache from the host on every start. build.sh writes versioned
# linker symlinks here, so the mounted host libraries remain read-only.
cp -a /opt/ragflow-native-libs/. /root/ragflow-native-libs/
# The production NATS image has no shell or HTTP client for a container healthcheck.
curl --fail --silent --show-error --retry 60 --retry-delay 2 \
    --retry-all-errors --connect-timeout 2 --max-time 5 \
    'http://nats:8222/healthz?js-enabled-only=true'
config=docker/dev/service_conf.yaml
pids=()
stop_servers() {
    if ((${#pids[@]})); then
        kill "${pids[@]}" 2>/dev/null || true
        for pid in "${pids[@]}"; do
            wait "$pid" 2>/dev/null || true
        done
        pids=()
    fi
}
trap 'stop_servers; exit 0' INT TERM
trap stop_servers EXIT

fingerprint() {
    find cmd internal conf docker/dev tools/scripts -type f \
        ! -path '*/cmake-build-*/*' ! -path '*/res/deepdoc/*' \
        ! -name '*.log' ! -name '*.a' ! -name '*.o' \
        -printf '%p %T@ %s\n'
    stat -c '%n %Y %s' go.mod go.sum build.sh Dockerfile
}

rebuild() {
    # CMake incrementally rebuilds the tokenizer when its C++ source changes.
    bash build.sh --cpp && bash build.sh --go || return 1
    for mode in api admin ingestor syncer; do
        # The server prints help and exits 1. Check both output and status so a
        # native startup crash or timeout still stops the restart.
        local help_output help_status=0
        help_output=$(timeout 30 bin/ragflow_server "--$mode" --help 2>&1) || help_status=$?
        if ((help_status > 1)) || [[ "$help_output" != *"Usage: bin/ragflow_server --$mode [OPTIONS]"* ]]; then
            printf '%s\n' "$help_output" >&2
            echo "Startup check failed for $mode (exit $help_status)." >&2
            return 1
        fi
    done
    stop_servers
    bin/ragflow_server --config "$config" --migrate || return 1
    for mode in api admin ingestor syncer; do
        args=("--$mode" --config "$config")
        [[ "$mode" == admin ]] && args+=(--init-superuser)
        bin/ragflow_server "${args[@]}" &
        pids+=("$!")
    done
    echo 'Go services restarted. Open http://localhost:9222 after Vite is ready.'
}

previous=''
while true; do
    current=$(fingerprint | LC_ALL=C sort | sha256sum)
    if [[ "$current" != "$previous" ]]; then
        previous=$current
        if ! rebuild; then
            echo 'Build/start failed; fix the source and save to retry.' >&2
        fi
    fi
    for pid in "${pids[@]}"; do
        if ! kill -0 "$pid" 2>/dev/null; then
            echo 'A Go service exited; restarting the service group.' >&2
            stop_servers
            previous=''
            break
        fi
    done
    sleep 2 &
    wait $! || true
done
