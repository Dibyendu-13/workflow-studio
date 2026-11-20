# AI Character Content

## What to ship first

Create a 30–60-second episode for one fictional recurring character in a stylised format. Establish an approved visual reference pack and voice before scaling. Check identity across two scenes and allow a single shot to be regenerated.

## Architecture

Script → shot list → reference-guided visuals and voice → edit, music, and captions
Shot and budget checks → Notion approval → Publishing & Insights Hub

## Data model

Character Profile stores approved references, voice settings, style rules, and versions. Episode holds script, character versions, and budget. Shot holds prompt version, references, asset, attempts, cost, and review status. Approval binds reviewer to the episode revision. Log model, outputs, per-attempt costs, and review decisions.

## Buy, build, and recover

Buy reference-guided image or video generation and licensed voice and music. Build the shot orchestration, identity review checklist, and spend controls. Save successful shots, cap attempts, and regenerate only failed shots. Warn before the monthly budget limit and pause generation when the remaining allowance cannot cover the next attempt. Alert failures in Slack.

## Monthly estimate and assumptions

Budget $100–$300 incremental for four short episodes per month, assuming eight shots per episode and a capped number of attempts. This is a planning range. Confirm initial concept, style, publication cadence, commercial terms, and actual provider rates.

## Paid-trial check

A script becomes a scheduled episode with a consistent character and measured cost per episode within the agreed budget.
