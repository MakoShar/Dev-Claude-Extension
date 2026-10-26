# Devos Skills Synchronizer

A VS Code extension that copies bundled Claude Code skills into the open
project's `.claude/skills/` directory.

## Install and use

1. Open VS Code.
2. Click the **Extensions** icon in the Activity Bar (or press `Ctrl+Shift+X`)
   to open the Extensions Marketplace view.
3. Click the **...** menu at the top of that view.
4. Select **Install from VSIX...**.
5. Choose `devos-skills-synchronizer-0.0.2.vsix` from this project folder.
6. Reload VS Code if it asks you to, then open a project folder. The extension
   creates `.claude/skills/` when needed and copies the required skills.

To run it again manually, use **Devos Skills: Sync Skills** from the Command
Palette.

## Bundled skills

- `frontend-design`
- `mempalace`
- `playwright`

The source of truth is `required_skills.json`; every listed skill must have a
matching `bundled_skills/<skill-name>/SKILL.md` file.

To add or change a skill:

1. Add its `name` and numeric `version` to `required_skills.json`.
2. Add the matching file at `bundled_skills/<skill-name>/SKILL.md`.
3. Run the script from this folder:

   ```powershell
   python sync_skills.py
   ```

The script validates every requirement, compiles the extension, and replaces
the root VSIX package. Install the newly generated VSIX using the steps above.


## Safety behavior

- Missing required skills are installed.
- Only skills previously recorded in `.devos-skills-manifest.json` are managed.
- An existing unrecorded same-name skill is considered custom and never changed.
- A managed skill is updated only when its bundled version is newer.
- A managed skill with an installed version newer than the extension bundle is
  left unchanged.
- Skills removed from later requirements are never deleted.
