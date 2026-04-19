#!/bin/bash
set -e
npm ci
npm run build:ts
npx electron-builder --linux --dir
echo 'Build complete. Check dist/'
