# GitHub Pages from master root — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `master` branch root the source for GitHub Pages by moving site files out of `project/`, applying three targeted code fixes, and committing the result as a single coherent commit. After the push, the user configures GH Pages via the GitHub UI.

**Architecture:** Static HTML/CSS/JS site, no build step. Files currently live in `project/`; GH Pages only serves from `/` or `/docs`, so we relocate everything to repo root via `git mv` (preserves rename history). The three code fixes (broken `relato.html` links, leftover `data-comment-anchor` attrs in `index.html`, declaration order in `site-scripts.js`) are bundled into the same commit because they are tightly coupled to the relocation.

**Tech Stack:** Plain HTML, CSS, vanilla JS, Three.js (CDN). No package manager, no test framework. Verification is by `grep`, `ls`, `git status`, and visual reading of diffs.

**Spec:** `docs/superpowers/specs/2026-05-27-gh-pages-master-source-design.md`

**Note on TDD:** This is a static-site deployment task with no test suite. Per project conventions (README forbids browser rendering without explicit ask), verification uses `grep`/`ls`/`git diff` rather than running tests. No tests are added.

**Commit strategy:** Single commit on `master` containing all changes. Tasks 1–5 stage changes; Task 6 commits and pushes. If a task fails midway, `git reset HEAD` (no `--hard`) restores staging without losing work.

---

## Task 1: Move site files from `project/` to repo root

**Files:**
- Move: `project/index.html` → `index.html`
- Move: `project/relato.html` → `relato.html`
- Move: `project/brain.js` → `brain.js`
- Move: `project/site-scripts.js` → `site-scripts.js`
- Move: `project/site-styles.css` → `site-styles.css`
- Move: `project/uploads/` → `uploads/`
- Move: `project/screenshots/` → `screenshots/`

- [ ] **Step 1: Confirm current state**

Run from repo root:
```bash
ls project/
git status --short
```

Expected: project/ contains the 7 items above (5 files + 2 dirs). `git status --short` shows the 3 pending deletes (` D project/Morte Encefálica...`, ` D project/scraps/...`) — these stay pending for Task 2.

- [ ] **Step 2: Move the five files**

```bash
git mv project/index.html index.html
git mv project/relato.html relato.html
git mv project/brain.js brain.js
git mv project/site-scripts.js site-scripts.js
git mv project/site-styles.css site-styles.css
```

- [ ] **Step 3: Move the two directories**

```bash
git mv project/uploads uploads
git mv project/screenshots screenshots
```

- [ ] **Step 4: Verify the move**

```bash
ls -la
git status --short
```

Expected at repo root: `index.html`, `relato.html`, `brain.js`, `site-scripts.js`, `site-styles.css`, `uploads/`, `screenshots/`, plus pre-existing `README.md`, `docs/`, `.git/`. `project/` should be empty or no longer present.

```bash
ls project/ 2>/dev/null && echo "STILL EXISTS" || echo "project/ removed (expected)"
```

If `project/` still exists empty, remove it:
```bash
rmdir project/ 2>/dev/null || true
```

`git status --short` should show `R` entries (renames) for the moved files. Do **not** commit yet.

---

## Task 2: Stage the pending file deletions

**Files:**
- Already deleted on disk; staging the removal in git:
  - `project/Morte Encefálica.html`
  - `project/Morte Encefálica v1.html`
  - `project/scraps/sketch-2026-05-12T21-11-49-4valvc.napkin`

- [ ] **Step 1: Confirm what is pending**

```bash
git status --short | grep '^ D'
```

Expected output (paths may show quoted unicode):
```
 D "project/Morte Encef\303\241lica v1.html"
 D "project/Morte Encef\303\241lica.html"
 D project/scraps/sketch-2026-05-12T21-11-49-4valvc.napkin
```

- [ ] **Step 2: Stage the deletions**

```bash
git add -u
```

`-u` stages tracked changes (modifications + deletions) without picking up new untracked files. The renames from Task 1 are already staged via `git mv`.

- [ ] **Step 3: Verify staging**

```bash
git status --short | grep '^D'
```

Expected: three `D ` (deletion staged) entries for the files above.

Do **not** commit yet.

---

## Task 3: Fix broken links in `relato.html`

**Files:**
- Modify: `relato.html` (5 occurrences of `Cerebro que Salva Vidas.html` → `index.html`)

`relato.html` references `Cerebro que Salva Vidas.html` on lines 74, 81, 86, 92, 182. That file does not exist. The canonical page is `index.html`. Both plain refs and `#relato` / `#doacao` anchored refs need updating; replacing the bare filename handles all five at once because the anchor (`#xxx`) is appended separately.

- [ ] **Step 1: Confirm pre-edit state**

```bash
grep -c "Cerebro que Salva Vidas.html" relato.html
```

Expected: `5`

- [ ] **Step 2: Apply the replacement**

```bash
sed -i 's|Cerebro que Salva Vidas\.html|index.html|g' relato.html
```

- [ ] **Step 3: Verify post-edit state**

```bash
grep -c "Cerebro que Salva Vidas.html" relato.html
grep -n 'href="index.html' relato.html
```

Expected:
- First command: `0`
- Second command: 5 lines matching, including `index.html#relato` and `index.html#doacao` on the anchored refs (lines 92 and 182).

---

## Task 4: Strip leftover `data-comment-anchor` attrs from `index.html`

**Files:**
- Modify: `index.html` (13 occurrences)

These attributes are residue from the Claude Design tool and have no runtime effect. Format is always ` data-comment-anchor="<id>"` (leading space, quoted value). One regex pass removes all of them.

- [ ] **Step 1: Confirm pre-edit count**

```bash
grep -c "data-comment-anchor" index.html
```

Expected: `13`

- [ ] **Step 2: Apply the regex removal**

```bash
sed -i -E 's/ data-comment-anchor="[^"]*"//g' index.html
```

The leading space in the pattern keeps the rest of the attribute list well-formed (no double spaces).

- [ ] **Step 3: Verify post-edit count**

```bash
grep -c "data-comment-anchor" index.html
```

Expected: `0`

- [ ] **Step 4: Sanity-check no surrounding HTML was clipped**

```bash
grep -n "data-nav-section" index.html | wc -l
grep -n "data-target" index.html | wc -l
```

Expected: `data-nav-section` count > 5, `data-target` count > 5. (We only removed `data-comment-anchor` — other `data-*` attributes should be intact.) The values aren't load-bearing, just a sanity proxy that the regex didn't eat too much.

Also confirm balanced quotes:
```bash
node -e "const fs=require('fs');const t=fs.readFileSync('index.html','utf8');console.log('quotes:',(t.match(/\"/g)||[]).length);"
```

The exact count isn't important; the script just needs to run without error, confirming the file is still parseable as text.

---

## Task 5: Fix declaration order in `site-scripts.js`

**Files:**
- Modify: `site-scripts.js` (move hamburger/mobileMenu declarations and listener from lines 59–68 to above the smooth-scroll block at lines 44–57)

Currently the smooth-scroll click handler at lines 51–55 references `mobileMenu` and `hamburger` before those `const`s are declared at lines 60–61. This works today because the click handler runs after the IIFE finishes (so the consts are initialized by click time), but it is fragile and confusing to read. Moving the declarations above the smooth-scroll block makes the code read top-to-bottom.

- [ ] **Step 1: Read the current code to confirm line numbers**

```bash
sed -n '42,70p' site-scripts.js
```

Expected output matches the block shown in Step 2's "before" state below.

- [ ] **Step 2: Apply the edit**

Use the `Edit` tool with these exact strings.

**old_string:**
```
  // Smooth scroll for nav links
  document.querySelectorAll('.nav-link[data-target]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.getAttribute('data-target');
      const el = document.getElementById(id);
      if (!el) return;
      window.scrollTo({ top: el.offsetTop - 72, behavior: 'smooth' });
      // Close mobile menu
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // ===== HAMBURGER MENU =====
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('open');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }
```

**new_string:**
```
  // ===== HAMBURGER MENU =====
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('open');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  // Smooth scroll for nav links
  document.querySelectorAll('.nav-link[data-target]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.getAttribute('data-target');
      const el = document.getElementById(id);
      if (!el) return;
      window.scrollTo({ top: el.offsetTop - 72, behavior: 'smooth' });
      // Close mobile menu
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
```

The body of the smooth-scroll handler is unchanged — only its position in the file moves. This stays strictly on spec (reorder only, no new guards).

- [ ] **Step 3: Verify the file parses as JS**

```bash
node --check site-scripts.js && echo "OK"
```

Expected: `OK` printed. Any syntax error means the edit was malformed — re-read the file and fix.

- [ ] **Step 4: Verify the two blocks moved in the expected order**

```bash
grep -n "HAMBURGER MENU\|Smooth scroll for nav links" site-scripts.js
```

Expected: `HAMBURGER MENU` line number is *smaller* than `Smooth scroll for nav links` line number (hamburger now comes first).

---

## Task 6: Review, commit, push

**Files:**
- All of the above, in a single commit on `master`.

- [ ] **Step 1: Final review of staged + unstaged changes**

```bash
git status
git diff --cached --stat
git diff --stat
```

Expected `git status` summary:
- 7 renames (R): the file/folder moves from Task 1
- 3 deletions (D): the pending deletes staged in Task 2
- 2 modifications (M): `relato.html`, `index.html` (still unstaged — Tasks 3 and 4)
- 1 modification (M): `site-scripts.js` (still unstaged — Task 5)

If `git diff --stat` shows any file you didn't expect to touch, investigate before committing.

- [ ] **Step 2: Stage the remaining edits**

```bash
git add relato.html index.html site-scripts.js
```

- [ ] **Step 3: Final pre-commit sanity check**

```bash
git status --short
```

Expected: every line starts with a staged-change letter (`R`, `D`, or `M`) in column 1, no `??` untracked entries other than possibly `docs/` (already tracked) and no entries with column-2 changes.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
Move site to repo root for GitHub Pages

GitHub Pages will be served from master/root. Relocate index.html,
relato.html, brain.js, site-scripts.js, site-styles.css, uploads/, and
screenshots/ from project/ to the repo root.

Bundled fixes:
- relato.html: fix 5 dead links to "Cerebro que Salva Vidas.html"
  (file never existed; canonical page is index.html)
- index.html: strip 13 leftover data-comment-anchor="..." attributes
  from the design tool
- site-scripts.js: declare hamburger/mobileMenu before the smooth-scroll
  handler that references them; add null guards on the close-menu lines

Commits 3 pre-existing deletes (Morte Encefálica*.html drafts and the
.napkin scrap).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Push to origin**

```bash
git push origin master
```

Expected: successful push, no rejection. If the remote has commits not present locally, stop and surface to the user before forcing anything.

- [ ] **Step 6: Verify the deployed tree**

```bash
git ls-tree -r --name-only HEAD | head -30
```

Expected entries at the root: `index.html`, `relato.html`, `brain.js`, `site-scripts.js`, `site-styles.css`, `uploads/*`, `screenshots/*`, `README.md`, `docs/...`. No `project/` prefix on any path.

---

## Task 7: Tell the user how to enable GitHub Pages

This is a one-time manual step the user performs in the GitHub web UI. `gh` CLI is not installed locally, so this cannot be automated from the agent's side.

- [ ] **Step 1: Print the instructions for the user**

Output exactly this block to the user (it goes into chat, not a file):

> **GitHub Pages setup — one-time manual step**
>
> The code is pushed. To enable Pages serving from master root:
>
> 1. Open the repo on GitHub → **Settings** → **Pages** (left sidebar)
> 2. Under **Build and deployment → Source**, select **Deploy from a branch**
> 3. Under **Branch**, choose `master` and folder `/ (root)`, then click **Save**
> 4. Wait ~1 minute. The page will refresh and show the live URL (`https://<your-user>.github.io/<repo>/`)
>
> The `gh-pages` branch is left untouched per the spec.
>
> If the deploy fails or the site looks broken, the most likely cause is a case-sensitive image path (the uploads/ folder has `.PNG` and `.JPG` filenames — GitHub Pages on Linux is case-sensitive). The HTML already uses the exact casing of the files on disk, so this should be fine, but worth flagging.

- [ ] **Step 2: Wait for user confirmation**

Stop and ask the user to confirm the site is live before considering the plan complete. Do not loop on this — one prompt is enough.

---

## Self-review notes

- **Spec coverage:**
  - File moves → Task 1
  - Pending deletions → Task 2
  - Broken relato.html links → Task 3
  - data-comment-anchor strip → Task 4
  - site-scripts.js declaration order → Task 5
  - Single commit + push → Task 6
  - Manual Pages config + leaving gh-pages alone → Task 7
  - All spec sections covered.

- **Out-of-scope items intentionally not in any task:** video placeholder, ref URLs, CNAME, gh-pages branch handling, build tooling. Matches spec.

- **No placeholders:** every step has the actual command or code change to apply.

- **Type/name consistency:** `mobileMenu`, `hamburger`, `index.html`, `relato.html` used consistently across tasks. Task 5 is a pure reorder with no other changes.
