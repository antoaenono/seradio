# Feature Brainstorm

## Backend

### Library

- [x] Accept a path to a single file
- [ ] Accept a list of directories and/or files of which metadata are indexed into a SQLite db
  - [ ] Alternatively, a single directory which is recursively indexed
    - [ ] Output results to flat file
- [ ] Detect when the above list has changed and re-index
- [ ] Detect when files or files in directories have changed and re-index
- [x] Proof file types to match accepted files for player backend upon consumption of new files
- [ ] Prepare tables with columns that would match user interest for later search/find features
- [ ] Enable features for separate table creation in line with having user made playlists

### Live Recording

- [ ] Ability to record an audio stream at X amount of time in advance to be broadcast during a scheduled "live segment"

### Scheduling

- [ ] Automatically maintain a schedule of a continuous audio stream by ensuring at least one file scheduled after current file
  - [x] Alternatively, a single song on repeat
- [ ] Automatically schedule ads via a ruleset
- [ ] Schedule live audio segments

### Streaming

- [x] Stream to more than 1 player simultaneously (implies picking the right library from the start or writing some vanilla implementation which informs a later decision)

### Listener Input

- [ ] Receiving request from listener, translating into a search and enqueuing it
- [ ] Call in and play feature for those calling in
- [ ] Feedback ratings for songs by users. Thumbs up or down for +1 and -1

## Frontend

### Player Page

- [x] See current playing track's metadata
- [x] One button to: Stop streaming / resume to live
- [x] Light mode
- [ ] Dark mode
- [ ] Previous song history within show (server side)
- [ ] Future songs (within show)
- [ ] Local Sound Bar
- [ ] Listing of current and next radio show
- [ ] Rating (Thumbs up or down)
- [ ] More info button for total metadata
- [ ] Scrolling banner for metadata
- [ ] Menu with:
  - [ ] About Station
  - [ ] Feedback Form
  - [ ] Request Form
  - [ ] Additional Menu functionality
- [ ] Live reacts. Using an emoji, flashes it on screen globally. One use per 3 minutes.
- [ ] Audio visualizer
- [ ] EQ (requires [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API))

### Admin Page

- [ ] Browse library rows with columns for each metadata
- [ ] Sort by column
- [ ] Text search across specific columns
- [ ] Review Feedback
- [ ] Review Requests, and send to queue if valid
- [ ] Schedule DJ's

## Deployment

- [x] Local
