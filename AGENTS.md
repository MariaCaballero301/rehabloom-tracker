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
