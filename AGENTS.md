<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Exercise tracking
- Store complete and skip as mutually exclusive statuses on the existing daily completion record; only complete records count toward XP and completion history.
- Keep schedule validation and weekly eligibility in shared pure helpers so today's list and prescribed checklist enforce the same mode, quota, and spacing.
- Keep calendar history in its own component, using authenticated account creation time for pre-account empty states and calendar weeks covering the full month.

## Profile photos
- Mount one account-profile provider in the signed-in root shell and reuse its identity in AppNav; owner-scoped reads and save/focus refresh keep every page consistent without revealing account details to others.
- Keep profile photos in private Cloud Storage under the owner's UUID folder and save only their path on network_profiles; signed URLs and authorized photo-only RPCs preserve existing network visibility and blocking rules.
- Stage photo edits until Save profile, clean replaced uploads after saving, and keep optional photo failures from preventing profile edits.

## Inbox
- Reuse encouragements and send_encouragement for human conversations so historical messages, connection authorization, limits and cheer XP stay consistent; never invent contacts or history.
- Mount Inbox once around signed-in routes in the root layout, preserving a directly accessible page, Realtime plus periodic refresh, recipient-only read markers and paginated bidirectional history; one shared instance avoids duplicate subscriptions and keeps conversations open during navigation.
- Group support lists with a pure presentation helper keyed by account UUID, preserving original records and actions; this avoids duplicate accounts without changing relationship permissions.
- Give each Realtime effect subscription a fresh channel topic and remove its own channel on cleanup; asynchronous teardown must not let remounts attach callbacks to an already-subscribed channel.
- Keep Inbox typing in a separate expiring, recipient-readable table updated only through an authenticated, connection/block-aware RPC; never transmit draft text, store typing as messages, or award XP for presence.

## Background
- Render the shared decorative landscape in the root shell behind all content with pointer events disabled; this keeps the appearance consistent without interfering with controls.

## Buddy statistics
- Read relationship metrics and opt-in aggregate completions through a connected-only, block-aware database RPC; private completion rows remain owner-only.
- Attribute relationship XP only to the first five messages per sender per local day across all recipients; this avoids inventing additional rewards beyond existing cheer XP.
- Rotate only the buddy bubble's decorative shell, keeping its contents stationary and honoring reduced motion so names and controls stay readable.

## Sessions together
 - Mount Sessions as a sibling after the Inbox wrapper and use body panel classes to hide both floating triggers while either panel is open; mobile content hiding must not hide the panel itself.
- Keep session splitting, join windows and time formatting in the pure src/lib/sessions.ts helpers, and change rehab_sessions only through its SECURITY DEFINER RPCs; Home and the tests then share one set of rules, and clients can only read rows.
- Finish sessions through participant-only complete_rehab_session and refresh on return; external tabs cannot report hangups reliably.

## AI summaries
- Use shared pure period helpers for monthly and Monday–Sunday weekly ranges; persist period metadata in the existing private summary stats JSON to preserve old monthly history without duplicating reports.
- Import prescriptions via authenticated official Gemini with sharing consent and validated output; review before owner-scoped exercise inserts and never guess schedules.

## Interaction audio
- Use sounds.ts for a gesture-gated shared Web Audio context, quiet master gain and anti-spam guard; one delegated root listener chooses tap/pop/success through a pure tested selector, with persistent mute and explicit action overrides so audio never blocks controls.

## Preview recovery
- Detect mixed Vite React/renderer optimization versions in development and use the shared guarded reload; a stale renderer cannot safely execute hooks from a newer React module.

## Mentor mode
- network_profiles.finished_therapy drives mentor mode; shared pure helpers in src/lib/mentor-mode.ts exclude these people from both the cron job and simulate_missed_sessions so alerts stay consistent.
- Invite codes are permanent and reusable, one per user per relationship: create_invite_code returns the existing code and redemption never consumes it, so users share a single stable code.
- Mentor mode adapts Home, Progress (finished_at trigger, maintenance-only days after it) and Support (mentoring card, mentee finder, alert controls hidden) from one profile flag.
