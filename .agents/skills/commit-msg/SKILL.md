---
name: commit-msg
description: Trigger when the user says "write a commit message", "generate a commit", "commit my changes", or runs "/commit-msg".
---

# Commit Message Generator

When triggered, follow this workflow:

1. Check that there are staged changes using the `run_command` tool to execute `git diff --staged`. If the output is empty (nothing is staged), automatically stage all changes on the user's behalf by running `git add .`, and then run `git diff --staged` again to read the newly staged changes.
2. Read the staged diff output.
3. Generate a commit message based on the diff in this exact format:

   type(scope): short subject

   - bullet of what changed
   - bullet of why

4. Use the `run_command` tool to execute `git commit -m "..."` with that generated message.

## Commit Message Rules:
- **Types**: Use one of `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`.
- **Subject**: Must be under 60 characters.
- **Body bullets**: Optional but highly encouraged.
- **NEVER** include a Co-Authored-By trailer.
