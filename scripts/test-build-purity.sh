#!/bin/bash
set -e

echo "Building..."
pnpm build > /dev/null

echo "Checking build output for leaked devtools..."
if grep -r "DebugBus" dist/assets/ > /dev/null; then
  echo "FAIL: DebugBus found in production build"
  exit 1
fi

if grep -r "CommandRegistry" dist/assets/ > /dev/null; then
  echo "FAIL: CommandRegistry found in production build"
  exit 1
fi

echo "PASS: Devtools tree-shaken correctly"
