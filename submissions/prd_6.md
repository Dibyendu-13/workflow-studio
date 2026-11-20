# AI Explainers & Motion Graphics

## What to ship first

Turn one approved script into a 30–60-second branded explainer using a reusable scene kit. Produce editable scene assets and caption tracks plus 9:16 and 16:9 renders. Start with one visual style to prove timing and editor handoff.

## Architecture

Approved script → structured storyboard → voiceover and captions → scene templates → renders
Editable project and previews → Notion approval → Publishing & Insights Hub

## Data model

Explainer stores script revision, style version, aspect ratios, and review state. Scene holds copy, timing, template, and editable asset references. Audio and caption tracks bind to timing; Render stores ratio, asset ID, status, and cost. Runs track model, evidence inputs, outputs, and human review.

## Buy, build, and recover

Use managed voice generation or approved human recordings and the designer’s tool for templates. Build scene timing, validation, and export glue. Reuse shared brand rules from Carousels. Check caption timing and safe areas for both ratios. Retry only failed scenes, preserve source assets, and raise clear Slack alerts when renderer dependencies fail.

## Monthly estimate and assumptions

Budget $50–$150 incremental for 12 explainers per month, excluding existing editing and scheduling seats. Confirm voice choice, designer tooling and the monthly tool budget. Track voice and render costs per video.

## Paid-trial check

An approved script becomes a branded 30–60-second explainer scheduled on a test account, with no manual editing required for the trial sample.
