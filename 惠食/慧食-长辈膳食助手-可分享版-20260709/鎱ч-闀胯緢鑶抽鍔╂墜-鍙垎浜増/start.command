#!/bin/zsh
cd "$(dirname "$0")"
export PORT="${PORT:-8787}"
node server.js
