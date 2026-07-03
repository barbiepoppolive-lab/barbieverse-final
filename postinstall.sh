#!/bin/bash
set -e
echo "Building with npm install (not npm ci)..."
npm install
[ ! -f package.json ] && exit 0
echo "Building completed..."
npm run build
