#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/codex-threads" start
