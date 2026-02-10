---
author: @bilbaeno
asked: 2025-02-01
decided: 2025-02-01
status: accepted
deciders: @antoaenono @TraeDWill
tags: [backend, database]
---

# ADR: Database for Song Metadata

## Scenario

Which database should we use to store and query song metadata?

## Pressures

### More

1. [M1] Ease of development
2. [M2] Queryable metadata
3. [M3] Scalability

### Less

1. [L1] Setup complexity
2. [L2] Maintenance

## Chosen Option

Flat file (JSON)

## Why

In the context of **storing a song library**,
facing **the need to persist and query song metadata**,
we decided **to use a JSON file**,
to achieve **human-readable data that lives in the repo**,
accepting **no querying, no concurrency, manual edits only**.

## Points

### For

- [M1] No schema design needed - just edit a JSON file
- [L1] Zero setup - JSON parsing is built into JS
- [L1] Human-readable and editable by hand


### Against

- [M2] No query language - must filter in JS
- [M3] Must load entire file into memory, no concurrency
- [M3] No concurrent writes - file overwrites risk corruption

## Consequences

- Add the JSON data file to .gitignore
- Not suitable for large or frequently-changing datasets

## How

```json
{
  "songs": [
    { "title": "Karma Police", "artist": "Radiohead", "filename": "karma-police.mp3" },
    { "title": "Airbag", "artist": "Radiohead", "filename": "airbag.mp3" }
  ]
}
```

```ts
const library = JSON.parse(await Bun.file('library.json').text())
```

## Reconsider

- observe: Need to query or filter songs dynamically.
  respond: Adopt SQLite for proper querying.
- observe: Library grows beyond tens of songs.
  respond: Flat file becomes unwieldy, adopt a database.

## More Info

- JSON: built into JS, no deps
