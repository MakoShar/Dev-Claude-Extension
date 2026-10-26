# Devos Skills Synchronizer

A VS Code extension that copies bundled Claude Code skills into the open
project's `.claude/skills/` directory.

## Install and use

1. Download `devos-skills-synchronizer-0.0.2.vsix` from this repository's
   Releases page.
2. In VS Code, open the Command Palette and run **Extensions: Install from
   VSIX...**. Select the downloaded file.
3. Open a project folder. The extension creates `.claude/skills/` when needed
   and copies the required skills automatically.

To run it again manually, use **Devos Skills: Sync Skills** from the Command
Palette.

## Bundled skills

- `frontend-design`
- `mempalace`
- `playwright`

The source of truth is `required_skills.json`; every listed skill must have a
matching `bundled_skills/<skill-name>/SKILL.md` file.

After changing `required_skills.json` or any bundled skill, run
`python sync_skills.py`. It validates that every required skill has a bundled
`SKILL.md`, compiles the extension, and replaces the root VSIX package.

> A locally installed VSIX cannot be synchronized through VS Code Settings
> Sync. To support Settings Sync, publish the extension to the VS Code
> Marketplace under a registered publisher account.

## Safety behavior

- Missing required skills are installed.
- Only skills previously recorded in `.devos-skills-manifest.json` are managed.
- An existing unrecorded same-name skill is considered custom and never changed.
- A managed skill is updated only when its bundled version is newer.
- A managed skill with an installed version newer than the extension bundle is
  left unchanged.
- Skills removed from later requirements are never deleted.
