# RusOutput

RusOutput is a React app for practicing spoken Russian.

It includes:
- a phrase bank with categories and pronunciation notes
- spaced-repetition flashcards
- browser text-to-speech for Russian playback
- a presentation rehearsal mode that tracks difficult sentences

## Run Locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Notes

- The app works with either a host-provided `window.storage` API or regular browser `localStorage`.
- The main application component still lives in `RusOutput.jsx`.
