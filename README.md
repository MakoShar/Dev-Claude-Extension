# Devos Skills Synchronizer

A VS Code extension that synchronizes the Claude Code skills bundled with the
extension into the open project's `.claude/skills/` directory.

It runs when a workspace opens and can be run manually with **Devos Skills: Sync
Skills**. Requirements are in `required_skills.json`; the corresponding skill
directories are bundled in `bundled_skills/`. The current bundle contains
`frontend-design`, `mempalace`, and `playwright`.

After changing `required_skills.json` or any bundled skill, run
`python sync_skills.py`. It validates that every required skill has a bundled
`SKILL.md`, compiles the extension, and replaces the root VSIX package.

## Safety behavior

- Missing required skills are installed.
- Only skills previously recorded in `.devos-skills-manifest.json` are managed.
- An existing unrecorded same-name skill is considered custom and never changed.
- A managed skill is updated only when its bundled version is newer.
- A managed skill with an installed version newer than the extension bundle is
  left unchanged.
- Skills removed from later requirements are never deleted.
