# SeRadio

Software Engineering Radio (SeRadio) is a Bun + TypeScript web radio app that streams local mp3 content over HTTP Live Streaming (HLS).
It includes a live player, queue management UI, DJ schedule editor, and admin preferences.

## Installation

- HTTPS
  - You can clone the monorepo with `git clone https://github.com/antoaenono/seradio.git`

### Prerequisites

- Bun (recommended runtime/package manager)

### Install dependencies

```bash
# Install bun
curl -fsSL https://bun.sh/install | bash

# Use bun for everything
bun install              # install deps
bun run dev              # run development server
bun test                 # run tests
```

The repository includes a `postinstall` script that sets up git hooks when `.git` is present.

## Usage

### Start development server

```bash
bun run dev
```

Default URL: `http://localhost:3000`

### Run checks

```bash
# tests
bun test

# lint
bun run lint

# type-check
bun run typecheck

# full quality gate
bun run check
```

## Features

- Live audio stream served as HLS (`/api/audio/`)
- Queue management (add/remove tracks)
- On-deck and playback history views
- Track metadata endpoint for currently playing audio
- Browser-local DJ schedule editor and landing-page schedule display
- Admin preferences (dark mode, accent color, volume, etc.)

## Architecture

### Backend

- Express app setup and routing: `src/app.ts`
- API routers: `src/api/**`
- Queue domain logic: `src/queue/**`
- Playout engine (segmentation, sliding window, tick loop): `src/playout/**`
- Audio helpers and metadata: `src/audio.ts`

### Frontend assets

- Static JS/CSS/image assets: `public/**`
- Main page templates are server-rendered with Eta (see below)

### Media

- Source audio library: `media/*.mp3`
- Generated HLS segments/playlist: `media/segments/**`
- Session logs: `media/logs/**`

## Eta Templates and Shared Navbar

Top-level pages are rendered server-side with Eta templates:

- `src/views/pages/index.eta`
- `src/views/pages/player.eta`
- `src/views/pages/queue.eta`
- `src/views/pages/dj.eta`
- `src/views/pages/admin.eta`

The navbar is centralized in `src/app.ts`:

- `navItems` defines all links in one place
- `renderNavbar(activePage)` builds nav markup and applies the active link class
- route handlers pass `navbar` into each template via `res.render(...)`

This keeps navigation consistent across all pages and avoids duplicated HTML.

## API Snapshot

- `GET /api/health` → service health
- `GET /api/audio/` → live HLS playlist (`.m3u8`)
- `GET /api/audio/segments/:file` → segment files
- `GET /api/audio/metadata` → current track metadata
- `GET /api/queue/media` → available mp3 files
- `GET /api/queue/queue` → queued tracks
- `POST /api/queue/queue` → append track
- `DELETE /api/queue/queue/:index` → remove track
- `GET /api/queue/on-deck` → segmented upcoming tracks
- `GET /api/queue/history?n=100` → recent played tracks

## Repository Structure

```text
src/
  api/        # express API routers
  playout/    # HLS playout/segmentation logic
  queue/      # queue domain logic
  views/      # Eta page templates
public/       # static JS/CSS/images
media/        # mp3 input + generated segments/logs
tests/        # bun test suites
docs/         # product + scheduler docs
.dr/          # decision records
```

## Authors

Stephen Bangs (stbangs@pdx.edu)

Anton Bilbaeno (bilbaeno@pdx.edu)

Trae Williams (trae@pdx.edu)

## Version History

- v0.1 | Initial commit
  - Project Setup: Repo creation + README
- v0.1.1 | This is an absolutely appropriate amount of changes for a jump from 0.1 to 0.1.1
  - Multi-page UI (Home/Queue/Player/DJ/Admin)
  - Player with metadata + visualizer
  - Queue API + queue management UI
  - DJ schedule editor and shared schedule store
  - Shared Eta-rendered page templates and centralized navbar
