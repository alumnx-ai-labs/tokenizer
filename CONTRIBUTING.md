# Contributing to This Project

Thanks for contributing! Follow these steps to submit your work.

## 1. Fork the repository

Click the **Fork** button at the top-right of this repo's GitHub page. This creates a copy under your own GitHub account.

## 2. Clone your fork

```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
```

## 3. Create a new branch

Use a descriptive branch name related to the issue you're working on.

```bash
git checkout -b vocab-expansion
```

## 4. Make your changes

Work on the task described in the GitHub issue you picked. This might include:
- Adding new source files (e.g., corpus text files)
- Updating scripts/notebooks
- Updating the UI
- Updating the README with relevant details

## 5. Test your changes

Before committing, make sure:
- The app still runs without errors
- Any acceptance criteria listed in the issue are met
- You've tested with the example input mentioned in the issue (if any)

## 6. Commit your changes

Write a clear, descriptive commit message.

```bash
git add .
git commit -m "Expand tokenizer vocab using football corpus"
```

## 7. Push to your fork

```bash
git push origin vocab-expansion
```

## 8. Open a Pull Request

- Go to your fork on GitHub
- Click **Compare & pull request**
- Set the base repository to this repo's `main` branch
- In the PR description:
  - Summarize what you changed and why
  - **Reference the issue** you're resolving (e.g., `Closes #12`) so it links and auto-closes on merge
  - Include before/after results if applicable (e.g., vocab size, token ID comparison)

## 9. Respond to feedback

A maintainer will review your PR and may request changes. Push additional commits to the same branch — they'll automatically appear in the PR.

---

## Quick Reference

| Step | Command |
|---|---|
| Fork | Click "Fork" on GitHub |
| Clone | `git clone https://github.com/<your-username>/<repo-name>.git` |
| Branch | `git checkout -b <branch-name>` |
| Commit | `git commit -m "<message>"` |
| Push | `git push origin <branch-name>` |
| PR | Open via GitHub UI, reference issue number |

## Picking an Issue

- Browse the **Issues** tab for open tasks
- Comment on the issue to let others know you're working on it
- If you have a new idea not covered by an existing issue, open a new issue first to discuss before starting work
