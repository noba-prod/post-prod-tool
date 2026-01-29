# Safe commit and merge with dev

Your situation:
- **Branch:** `dev`
- **Your work:** Many modified files + untracked files (auth, entities, team, supabase, etc.)
- **Risk:** Front-end engineer may have pushed to `origin/dev` → possible conflicts

Follow these steps **in order** so you don’t lose your work and don’t overwrite your colleague’s.

---

## Step 1: Save your work (stash)

Stash **including** untracked files so nothing is lost:

```bash
cd post-prod-tool
git stash push -u -m "WIP: my changes before merging dev"
```

- `-u` = include untracked files  
- `-m "..."` = label so you can find it later (`git stash list`)

Your working tree will be clean and match your last commit.

---

## Step 2: Get the latest dev

```bash
git fetch origin dev
git log HEAD..origin/dev --oneline
```

- If you see commits: your colleague pushed; you’ll integrate them next.
- If you see nothing: you’re already up to date with `origin/dev`.

Then update your local `dev`:

```bash
git pull origin dev
```

If there are conflicts **during pull**, git will stop and tell you. In that case:
- Fix the conflicted files (search for `<<<<<<<`, `=======`, `>>>>>>>`).
- `git add <fixed-files>`
- `git commit` (no message needed if you’re finishing the merge)

---

## Step 3: Bring your work back

```bash
git stash pop
```

- **No conflicts:** Your changes reapply on top of the updated `dev`. You can continue to Step 4.
- **Conflicts:** Some of your stashed changes conflict with the new `dev`. Git will mark conflicts in the working copy. Fix them, then:
  - `git add <resolved-files>`
  - `git stash drop`   # only after you’re happy; this removes the stash

---

## Step 4: Review and commit

- Review: `git status` and `git diff`
- Stage what you want in the commit:
  - `git add <files>`   or   `git add -p`   for partial staging
- Commit:
  - `git commit -m "feat: your descriptive message"`

---

## Step 5: Push (when ready)

```bash
git push origin dev
```

---

## If something goes wrong

- **See your stashes:** `git stash list`
- **Restore a stash without removing it:** `git stash apply stash@{0}`
- **Abort a merge:** `git merge --abort`
- **Your work is in the stash until you `stash drop`** – so you can always re-apply or try again.

---

## Quick reference (copy-paste)

```bash
cd post-prod-tool

# 1. Stash your work (including untracked)
git stash push -u -m "WIP: my changes before merging dev"

# 2. Update dev
git fetch origin dev
git pull origin dev
# Fix merge conflicts here if any, then commit the merge

# 3. Restore your work
git stash pop
# Fix stash conflicts if any, then git add + git stash drop

# 4. Commit your changes
git add .
git status   # review
git commit -m "feat: your message"

# 5. Push
git push origin dev
```

Replace `"feat: your message"` with a real commit message.
