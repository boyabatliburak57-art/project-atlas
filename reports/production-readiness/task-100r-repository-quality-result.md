# TASK-100R Repository Quality Result

| Gate | Current result |
| --- | --- |
| Format | PASS |
| ADR validation | PASS; 26 ADR files |
| Lint | PASS; 14/14 workspaces |
| Typecheck | PASS; 14/14 workspaces |
| `git diff --check` | PASS |
| Duplicate task/ADR IDs | 0 |
| Merge markers | 0 |
| Secret scan | PASS; confirmed leakage 0 |
| Skip/focus scan | 0 |
| Config drift | PASS; schema 1, 23 keys |
| Deploy artifact validator | PASS |
| Worktree cleanliness | FAIL; dirty candidate |
| Dependency gate | FAIL; seven high findings |
| License gate | FAIL; eight unreviewed expressions |

Overall repository quality for a final-staging candidate: **FAIL**. The local shell default Node
version drifted from the exact `22.14.0` contract; audited gate runs used the contract toolchain, but
the PATH drift must not be reproduced in CI/release execution.
