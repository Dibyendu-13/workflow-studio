# Publishing & Insights Hub

## What to ship first

Schedule approved Notion content to two sandbox accounts and reconcile actual publishing status. Start with two social accounts supported by the same managed scheduler so the trial proves the shared handoff and status loop. Add channel-specific adapters for Instagram, X, LinkedIn, Substack, the newsletter, and YouTube as account coverage is verified.

## Architecture

Notion approved revision → publication queue → scheduler adapter → platform
Platform status and metrics → reconciliation → Notion status and weekly report
Exceptions → Slack alerts

## Data model

Content holds source, assets, voice, and revision. Approval binds reviewer and approved revision. Publication stores destination, account, time zone, scheduled time, external ID, and state. Metric snapshots store platform-native measures and capture time. Run records capture inputs, output, model and cost if used, and review outcome.

## Buy, build, and recover

Buy scheduling and analytics coverage wherever supported. Build a provider-neutral handoff and reconciliation. Route founder-voice approvals to the founder. Editing approved copy or assets invalidates approval. Use one idempotency key per revision and destination. After a timeout, reconcile before retrying. Keep unsupported destinations in an explicit manual queue. Alert on terminal errors and show replay steps in the runbook.

## Monthly estimate and assumptions

Budget $60–$150 incremental for scheduling and workflow execution at roughly 200 content pieces a month. This is a planning allowance, subject to profile counts, scheduled destinations, and usage. Confirm newsletter tooling and scheduler coverage before committing.

## Paid-trial check

Approve one item in Notion. It schedules to two test accounts and writes the correct live status back automatically.
