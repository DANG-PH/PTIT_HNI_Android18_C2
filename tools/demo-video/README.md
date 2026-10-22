# Demo video tooling

Rebuilds `demo.mp4` from real sessions on the live deployment, so the video can be regenerated whenever the UI changes.

1. `record-demo.cjs` drives two Chrome sessions with Playwright (a user and an operator), records them and writes scene marks to `marks.json`.
2. `record-console.cjs` records the Tide admin console showing a pending change request. Create the request first with `infra/tidecloak/try-escalate.sh <username>`, and deny it afterwards.
3. `edit_demo.py` cuts the scenes (and, given `g1.wav`…`g7.wav`, mixes in a narration track recorded with Gemini TTS) and speeds up the waits. It burns in captions that use the values actually shown on screen, adds an end card, and concatenates everything into an H.264 MP4.

```bash
npm i playwright-core@1.56.1                       # in a scratch folder
DEMO_USER=… DEMO_PASS=… ADMIN_USER=… ADMIN_PASS=… node record-demo.cjs ./rec
ADMIN_USER=… ADMIN_PASS=… node record-console.cjs ./rec
python3 edit_demo.py ./rec /path/to/ffmpeg ../../demo.mp4 [./narration]   # ffmpeg with libx264 + libass
```

Credentials come only from the environment. The user account needs an empty vault; the operator account needs the `ntk-operator` role. Playwright's recording drifts slightly against the wall clock, so `edit_demo.py` rescales the marks to each video's length.
