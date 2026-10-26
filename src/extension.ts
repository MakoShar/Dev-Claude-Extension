import * as vscode from "vscode";
import * as fs from "node:fs/promises";
import * as path from "node:path";

interface RequiredSkill { name: string; version: string }
interface Requirements { skills: RequiredSkill[] }
interface Ownership { managed_skills: Record<string, string> }
interface Result { installed: string[]; updated: string[]; skipped: string[]; conflicts: string[]; failures: string[] }

const ownershipFile = ".devos-skills-manifest.json";

function versionParts(value: string): number[] {
  if (!/^\d+(\.\d+)*$/.test(value)) throw new Error(`Invalid numeric version: ${value}`);
  return value.split(".").map(Number);
}

function compareVersions(left: string, right: string): number {
  const a = versionParts(left); const b = versionParts(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference) return Math.sign(difference);
  }
  return 0;
}

async function exists(file: string): Promise<boolean> { try { await fs.lstat(file); return true; } catch { return false; } }
async function hasSkillFile(directory: string): Promise<boolean> { try { return (await fs.stat(path.join(directory, "SKILL.md"))).isFile(); } catch { return false; } }

async function readOwnership(file: string): Promise<Ownership> {
  try {
    const value = JSON.parse(await fs.readFile(file, "utf8")) as Ownership;
    return value.managed_skills && typeof value.managed_skills === "object" ? value : { managed_skills: {} };
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { managed_skills: {} };
    throw error;
  }
}

async function copySkill(source: string, destination: string): Promise<void> {
  if (!await hasSkillFile(source)) throw new Error("bundled skill has no SKILL.md");
  if (!await exists(destination)) await fs.mkdir(destination, { recursive: true });
  // Overlay only bundle files, retaining files a user added to a managed skill.
  await fs.cp(source, destination, { recursive: true, force: true });
  if (!await hasSkillFile(destination)) throw new Error("installed skill verification failed");
}

async function sync(workspaceRoot: string, extensionRoot: string): Promise<Result> {
  const result: Result = { installed: [], updated: [], skipped: [], conflicts: [], failures: [] };
  const requirements = JSON.parse(await fs.readFile(path.join(extensionRoot, "required_skills.json"), "utf8")) as Requirements;
  if (!Array.isArray(requirements.skills)) throw new Error("required_skills.json must have a skills array");
  const skillsRoot = path.join(workspaceRoot, ".claude", "skills");
  await fs.mkdir(skillsRoot, { recursive: true });
  const ownershipPath = path.join(skillsRoot, ownershipFile);
  const ownership = await readOwnership(ownershipPath);

  for (const required of requirements.skills) {
    const destination = path.join(skillsRoot, required.name);
    const source = path.join(extensionRoot, "bundled_skills", required.name);
    const installedVersion = ownership.managed_skills[required.name];
    const destinationExists = await exists(destination);
    try {
      if (destinationExists && installedVersion === undefined) {
        result.conflicts.push(`${required.name}: custom skill preserved`);
      } else if (installedVersion !== undefined && compareVersions(installedVersion, required.version) > 0) {
        result.skipped.push(`${required.name}: installed version ${installedVersion} is newer`);
      } else if (installedVersion === required.version && await hasSkillFile(destination)) {
        result.skipped.push(required.name);
      } else {
        await copySkill(source, destination);
        ownership.managed_skills[required.name] = required.version;
        (installedVersion === undefined ? result.installed : result.updated).push(required.name);
      }
    } catch (error) {
      result.failures.push(`${required.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const temporary = `${ownershipPath}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(ownership, null, 2)}\n`, "utf8");
  await fs.rename(temporary, ownershipPath);
  return result;
}

export function activate(context: vscode.ExtensionContext): void {
  const run = async (): Promise<void> => {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) return;
    try {
      const result = await sync(folder.uri.fsPath, context.extensionPath);
      if (result.failures.length) vscode.window.showErrorMessage(`Devos Skills sync failed: ${result.failures.join("; ")}`);
      else if (result.conflicts.length) vscode.window.showWarningMessage(`Devos Skills sync completed with conflicts: ${result.conflicts.join("; ")}`);
      else vscode.window.showInformationMessage(`Devos Skills sync complete: ${result.installed.length} installed, ${result.updated.length} updated, ${result.skipped.length} unchanged.`);
    } catch (error) {
      vscode.window.showErrorMessage(`Devos Skills sync failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  context.subscriptions.push(vscode.commands.registerCommand("devosSkills.syncSkills", run));
  void run();
}

export function deactivate(): void {}
