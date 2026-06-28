# Contributing

Thanks for helping improve Whisper Studio.

## Local Workflow

```bash
npm install
npm run dev
```

Before opening a pull request, run:

```bash
npm run typecheck
npm run lint
npm run build
```

## Code Organization

- Put native desktop behavior in `src/main`.
- Put renderer-facing bridge methods in `src/preload`.
- Put shared IPC contracts in `src/shared`.
- Put React features in `src/renderer/src/features`.
- Keep reusable renderer UI in `src/renderer/src/components`.

### Feature Folder Structure

Each feature is self-contained and follows this layout:

```
features/<name>/
├── index.tsx          ← feature root component (default export)
├── components/        ← components used only by this feature
└── hooks/             ← custom hooks used only by this feature
```

Do not import from one feature into another. Shared UI goes in `src/renderer/src/components/`. Shared logic goes in `src/renderer/src/lib/`.

## Naming Conventions

| Thing                              | Convention                      | Example                        |
| ---------------------------------- | ------------------------------- | ------------------------------ |
| React components                   | PascalCase                      | `TranscriptSegment`            |
| Custom hooks                       | `use` prefix, camelCase         | `useSegmentSearch`             |
| IPC handler registration functions | `register` prefix + domain      | `registerWhisperHandlers`      |
| Desktop API sub-interfaces         | `*Api` suffix                   | `TranscriptionApi`, `ModelApi` |
| IPC result types                   | `*Result` suffix                | `WhisperTranscriptionResult`   |
| IPC request types                  | `*Request` suffix               | `WhisperTranscriptionRequest`  |
| IPC event/progress types           | `*Update` or `*Progress` suffix | `WhisperModelDownloadProgress` |
| Feature root files                 | `index.tsx`                     |                                |
| Feature component files            | kebab-case                      | `audio-player.tsx`             |

## SOLID Guidelines

### Single Responsibility

Each file should do one thing. IPC handler files register handlers for one domain only (e.g. `whisper/file-handlers.ts` handles file selection; it does not also manage transcription). React components render UI; custom hooks own state and side-effects.

### Open/Closed

Extend behavior by adding new entries to a registry or map — not by modifying existing function bodies. For example, adding a new export format means adding one entry to the format registry, not adding a new `case` to a switch.

### Interface Segregation

The `DesktopApi` interface in `src/shared/ipc.ts` is composed of smaller sub-interfaces (`TranscriptionApi`, `ModelApi`, `FileSystemApi`, `WindowControlsApi`). Feature components should type their `desktop` prop against the smallest interface that covers their needs, not the full `DesktopApi`.

### Dependency Inversion

Components receive their dependencies (e.g. `desktop: TranscriptionApi`) as props rather than importing singletons directly. This makes components independently testable.

## IPC Channel Conventions

Channel names are declared as constants in `src/shared/ipc.ts`. All channels follow `namespace:action` format. Never use raw string literals for channel names in handler or preload code — always reference `IPC_CHANNELS.*`.

## Pull Requests

Good pull requests are focused, include a short description of the user-visible change, and call out platform-specific behavior when it matters.
