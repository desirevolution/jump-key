#!/usr/bin/env bash

set -euo pipefail

VERSION="${1:?Usage: build-release.sh VERSION}"
OUTPUT_DIR="${2:-release}"

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Format:
# GOOS|GOARCH|GOARM|ARCHIVE_ARCH
targets=(
  "linux|amd64||x86_64"
  "linux|arm64||arm64"
  "linux|arm|6|armv6"
  "darwin|arm64||arm64"
  "windows|amd64||x86_64"
)

for target in "${targets[@]}"; do
  IFS="|" read -r goos goarch goarm archive_arch <<< "$target"

  release_name="jump-key_${VERSION}_${goos}_${archive_arch}"
  build_dir="$OUTPUT_DIR/$release_name"

  binary_name="jump-key"

  if [[ "$goos" == "windows" ]]; then
    binary_name="jump-key.exe"
  fi

  mkdir -p "$build_dir"

  echo "Building ${goos}/${goarch}${goarm:+ GOARM=${goarm}}"

  build_env=(
    "CGO_ENABLED=0"
    "GOOS=$goos"
    "GOARCH=$goarch"
  )

  if [[ -n "$goarm" ]]; then
    build_env+=("GOARM=$goarm")
  fi

  env "${build_env[@]}" \
    go build \
      -trimpath \
      -ldflags="-s -w -X main.version=${VERSION}" \
      -o "$build_dir/$binary_name" \
      .

  cp README.md "$build_dir/"

  if [[ -f LICENSE ]]; then
    cp LICENSE "$build_dir/"
  fi

  if [[ "$goos" == "windows" ]]; then
    (
      cd "$OUTPUT_DIR"
      zip -q -r "${release_name}.zip" "$release_name"
    )
  else
    tar \
      -C "$OUTPUT_DIR" \
      -czf "$OUTPUT_DIR/${release_name}.tar.gz" \
      "$release_name"
  fi

  rm -rf "$build_dir"
done

(
  cd "$OUTPUT_DIR"

  sha256sum \
    ./*.tar.gz \
    ./*.zip \
    > checksums.txt
)

echo
echo "Created release files:"

find "$OUTPUT_DIR" \
  -maxdepth 1 \
  -type f \
  -printf '%f\n' \
  | sort