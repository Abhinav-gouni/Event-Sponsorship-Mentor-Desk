C34 Event Sponsorship Match Desk - AI Matching Repair

This is a patch for the existing project, not a full replacement project.

HOW TO APPLY
1. Stop the frontend and backend processes.
2. Back up your current project folder.
3. Extract this ZIP into the root of your existing Antigravity project folder, preserving the folder paths. Allow replacement of files with the same paths.
4. Keep your existing local .env files; this patch does not include them.
5. In a terminal at the project root, run:
   npm run test:matching
6. Confirm MySQL is running, the database is initialized, and the configured Ollama model is installed.
7. Restart the backend and frontend.

AI MATCHING CHANGES
- Scores are calculated deterministically from actual stored event/sponsor/profile fields.
- Ollama may only rewrite explanations; it cannot change match scores, IDs, ranking, or invent records.
- Missing configured models no longer silently switch to an arbitrary installed model.
- When Ollama is unavailable, deterministic matches still work.
- Matching endpoints enforce organizer/sponsor roles and prevent users from querying another organizer's events or another sponsor's profile.
- Recommendations only name available benefits found in event inventory records.

MODEL CHECK
Run `ollama list` and verify the exact model configured in server/.env or the root .env. If using qwen2.5:7b and it is not installed, run `ollama pull qwen2.5:7b`.

LIMITATIONS
The patch adds focused deterministic matching tests. Full end-to-end behavior still requires running the application against your local MySQL database and Ollama model. It does not claim that every other module in the existing project has been independently verified.
