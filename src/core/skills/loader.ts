/**
 * Skill loader — loads TypeScript skill packages from ~/.osd/skills/.
 * Skills are directories with an index.ts/js exporting a SkillDefinition.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AgentTool } from '../agent/types';
import type { ToolRegistry } from '../agent/tool-registry';

const SKILLS_DIR = path.join(process.env.HOME ?? '~', '.osd', 'skills');

export interface SkillDefinition {
  name: string;
  description: string;
  version: string;
  tools: AgentTool[];
  systemPrompt?: string;
  modelPreference?: string; // e.g. "ollama:llama3" or "anthropic:claude-sonnet-4-20250514"
}

export interface LoadedSkill {
  definition: SkillDefinition;
  path: string;
  active: boolean;
}

export class SkillLoader {
  private skills = new Map<string, LoadedSkill>();

  /** Scan ~/.osd/skills/ and load all valid skill packages */
  loadAll(): LoadedSkill[] {
    this.skills.clear();
    if (!fs.existsSync(SKILLS_DIR)) return [];

    for (const entry of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      try {
        const skill = this.loadSkill(path.join(SKILLS_DIR, entry.name));
        this.skills.set(skill.definition.name, skill);
      } catch {
        // Skip invalid skills
      }
    }
    return this.list();
  }

  /** Load a single skill from a directory path */
  loadSkill(skillPath: string): LoadedSkill {
    const indexPath = resolveEntry(skillPath);
    if (!indexPath) throw new Error(`No index.ts or index.js found in ${skillPath}`);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(indexPath);
    const def = (mod.default ?? mod) as SkillDefinition;
    validate(def, skillPath);

    const loaded: LoadedSkill = { definition: def, path: skillPath, active: false };
    this.skills.set(def.name, loaded);
    return loaded;
  }

  /** Activate a skill — register its tools into the tool registry */
  activate(name: string, registry: ToolRegistry): void {
    const skill = this.skills.get(name);
    if (!skill) throw new Error(`Skill not found: ${name}`);
    for (const tool of skill.definition.tools) {
      registry.register(tool);
    }
    skill.active = true;
  }

  /** Deactivate a skill — unregister its tools */
  deactivate(name: string, registry: ToolRegistry): void {
    const skill = this.skills.get(name);
    if (!skill) return;
    for (const tool of skill.definition.tools) {
      registry.unregister(tool.definition.name);
    }
    skill.active = false;
  }

  get(name: string): LoadedSkill | undefined {
    return this.skills.get(name);
  }

  list(): LoadedSkill[] {
    return Array.from(this.skills.values());
  }

  /** Install a skill from a local path (copy to ~/.osd/skills/) */
  install(sourcePath: string): LoadedSkill {
    const abs = path.resolve(sourcePath);
    if (!fs.existsSync(abs)) throw new Error(`Path not found: ${abs}`);

    const loaded = this.loadSkill(abs);
    const destDir = path.join(SKILLS_DIR, loaded.definition.name);

    // Defense-in-depth: ensure destDir is inside SKILLS_DIR
    if (!destDir.startsWith(SKILLS_DIR))
      throw new Error('Invalid skill name: path traversal detected');

    fs.mkdirSync(SKILLS_DIR, { recursive: true });
    fs.cpSync(abs, destDir, { recursive: true });

    // Clear require cache so re-install picks up new code
    const entryPath = resolveEntry(destDir);
    if (entryPath && require.cache[entryPath]) delete require.cache[entryPath];

    loaded.path = destDir;
    this.skills.set(loaded.definition.name, loaded);
    return loaded;
  }

  /** Remove an installed skill */
  remove(name: string, registry?: ToolRegistry): void {
    const skill = this.skills.get(name);
    if (!skill) throw new Error(`Skill not found: ${name}`);
    if (skill.active && registry) this.deactivate(name, registry);
    if (fs.existsSync(skill.path)) fs.rmSync(skill.path, { recursive: true });
    this.skills.delete(name);
  }
}

function resolveEntry(dir: string): string | null {
  for (const name of ['index.js', 'index.ts', 'dist/index.js']) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function validate(def: SkillDefinition, skillPath: string): void {
  if (!def.name || typeof def.name !== 'string')
    throw new Error(`Invalid skill at ${skillPath}: missing name`);
  if (!/^[a-zA-Z0-9_-]+$/.test(def.name))
    throw new Error(
      `Invalid skill name "${def.name}": must be alphanumeric, hyphens, underscores only`,
    );
  if (!def.description) throw new Error(`Invalid skill "${def.name}": missing description`);
  if (!Array.isArray(def.tools))
    throw new Error(`Invalid skill "${def.name}": tools must be an array`);
}
