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
- Keep profile photos in private Cloud Storage under the owner's UUID folder and save only their path on network_profiles; signed URLs and authorized photo-only RPCs preserve existing network visibility and blocking rules.
- Stage photo edits until Save profile, clean replaced uploads after saving, and keep optional photo failures from preventing profile edits.

## Inbox
- Reuse encouragements and send_encouragement for human conversations so historical messages, connection authorization, limits and cheer XP stay consistent; never invent contacts or history.
- Mount Inbox once around signed-in routes in the root layout, preserving a directly accessible page, Realtime plus periodic refresh, recipient-only read markers and paginated bidirectional history; one shared instance avoids duplicate subscriptions and keeps conversations open during navigation.
- Group support lists with a pure presentation helper keyed by account UUID, preserving original records and actions; this avoids duplicate accounts without changing relationship permissions.

## Background
- Render the shared decorative landscape in the root shell behind all content with pointer events disabled; this keeps the appearance consistent without interfering with controls.
