ARG RAGFLOW_BUILD_IMAGE=infiniflow/github_action_runner:latest

# Use the same native Go build toolchain as the production Dockerfile.
FROM ${RAGFLOW_BUILD_IMAGE}
USER root
WORKDIR /ragflow
SHELL ["/bin/bash", "-c"]
ENV GOMODCACHE=/root/.cache/gomod GOCACHE=/root/.cache/gobuild
ENV DEEPDOC_MODEL_DIR=/ragflow/internal/rag/res/deepdoc
# build.sh uses -fuse-ld=lld; LLD 18 can produce binaries that hang at startup.
RUN linker=$(command -v ld.lld-20 || command -v ld.lld) && \
    "$linker" --version && \
    "$linker" --version | grep -Eq 'LLD (2[0-9]|[3-9][0-9])\.' && \
    mkdir -p /opt/ragflow-toolchain && \
    ln -s "$linker" /opt/ragflow-toolchain/ld.lld
ENV PATH="/opt/ragflow-toolchain:${PATH}"
ENTRYPOINT ["bash", "docker/dev/backend.sh"]
