---
name: ship-it
description: Trigger when the user says "ship it", "commit and pr", "deploy this", or runs "/ship".
---

# Ship It: Commit, Push, and PR Workflow

When triggered, follow this exact workflow:

1. **Branch Management**: Use the `run_command` tool to execute `git branch --show-current`. If the output is `main`, you must create a new feature branch before committing. Use `run_command` to execute `git checkout -b feature/auto-update-$(date +%s)` (or generate a concise, relevant branch name based on the user's intent).
2. **Stage Changes**: Execute `git diff --staged`. If the output is empty (nothing is staged), automatically stage all changes on the user's behalf by running `git add .`, and then run `git diff --staged` again to read the newly staged changes.
3. **Generate Commit Message**: Read the staged diff output. Generate a commit message based on the diff in this exact format:

   type(scope): short subject

   - bullet of what changed
   - bullet of why

4. **Commit**: Use the `run_command` tool to execute `git commit -m "..."` with the generated message.
5. **Push**: Use the `run_command` tool to execute `git push -u origin HEAD` to push the newly created branch to the remote repository.
6. **Create Pull Request**: Use the `run_command` tool to execute `gh pr create --base main --title "<short subject>" --body "<the body bullets>"` to automatically create the Pull Request using the GitHub CLI.

## Commit Message Rules:
- **Types**: Use one of `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`.
- **Subject**: Must be under 60 characters.
- **Body bullets**: Optional but highly encouraged.
- **NEVER** include a Co-Authored-By trailer.
