# Framefield Studio: v1.0 Release Readiness Record

**State:** v1.0 candidate. **Not a release sign-off.**

A candidate can pass every CI test yet still have usability or browser issues.
This record intentionally distinguishes verified automated checks, live deployment
evidence, and human acceptance before a stable Git tag is permitted.

## Verified foundations (through merged PR #13)

- GitHub Pages deployment workflow completed successfully for main at
  `a5fb1db7c60d81b14ba49621fd9fbc7c40672405` before PR #14.
- PR #13 automated checks: **61 Node tests + 35 Chromium browser tests green**.
  These exercised the *built local preview*, not the actual hosted site.
- Current codebase has original MIT licensed source, Canvas2D software rendering,
  mesh editing, animations, materials, camera shot output, JSON backups, and
  browser-local recovery and Scene Vault.

This is evidence of automated verification, not a claim that a human has
completed the v1.0 acceptance checklist.

## Release gates (PR #14 landed; PR #15 adds post-deploy automation)

| Gate | How it is verified | Required to call v1.0 stable? |
| --- | --- | --- |
| Source build and unit tests | React app CI | Yes |
| GitHub Pages path and bundled assets | `npm run audit:dist` in CI and Pages | Yes |
| Local Chromium regression suite | `npx playwright test` in CI and Pages | Yes |
| Public deployment freshness | `release-info.json` exact commit SHA | Yes |
| Public Pages Chromium acceptance | Auto-trigger after successful Pages deployment (or manually dispatch on `main`) | Yes |
| Save/reopen and WebM playback on user machines | Manual checklist on at least one desktop browser | Yes |
| Secondary-browser/mobile usability | Manual compatibility review | Yes |
| Licensing, file formats, accessibility limitations | Human source and product review | Yes |

## Manual live audit instructions

1. Merge PR #14 only when its own PR checks are green.
2. Open **Actions → Deploy GitHub Pages** and verify successful completion
   for the PR #14 merge commit on `main`.
3. Visit `https://michaelwave369.github.io/FramefieldStudio/release-info.json`.
   Compare its **40-character commit SHA** with the merge commit.
4. Starting with PR #15, the successful Pages deployment triggers
   **Live v1 Release Acceptance** automatically for the same source SHA.
   It waits up to three minutes for CDN propagation, then tests the
   live site. You can also run **Actions → Live v1 Release Acceptance
   → Run workflow** manually from `main`, optionally specifying `expected_sha`.
5. Review the browser acceptance result and download the
   `framefield-live-acceptance` evidence artifact. Any stale or
   unreachable CDN that fails the bounded freshness gate is reported
   as a failure, not mistaken for an application regression.
6. Complete every applicable checkbox in `docs/V1_RELEASE_CHECKLIST.md` on
   actual user machines. In particular, manually verify WebM playback and
   browser-local recovery and save behavior across restarts.

## Recording actual sign-off

When the above work is performed, record it in a future PR, with:
- Git commit SHA and public Pages revision
- Date and browser/OS combinations actually tested
- CI link and live-acceptance run URL
- Manual tester and any unresolved issues or explicit risk acceptance
- Release version plan, license audit, and stable tag decision

**No stable tag or GitHub Release is created by the audit workflow.**
Only a separately reviewed, explicit release decision can do that.

## Product constraints users should know

Canvas2D rendering is not physically based; there is no advanced depth buffer,
rigging, UV unwrapping, MP4 output, general 3D format import/export, or
guaranteed offline app caching. Browser-local autosaves and Scene Vault can be
lost when site data is removed. Users should keep JSON downloads.
