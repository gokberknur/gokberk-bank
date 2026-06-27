#!/usr/bin/env bash
#
# PostToolUse reminder — pull in the right domain expert(s) when building a feature.
#
# Fires after an Edit/Write on an app source file. Skill invocation in Claude Code is
# description-driven only; this hook REINFORCES it: it maps the edited path to the banking
# domain it belongs to and reminds the model to consult that domain expert + the UX
# consultant (and the Chief Product Owner at scope / definition-of-done gates). See
# CLAUDE.md -> "The expert layer".
#
# It ONLY reminds — it never writes anything. Reads the hook payload (JSON) on stdin;
# surfaces the reminder via hookSpecificOutput.additionalContext (the model-visible
# channel). Silent for non-source files and non-matches.

payload="$(cat)"

# Pull tool_input.file_path specifically (NOT a whole-payload grep — a doc that merely
# mentions a domain word must not trigger a false positive). jq if present; sed fallback.
if command -v jq >/dev/null 2>&1; then
  file_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // .tool_response.filePath // empty' 2>/dev/null)"
else
  file_path="$(printf '%s' "$payload" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
fi

# Only nudge for app source files; everything else (config, docs, planning) stays silent.
case "$file_path" in
  */src/*) : ;;
  *) exit 0 ;;
esac

domain=""
expert=""

case "$file_path" in
  */payments/*)                                  domain="Payments & transfers";      expert="gok-bank-payments" ;;
  */cards/*)                                     domain="Cards";                     expert="gok-bank-cards" ;;
  */lending/*|*/loans/*|*/mortgages/*|*/credit*) domain="Lending & mortgages";       expert="gok-bank-lending" ;;
  */insurance/*)                                 domain="Insurance / protection";    expert="gok-bank-insurance" ;;
  */invest/*|*/crypto/*)                         domain="Investments & crypto";      expert="gok-bank-wealth" ;;
  */budgets/*|*/rewards/*)                       domain="Money management (PFM)";    expert="gok-bank-money" ;;
  */onboarding/*|*/security/*|*/login/*|*/register/*) domain="Identity, KYC & security"; expert="gok-bank-identity" ;;
  */documents/*|*/support/*|*/disputes/*)        domain="Servicing & disputes";      expert="gok-bank-servicing" ;;
  */accounts/*|*/wallets/*|*/pots/*|*/statements/*|*/transaction*) domain="Accounts & wallets"; expert="gok-bank-accounts" ;;
esac

if [ -n "$expert" ]; then
  ctx="Reminder: you're editing $domain code ($file_path). Before building, consult the domain expert skill \`$expert\` (what to deliver, the rails/regulatory framing, edge cases, what NOT to build) and \`gok-bank-ux\` (the customer journey & flow). At any scope decision or definition-of-done check, bring in \`gok-bank-product-owner\` (value + competitive gate, veto rights). The feature's spec under .planning/features/ is the source of truth."
else
  # An app source file with no single domain owner (foundations, platform, shared lib).
  ctx="Reminder: you're editing shared/cross-cutting app code ($file_path). Consult \`gok-bank-ux\` for the journey & flow and \`gok-bank-product-owner\` for value/scope, plus any domain expert this touches. The relevant spec under .planning/features/ is the source of truth."
fi

if command -v jq >/dev/null 2>&1; then
  jq -n --arg ctx "$ctx" '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$ctx}}'
else
  # No jq: collapse newlines and interpolate. Messages use no double quotes, so no escaping needed.
  ctx_oneline="$(printf '%s' "$ctx" | tr '\n' ' ')"
  printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"%s"}}\n' "$ctx_oneline"
fi

exit 0
