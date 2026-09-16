# Role and Approval Matrix — EOS-S06C

| Capability | Permission | EVENT_DIRECTOR | PLANNER | READ_ONLY_AUDITOR |
|------------|------------|----------------|---------|-------------------|
| Create/upload/map/review/submit/promote advance | `guest.intake.create` | Yes | Yes | No |
| Approve | `guest.intake.approve` | Yes | No | No |
| Cancel | `guest.intake.cancel` | Yes | No | No |
| Correction export | `guest.intake.export` | Yes | Yes | No |
| View job progress | `guest.directory.view` | Yes | Yes | Yes (read) |

Maker-checker: submitter personId ≠ approver personId (`assertMakerChecker`). Decision-relevant changes bump edition and clear approval.
