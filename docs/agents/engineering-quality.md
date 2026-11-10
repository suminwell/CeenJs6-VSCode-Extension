# Engineering quality

The maintainer owns code organization and architecture as well as functional correctness. Apply this review to the affected module and its immediate callers; expand when a dependency or shared contract requires it. A small fix can have a short review. A repository-wide redesign is not the default.

## Before implementation or a design verdict

1. Read the actual package tree, entry points, callers, build configuration, and relevant tests. Trace the path from the entry through policy/state to SDK, filesystem, network, or process operations. Check existing Issues/PRs for overlapping work.
2. Use `codebase-design` to identify each module's responsibility, interface, dependency direction, and state/resource owner. Establish repeated-call, failure, cancellation, and shutdown behavior where applicable. Keep unproven external behavior explicit.
3. Choose the smallest structure that makes those responsibilities and owners clear. Group cohesive functionality; use narrow module interfaces and internal helper visibility. Preserve verified SDK entry names, reflection/serialization contracts, package filters, and binary compatibility. Check test access and build packaging when moving classes.
4. For a substantial refactor, state the intended dependency flow and which existing behaviors remain contractual before editing. Keep this proportional: a brief working note or Issue update is sufficient unless a lasting architecture decision warrants an ADR through the existing domain-doc workflow.

## Review every applicable dimension

| Dimension | Evidence required for acceptance |
| --- | --- |
| Organization | Package/file placement follows cohesive responsibilities; names reveal purpose; public visibility is justified. File moves improve ownership or navigation rather than merely adding layers. Small cohesive packages may remain flat. |
| Architecture | Entry points adapt and compose; module implementations own their policies and state. Dependency direction is explicit, SDK/platform details stay localized, and repeated business rules have one owner. Abstractions pay for an actual caller, alternative, or test seam. |
| Lifecycle | Threads, tasks, locks, streams, and mutable state have explicit owners. Relevant repeated/concurrent calls, partial failure, retirement, cleanup, and stale callbacks have defined outcomes. A dispatch acknowledgement is distinguished from asynchronous completion. |
| Behavior | The change meets the Issue and preserves required compatibility. Failures and UNKNOWN results retain their meaning. Shared-file and cross-process protocols are checked across their callers, not inferred from one helper. |
| Verification | Tests exercise the changed interface and meaningful failure/interleaving paths. Pure host tests use substitutes for Android/SDK/native/network/process effects. Host/CI success and device acceptance are reported separately. |

A claim that the structure is sound must account for these dimensions with concrete source observations. Passing tests, short files, or an existing helper class alone do not establish architectural quality. Separate confirmed defects, design improvements, and unresolved external contracts in the findings.

## Complete the authorized work

- When asked to assess, give specific findings and a prioritized, bounded proposal. When fixing/refactoring is already authorized, carry supported changes through implementation and applicable verification; registering an Issue or drawing a directory tree is only a checkpoint.
- Resolve routine class placement, naming, visibility, and internal seams from the contracts and repository conventions. Bring material business tradeoffs, incompatible external contracts, or irreversible choices to the user with concrete evidence and options. This document adds no approval gate.
- Before delivering code changes, use `code-review` for the implementation diff, including this document among its standards sources. Resolve findings in the authorized scope and preserve negative evidence; document any remaining acceptance boundary accurately.
- Commit and push validated changes on the appropriate branch, verify the remote SHA, and update the relevant Issue/PR and QA handoff. Merge, release, and device work follow their existing authorization. Documentation-only changes need appropriate static review rather than an Android build.
- Report what changed in organization, ownership, or behavior and how it was verified. Keep work that is genuinely unfinished visible without treating unrelated backlog items as reasons to stop authorized progress.
