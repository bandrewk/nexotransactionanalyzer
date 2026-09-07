#!/usr/bin/env bash
#
# Fail if a tracked file contains an absolute path from somebody's machine.
#
# generate_demo.py used to write to a hardcoded "C:/Users/<name>/..." path.
# Two problems with that: the script could only run on one machine, and it put
# a local username into a public repository. Neither is obvious in review --
# it is one line in a file nobody reads twice -- so it is checked mechanically.
#
# Run directly, or via `npm run lint:paths`.
set -euo pipefail

# Windows "C:\Users\x" / "C:/Users/x", plus unix "/home/x/" and "/Users/x/".
PATTERN='C:[\\/]Users[\\/]|(^|[^A-Za-z0-9_.-])/(home|Users)/[A-Za-z0-9._-]+/'

# This script necessarily contains the patterns it looks for; the lockfile is
# machine-generated and not a place a human path can be introduced by hand.
if matches=$(git grep -nIE "$PATTERN" -- \
      ':!scripts/check-no-local-paths.sh' \
      ':!package-lock.json'); then
  echo "Absolute local paths found in tracked files:" >&2
  echo "$matches" >&2
  echo >&2
  echo "Derive the path instead (e.g. from __file__ or import.meta.url)." >&2
  exit 1
fi

echo "No local absolute paths in tracked files."
