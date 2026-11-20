# AI Carousels

## What to ship first

Turn a Notion topic or approved text post into a five-slide branded carousel using one designer-owned template. Validate actual text fit and let reviewers regenerate one changed slide. Start with one layout family to test brand consistency and revision speed.

## Architecture

Notion brief → slide outline and copy → template renderer → fit checks → Notion approval
Approved slide bundle → Publishing & Insights Hub → scheduled destination

## Data model

Carousel tracks source, format, template and version, revision, and review status. Slide holds order, role, copy, assets, render hash, and fit result. Approval binds the approved revision. Run records capture model, inputs, output, cost, and review outcome.

## Buy, build, and recover

Use the designer’s existing template tool if it has a reliable rendering API. Build layout constraints and partial regeneration. Use measured text bounds at final size and send overflow back for shortening or human review. Reuse renders by content hash. On renderer errors, preserve successful slides and alert Slack with the failing slide and a retry link.

## Monthly estimate and assumptions

Budget $30–$100 incremental for 40 five-slide carousels per month, excluding shared scheduling. Confirm the designer’s tool, template ownership, and weekly volume. Treat renderer subscriptions and per-render charges as assumptions until selected.

## Paid-trial check

A topic entered in Notion becomes a scheduled carousel on a test account, with approval as the only human step.
