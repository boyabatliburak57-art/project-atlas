# Project Atlas Backlog

## Label taxonomy

### Scope

- `scope:v1.0` — included in the frozen v1.0 product-completion scope
- `scope:v1.1+` — explicitly deferred beyond v1.0
- `scope:staging-gate` — requires real external staging evidence

### Classification

- `class:blocker`
- `class:critical`
- `class:major`
- `class:minor`

### Change control

- `change:proposed`
- `change:approved`
- `change:deferred`

### Evidence

- `evidence:local`
- `evidence:staging-required`
- `gate:deferred-external`

`evidence:local` must never satisfy `evidence:staging-required`.

## Frozen v1.0 backlog

| Item                                           | Labels                                                                                       | State    |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------- | -------- |
| TASK-081 staging gate deferral                 | `scope:v1.0`, `class:blocker`                                                                | Complete |
| TASK-082 scope freeze and triage               | `scope:v1.0`, `class:blocker`                                                                | Complete |
| TASK-083 onboarding/preferences                | `scope:v1.0`, `class:major`                                                                  | Complete |
| TASK-084 navigation/search/activity            | `scope:v1.0`, `class:major`                                                                  | Complete |
| TASK-085 unified report center                 | `scope:v1.0`, `class:major`                                                                  | Complete |
| TASK-086 accessibility/localization/responsive | `scope:v1.0`, `class:major`                                                                  | Complete |
| TASK-087 trust/methodology/disclosures         | `scope:v1.0`, `class:major`                                                                  | Complete |
| TASK-088 local performance/resilience          | `scope:v1.0`, `class:blocker`, `evidence:local`                                              | Complete |
| TASK-089 local pre-staging RC                  | `scope:v1.0`, `class:blocker`, `evidence:local`                                              | Planned  |
| TASK-090 pre-staging audit                     | `scope:v1.0`, `class:blocker`                                                                | Planned  |
| TASK-080S/TASK-080P staging evidence           | `scope:staging-gate`, `class:blocker`, `evidence:staging-required`, `gate:deferred-external` | Deferred |

## Deferred v1.1+ backlog

| Item                          | Labels                           | State    |
| ----------------------------- | -------------------------------- | -------- |
| Broker connection             | `scope:v1.1+`, `change:deferred` | Deferred |
| Live trading/order routing    | `scope:v1.1+`, `change:deferred` | Deferred |
| Native mobile application     | `scope:v1.1+`, `change:deferred` | Deferred |
| Social/community              | `scope:v1.1+`, `change:deferred` | Deferred |
| Public strategy marketplace   | `scope:v1.1+`, `change:deferred` | Deferred |
| AI investment recommendations | `scope:v1.1+`, `change:deferred` | Deferred |
| Tick-level/HFT simulation     | `scope:v1.1+`, `change:deferred` | Deferred |
| Unbounded optimizer           | `scope:v1.1+`, `change:deferred` | Deferred |
| Enterprise billing            | `scope:v1.1+`, `change:deferred` | Deferred |

New entries default to `change:proposed` and have no v1.0 commitment until the recorded change-control
review is complete.
