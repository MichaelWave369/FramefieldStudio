# Framefield browser artifact for PhiOS review

`phios.app.json` uses the existing PhiOS `phios.app_manifest.v0.1` contract.
It requests no platform permissions and leaves redistribution review unknown.
The source commit, artifact digests, runtime requirements, rollback and readiness
are in a separate preview receipt; no fields are added to the shared manifest.

From a clean, committed checkout:

```sh
npm install --no-audit --no-fund
npm test
npm run build
npm run audit:dist
npm run stage:phios -- /absolute/path/outside-checkout/framefield-preview
```

The command stages the already compiled browser files, license and manifest. It
refuses a dirty checkout, stale build commit, unsafe files and an existing output.
It does not run Trellis, write AppRegistry, launch a browser, grant authority or
publish anything. The default GitHub Pages build and asset base are preserved.
It does not prove the build was independently reproduced from clean source;
the receipt is unsigned local evidence and the source stamp is self-reported.

Open the staged `START_HERE.txt` and serve that directory with Python's static
HTTP server bound to `127.0.0.1`. Open `/FramefieldStudio/`. Use HTTP rather than
`file://`, because browser module loading and hashing require an appropriate
origin. `STAGED_UNQUALIFIED` describes creation of the artifact; a separate
acceptance report must record actual browser execution against its exact digest.

Review the manifest with PhiOS's existing `AppManifest.from_dict` before any
platform intake. Native installation, sandboxed execution, OS lifecycle receipts,
desktop launch grants, version replacement and public redistribution remain
separate gates. Browser portability does not qualify Windows/macOS companion
software, Linux image releases or Quest hardware.

Stop the preview server and delete the staging folder to remove the preview.
It writes no native installation state. Save project JSON before clearing any
browser-local drafts; rollback does not silently delete user work.
