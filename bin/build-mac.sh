#!/bin/bash
set -e
npm ci
npm run build:ts
npx electron-builder --mac --dir
echo 'Build complete. Check dist/'
