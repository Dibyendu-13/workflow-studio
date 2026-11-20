# Yap Auto-Editor

## What to ship first

Take one uploaded recording and produce ranked 30–90-second portrait rough cuts with captions and editable timelines. Start with one founder series and one editor workflow. Share a timestamped transcript with the Text Content Engine.

## Architecture

Folder upload → timestamped transcription → candidate selection → cut, crop, and caption
Rough cuts and timeline export → editor polish → founder approval → Publishing & Insights Hub

## Data model

Recording stores source file metadata and processing state. Transcript segments hold timecodes and speaker labels. Clip holds start/end, hook, rationale, score, cut list, and asset versions. Series Profile defines editable selection and caption rules. Run captures model and render cost plus review decisions.

## Buy, build, and recover

Buy timestamped transcription and managed job execution. Use standard media tooling to render previews and build an export for the editor’s chosen software. Verify each clip starts cleanly, respects duration bounds, and retains context. Retry at the failed stage without retranscribing. Send unusable footage or export errors to the shared Slack alerts channel.

## Monthly estimate and assumptions

Budget $40–$120 incremental for roughly 20 source hours and 120 clips per month, excluding editor seats and shared scheduling. Confirm storage, timeline format, source footage quality, and compute usage.

## Paid-trial check

One 60-minute recording yields at least six rough cuts without a human step before editor review.
