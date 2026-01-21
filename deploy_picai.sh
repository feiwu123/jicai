#!/usr/bin/env bash
set -euo pipefail

# Resolve script directory (works from any CWD).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CONTAINER_NAME="picai"
IMAGE_REPO="picai"
IMAGE_TAG="1.0.0"
TAR_FILE="${SCRIPT_DIR}/picai_1.0.0.tar"

PORT_MAPPING="1512:8000"
ENV_PICAI_HOST="0.0.0.0"
ENV_PICAI_PORT="8000"
ENV_PICAI_BASE_PATH="/wholesales"
ENV_TOPM_BASE="https://topm.tech"

echo "==> Script dir: ${SCRIPT_DIR}"
echo "==> TAR file:   ${TAR_FILE}"

echo "==> 1) Stop container (if exists): ${CONTAINER_NAME}"
if docker ps -a --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  docker stop "${CONTAINER_NAME}" || true
else
  echo "    - Container not found, skip stop."
fi

echo "==> 2) Remove container (if exists): ${CONTAINER_NAME}"
if docker ps -a --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  docker rm "${CONTAINER_NAME}" || true
else
  echo "    - Container not found, skip rm."
fi

echo "==> 3) Find existing image IDs for: ${IMAGE_REPO}"
IMAGE_IDS=$(docker images --format '{{.Repository}} {{.ID}}' \
  | awk -v img="${IMAGE_REPO}" '$1==img {print $2}' \
  | sort -u)

if [[ -n "${IMAGE_IDS}" ]]; then
  echo "    - Found image IDs:"
  echo "${IMAGE_IDS}" | sed 's/^/      /'
  echo "==> 4) Remove loaded images"
  while read -r id; do
    [[ -n "${id}" ]] && docker rmi -f "${id}" || true
  done <<< "${IMAGE_IDS}"
else
  echo "    - No images found for ${IMAGE_REPO}, skip rmi."
fi

echo "==> 5) Load image tar: ${TAR_FILE}"
if [[ -f "${TAR_FILE}" ]]; then
  LOAD_OUT="$(docker load -i "${TAR_FILE}")"
  echo "${LOAD_OUT}"
else
  echo "ERROR: tar file not found: ${TAR_FILE}"
  exit 1
fi

# Parse image ref from docker load output.
LOADED_REF="$(echo "${LOAD_OUT}" | awk -F': ' '/Loaded image:/ {print $2; exit}')"
if [[ -z "${LOADED_REF}" ]]; then
  echo "WARN: Could not parse 'Loaded image:' from docker load output."
  LOADED_REF="${IMAGE_REPO}:${IMAGE_TAG}"
fi

echo "==> 6) Ensure tag is ${IMAGE_REPO}:${IMAGE_TAG}"
if [[ "${LOADED_REF}" != "${IMAGE_REPO}:${IMAGE_TAG}" ]]; then
  echo "    - Retag: ${LOADED_REF} -> ${IMAGE_REPO}:${IMAGE_TAG}"
  docker tag "${LOADED_REF}" "${IMAGE_REPO}:${IMAGE_TAG}" || true
fi

echo "==> 7) Run container: ${CONTAINER_NAME}"
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p "${PORT_MAPPING}" \
  -e "PICAI_HOST=${ENV_PICAI_HOST}" \
  -e "PICAI_PORT=${ENV_PICAI_PORT}" \
  -e "PICAI_BASE_PATH=${ENV_PICAI_BASE_PATH}" \
  -e "TOPM_BASE=${ENV_TOPM_BASE}" \
  --restart unless-stopped \
  "${IMAGE_REPO}:${IMAGE_TAG}"

echo "Done. Container is running:"
docker ps --filter "name=^/${CONTAINER_NAME}$"
