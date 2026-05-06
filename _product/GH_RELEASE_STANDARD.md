# GitHub release standard

How Footnote gets updated on GitHub after each session of meaningful work.

---

## When to cut a release

- Any session that ships a user-visible change
- Bugfixes with user impact (data loss, crashes, broken flows)
- New features or significant UX improvements
- Do NOT release for: internal tooling, pipeline fixes, doc-only changes

---

## Version numbering

`MAJOR.MINOR.PATCH` — semver, public product edition:

| Version bump | When |
|---|---|
| `PATCH` (0.2.x) | Bug fixes, minor polish, single-feature additions |
| `MINOR` (0.x.0) | New capability, meaningful UX milestone, multiple features |
| `MAJOR` (x.0.0) | Architecture change, major product pivot |

Current: **0.x.0** (pre-1.0 — every minor feels significant)

---

## The update checklist (run after every meaningful session)

### 1. Issues — close shipped, open new

Close any GitHub issues that were resolved this session:
```bash
gh issue close <id> --comment "Shipped in v0.x.y"
```

Open new issues for anything discovered or queued:
```bash
gh issue create --title "..." --body "..." --label "bug|enhancement|idea"
```

Labels:
- `bug` — broken behavior
- `enhancement` — improvement to existing feature
- `idea` — speculative, not yet decided
- `data-loss` — severity: anything that risks walk content

### 2. Commit + push

One atomic commit per logical change. All pushed before the release.

### 3. Tag the release

```bash
cd /Users/lee/Sites/footnote
git tag -a v0.x.y -m "Short release title"
git push origin v0.x.y
```

### 4. Create the GitHub release

```bash
gh release create v0.x.y \
  --title "v0.x.y — [short title]" \
  --notes "$(cat <<'NOTES'
## What's new

### [Category]
- **Feature name** — one-line description of what changed for the user

## Bug fixes
- **Bug name** — what was happening, what's fixed

## Known open
- Item A (issue #N)
- Item B (issue #N)
NOTES
)"
```

### 5. Roadmap — GitHub Projects

Board: https://github.com/users/lee-fuhr/projects/4

After each release:
- Move shipped items → Done column
- Add new items from EVOLUTION.md QUEUED → Backlog column
- Items in IN_FLIGHT → In Progress column

Use `gh project item-list` and `gh project item-edit` to manage programmatically when there are many items.

### 6. Update package.json version

```bash
# In /Users/lee/Sites/footnote:
npm version patch  # or minor / major
git push && git push --tags
```

---

## Release notes format

```markdown
## What's new

### Reliability
- **Wake lock** — screen stays on during walks, no more Siri dropping mid-note

### UX
- **Settings** — gear icon in header; folder picker, feature toggles, version number

## Bug fixes
- **GPS display** — now shows longitude (E/W) alongside latitude

## Known open
- U4: keyboard auto-open on walk start (iOS limitation under investigation)
```

Rules:
- Lead with user impact, not implementation detail
- Bold the feature name, then a dash, then plain-English description
- "Known open" = honest transparency, not a weakness
- No version-internal codenames (use "Settings", not "SettingsSheet")

---

## GH issue labels to maintain

| Label | Color | Use |
|---|---|---|
| `bug` | red | Broken behavior |
| `enhancement` | blue | Improvement |
| `idea` | gray | Speculative |
| `data-loss` | dark red | Risk to walk content — highest priority |
| `ios` | orange | iOS/PWA-specific |
| `pipeline` | purple | Walk processing pipeline |
| `design` | pink | Visual/UX |
