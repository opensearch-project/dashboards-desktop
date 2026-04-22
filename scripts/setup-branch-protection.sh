#!/bin/bash
# Configure branch protection rules for main branch.
# Requires: gh CLI authenticated with admin access.
# Usage: ./scripts/setup-branch-protection.sh

set -euo pipefail

REPO="opensearch-project/dashboards-desktop"
BRANCH="main"

echo "🔒 Setting branch protection for ${REPO}:${BRANCH}..."

gh api -X PUT "repos/${REPO}/branches/${BRANCH}/protection" \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["lint", "typecheck", "test-unit", "native-module-smoke", "build"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

echo "✅ Branch protection configured:"
echo "   - Required CI: lint, typecheck, test-unit, native-module-smoke, build"
echo "   - Required reviews: 1"
echo "   - Dismiss stale reviews: yes"
echo "   - Force push: blocked"
