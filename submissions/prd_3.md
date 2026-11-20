# Text Content Engine

## What to ship first

Turn a reel into an X and LinkedIn draft in either brand or founder voice. Put the drafts in Notion for voice-specific approval, then send approved revisions to the Publishing & Insights Hub. Two contrasting channels test whether the same source produces genuinely different formats.

## Architecture

Reel or transcript → transcription if needed → grounded source notes → voice and platform generation
Drafts → checks and duplicate search → Notion review → Publishing & Insights Hub

## Data model

Source stores media reference, transcript and excerpts. Voice Profile and Platform Rules have editable versions. Draft links the source, target, voice, evidence, rule versions, and revision. Approval records reviewer and revision. Run logs model, cost, inputs, output, and human decisions.

## Buy, build, and recover

Use hosted transcription and text generation. Build the format checks, grounding, and duplicate guard. Compare new drafts with past content, while allowing deliberate cross-platform repurposing. Route founder copy to founder approval. If transcription, formatting, or grounding fails, keep the draft in review and post a clear Slack alert. Save successful stages so retries can resume.

## Monthly estimate and assumptions

Budget $25–$75 incremental for 40 source items a month, excluding the shared scheduler. Assume mostly short recordings and four drafts per source. Confirm newsletter software and the founder’s target posting cadence before expanding.

## Paid-trial check

A reel link produces X and LinkedIn posts in both voices, with approval as the only human step before scheduling to test accounts.
