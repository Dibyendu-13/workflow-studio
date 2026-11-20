# Ops Brain v1

## What I’d ship first and why

Turn meeting notes into reviewable proposals in Notion, then surface risk on approved dependencies in Slack. Start with one launch goal and one team. This tests whether the team trusts extracted tasks and whether earlier warnings change what people do.

## Architecture

```text
Notion Meetings → managed workflow → model adapter → validated proposals
                                       ↓                    ↓
                                    Run log        Notion human approval
                                                            ↓
                                            Notion Tasks ↔ Projects / goals
                                                            ↓
                               Scheduled risk check → Slack alerts + Notion risk
```

## Data model

Keep Meetings, Tasks, and Projects in Notion. A Meeting holds the source and extraction state. A Proposal holds title, proposed owner and due date, goal and prerequisite links, evidence, and review state. Approved proposals create or update Tasks. Each Project tracks its goal, weight, target date, and risk explanation. A Run records input and output references, model and prompt version, cost, and approve/edit/reject outcome.

## Approval and deadline risk

Reviewers resolve missing fields and confirm assignments or changes in Notion. Score approved tasks using goal weight, time remaining, and downstream impact. Use stable tie-breaking and show why a rank moved. On a slip, traverse downstream dependencies, mark affected goals at risk, and alert affected owners. Propose priority changes for approval. During the trial, test a four-task chain with a five-minute risk scan and verify delivery within 15 minutes.

## Buy versus build

Reuse Notion for records and approvals, Slack for alerts, and a managed workflow runner for triggers, retries, and scheduled checks. Use a hosted model behind a replaceable adapter. Keep extraction prompts and routing rules editable and versioned. Build the validator and dependency/risk logic because those encode the team's rules.

## Failure handling

Invalid dates, unknown references, or dependency cycles block writes. Unclear assignments go to review with source evidence. Retry transient errors with backoff. Deduplicate writes and alerts using stable proposal and risk-event IDs. On terminal failure, post the affected record and recovery steps to one Slack alerts channel. The runbook covers reconnecting integrations, retrying a run, and resolving invalid relationships.

## Monthly cost estimate

Budget **$27/month incremental** as a planning allowance. Assume existing Notion and Slack seats, $25 for workflow execution, and $2 for model usage at 100 meetings/month. The model allowance assumes 4,000 input and 1,000 output tokens per meeting at budget rates of $2/$8 per million tokens, plus retry headroom. Confirm vendor pricing and scheduler usage before choosing plans.

## Assumptions

Start with equal goal weights; founders can edit them. Send routine Slack alerts 09:00–18:00 IST Monday–Friday. Log risk immediately and queue off-hours alerts for the next working window. Run the 15-minute trial test during working hours.
