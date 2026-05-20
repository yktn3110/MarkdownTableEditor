#!/usr/bin/env bash
set -e

OUT_DIR="release"

echo "=== 1. Vite build ==="
npm run build

echo "=== 2. Bundle server (ESM -> CJS) ==="
node_modules/.bin/esbuild server.js \
  --bundle \
  --platform=node \
  --format=cjs \
  --define:process.env.TABLEDRAFT_PACKAGED='"1"' \
  --outfile=server.bundle.cjs

echo "=== 3. Generate SEA blob ==="
node --experimental-sea-config sea-config.json

echo "=== 4. Copy node binary ==="
mkdir -p "$OUT_DIR"
NODE_EXE="$(node -e 'process.stdout.write(process.execPath)')"
cp "$NODE_EXE" "$OUT_DIR/tabledraft.exe"

echo "=== 5. Inject SEA blob ==="
npx --yes postject "$OUT_DIR/tabledraft.exe" NODE_SEA_BLOB sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
  --overwrite

echo "=== 6. Copy dist ==="
cp -r dist "$OUT_DIR/dist"

echo "=== 7. Generate LICENSES ==="
node_modules/.bin/license-checker --production --excludePrivatePackages --out "$OUT_DIR/LICENSES.txt"

# Node.js 本体のライセンスを追加（SEA に埋め込まれるため）
NODE_LICENSE="$(dirname "$(node -e 'process.stdout.write(process.execPath)')")/LICENSE"
if [ -f "$NODE_LICENSE" ]; then
  printf '\n\n========== Node.js ==========\n' >> "$OUT_DIR/LICENSES.txt"
  cat "$NODE_LICENSE" >> "$OUT_DIR/LICENSES.txt"
fi

echo "=== 8. Cleanup temp files ==="
rm -f server.bundle.cjs sea-prep.blob

echo ""
echo "Done! release/ フォルダを配布してください:"
echo "  release/tabledraft.exe"
echo "  release/dist/"
echo "  release/LICENSES.txt"
