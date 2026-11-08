# Character Acting Timeline — Phase 1F

## Mission
Extend the local-only, read-only GLB Character Lab so an artist can manually
time facial morph expressions and dialogue markers against a source animation.
This is an incremental foundation for Larrina's ChipToons workflows, **not**
an automatic lip-sync system or a separate animation editor.

## Implemented

- **Source morph expression keys**: scrub the preview, adjust an existing
  blendshape (for example a mouth-open shape), then store a key at the
  current time. Keys can interpolate linearly or hold their outgoing value.
  Stored times are integer milliseconds, independent of 24/30 FPS preview.
- **Playback and scrubbing**: source GLB animations evaluate first, then
  the keyed expression track is layered over them, then any manual slider
  override while editing. Capturing a key clears transient manual overrides,
  so playback follows the authored expression track.
- **Dialogue markers**: type a line of dialogue and attach it to the
  selected source clip at the current playhead time. Click a marker to jump
  to its approximate frame. A marker stores text/timing only.
- **Acting-sheet JSON**: explicit local download/import of source-locked
  expression keyframes and dialogue text. The sheet has its own version 1
  format and exact source GLB SHA-256, independent of the existing
  Framefield v1 project and Phase 1E named pose-pack JSON.
- Bounded input: 128 expression keys, 64 dialogue markers, max 64 morph
  values per key, 300-second maximum source clip, 96 KiB imported sheet.
  Invalid clips, unknown morph IDs, duplicate keys, outside-boundary
  cue times, unsupported versions and other character fingerprints reject
  the entire import without overwriting existing local cues.
- An original GLB fixture with one morph target tests the actual visual
  interpolation at frames 0, 6 and 12 at 24 FPS. Tests also confirm the
  expression/line sheet round-trips, rejects another source fingerprint,
  and does not change project JSON.

## What is NOT implemented

- No speech-to-text, generated voice, audio recording or playback,
  automatic phoneme/viseme extraction, speech recognition or remote LLM.
- No invented morph targets, rig creation, jaw IK, lip solver, eye tracking,
  body motion authoring or multi-character cast timeline.
- No editable saved character component in Framefield's main scene,
  full glTF export, ChipToons API, CineSwarm job, PhiOS XR bridge or deployment.
- There is no claim that one morph target can produce convincing talking.
  Artists need a model with suitable jaw/mouth/viseme targets for useful
  manual lip timing, and the dialogue timing is not synchronized to audio.

## Review gates

1. Run Node unit suite; build; release artifact audit; Chromium editor
   integration; Firefox and WebKit creator compatibility suites.
2. Chromium SwiftShader WebGL acceptance: add neutral and full-smile keys
   to the existing original GLB fixture, scrub to half-time and verify
   displayed weight 0.5 and a changed rendered image.
3. Download acting sheet; check source fingerprint, key and cue times;
   import again; reject changed source SHA without discarding saved keys.
4. Check retained PNG screenshots visually for correct morph movement.
5. Manually inspect a rights-cleared real character with multiple
   viseme/mouth blendshapes in a desktop browser, exercising
   multi-clip timing, switching, playback, and sheet reload.
6. Verify local-only behavior, frame-time rounding, repeat imports,
   WebGL loss, memory and performance before public production use.
7. Keep branch as draft; do not auto-merge or deploy.

## Future
A versioned dialogue+expression authoring contract could eventually connect
to an explicit ChipToons receiver. Audio waveform/timeline synchronization,
phoneme-label placement, multi-character blocking and verified downstream
round-trip should be separate gated PRs.
