# Framefield → ParaCut v1: unsigned local WebM crossing

**Status: candidate until a real browser records and ParaCut imports the exact file.**

Framefield's existing **Record WebM** action now checks the recorded EBML magic,
hashes the exact recorded browser bytes with SHA-256 and downloads two local files:
`<project>.webm` and `<project>.webm.framefield-handoff.json`.
Browser settings may require allowing two downloads. Failed hash/signature checks
or recordings larger than 256 MiB refuse both downloads. No network, upload,
automatic editor launch or release occurs.

The JSON is schema `framefield.webm-handoff/v1`: exact media name,
byte count and SHA-256; source project name/FPS/duration; original imported GLB
SHA-256 identities (if present); and explicit **false** values for source
rights, origin authentication, signature and publication authorization.
A hash links bytes. It does *not* prove those bytes came from an actual UE/Fab
asset, preserve source license, validate codecs, or certify any real device.

## First real handoff acceptance

1. Record a 2–4-second, original rotating cube or rights-cleared small static
   GLB using **Record WebM** in Framefield. Stop and retain both downloads.
2. Independently check that the sidecar's `media.sha256` matches the
   actual downloaded WebM bytes (e.g. `Get-FileHash -Algorithm SHA256` in
   PowerShell). Ensure exact name and byte count. Never modify the sidecar to
   turn a mismatch green.
3. Open ParaCut **Project Media → Import media**, explicitly select the WebM,
   inspect the clip in Source Monitor, and append to **Video 1**.
4. Save the ParaCut draft, reopen, reselect the same bytes, then export a short
   real video and play it. The generic ParaCut import is not yet an automatic
   sidecar-verifying importer. Retain sidecar and ParaCut project together.
5. Repeat with a modified WebM; the independent hash check must fail.
6. Do not mark PixelForge/UE → Framefield, browser decoding, timeline
   import, GPU performance or a physical Quest/Windows test verified until
   actual operator receipts exist.

Tests: `npm test` for Framefield's local receipt helper, `npm run build`.
A future ParaCut guarded importer should validate the same schema on
its own side and reject modified media *before* committing the V1 clip.
