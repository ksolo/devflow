#!/usr/bin/env bash
# Validate every SKILL.md under skills/ against the Agent Skills specification
# (https://agentskills.io/specification) using the `skills-ref` npm package.
#
# Usage:
#   bash scripts/validate-skills.sh          # validate skills/*/
#   SKILLS_REF_VERSION=0.1.5 bash scripts/validate-skills.sh
#   bash scripts/validate-skills.sh skills/devflow   # single skill
#
# Exits non-zero if any skill fails validation.

set -euo pipefail

SKILLS_REF_VERSION="${SKILLS_REF_VERSION:-0.1.5}"

targets=()
if (( $# > 0 )); then
  targets=("$@")
else
  for dir in skills/*/; do
    [[ -f "${dir}SKILL.md" ]] && targets+=("${dir%/}")
  done
fi

if (( ${#targets[@]} == 0 )); then
  echo "No skills found under skills/." >&2
  exit 1
fi

fail=0
for skill in "${targets[@]}"; do
  echo ">> validating ${skill}"
  if ! npx --yes "skills-ref@${SKILLS_REF_VERSION}" validate "${skill}"; then
    echo "FAIL: ${skill} did not pass skills-ref validate" >&2
    fail=1
  fi
done

if (( fail != 0 )); then
  echo "One or more skills failed validation." >&2
  exit 1
fi

echo "All ${#targets[@]} skill(s) valid."
