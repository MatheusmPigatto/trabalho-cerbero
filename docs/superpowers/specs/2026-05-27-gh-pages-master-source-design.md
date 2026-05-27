# GitHub Pages from master root — design

**Date:** 2026-05-27
**Project:** Cérebro que Salva Vidas (Trabalho Bárbara)
**Status:** Approved

## Goal

Transform the `master` branch into the source for GitHub Pages, with the site served directly from the repo root. Fix three latent issues found during exploration. Leave content (copy, video placeholder, reference URLs) untouched.

## File moves

Move from `project/` to repo root:

| From | To |
|------|-----|
| `project/index.html` | `index.html` |
| `project/relato.html` | `relato.html` |
| `project/brain.js` | `brain.js` |
| `project/site-scripts.js` | `site-scripts.js` |
| `project/site-styles.css` | `site-styles.css` |
| `project/uploads/` | `uploads/` |
| `project/screenshots/` | `screenshots/` |

Use `git mv` so history is preserved as renames. After the move the `project/` folder is empty and gets removed.

`README.md` stays at repo root unchanged.

## Code edits

### 1. `relato.html` — fix 5 broken links
The file references `Cerebro que Salva Vidas.html`, which never existed. The canonical page is `index.html`.

- 3 plain references → `index.html`
- 2 anchored references → `index.html#relato`, `index.html#doacao`

### 2. `index.html` — strip 13 `data-comment-anchor` attributes
Leftover from the Claude Design tool, no runtime effect. (`relato.html` has zero occurrences.)

### 3. `site-scripts.js` — fix latent declaration-order bug
The smooth-scroll handler (around line 51) references `mobileMenu` and `hamburger` before those `const`s are declared (around lines 59–60). Works today because of how the IIFE executes, but it's fragile. Move the `hamburger`/`mobileMenu` declarations and their click listener above the smooth-scroll block.

## Pending file deletions

Three files are already deleted on disk but the deletions aren't committed yet:
- `project/Morte Encefálica.html` (old design draft)
- `project/Morte Encefálica v1.html` (old design draft)
- `project/scraps/sketch-2026-05-12T21-11-49-4valvc.napkin`

These get included in the same commit.

## GitHub Pages configuration

`gh` CLI is not installed, so this is a manual step the user performs after the push:

1. Open the repo on GitHub: **Settings → Pages**
2. Under **Build and deployment → Source**, choose **Deploy from a branch**
3. Under **Branch**, select `master` and folder `/ (root)`
4. Click **Save**

The site will be live at `https://<user>.github.io/<repo>/` within a minute or two.

## Branch handling

- `gh-pages` branch: leave untouched (per user decision)
- No CNAME re-added (the previous CNAME was intentionally removed)

## Commit strategy

A single commit on `master` containing:
- The 7 file/folder renames (`git mv`)
- The 3 file deletions (already pending)
- The 3 code edits

Then `git push origin master`.

## Out of scope

- No content/copy edits
- Video placeholder stays (`VÍDEO PLACEHOLDER — URL EM BREVE`)
- Reference URLs (`#` anchors in the Refs section) stay
- gh-pages branch untouched
- No CNAME / custom domain
- No build tooling, no framework migration

## Risks

- All HTML asset paths are relative (`uploads/IMG_2476.PNG`, `brain.js`, `site-styles.css`) and resolve correctly when files sit alongside each other at the root.
- The three.js CDN script tag is unchanged.
- `screenshots/` will be publicly reachable by direct URL after deploy. Not linked from HTML, so unreachable by crawling. Acceptable for a student project; can be deleted later if needed.
