/**
 * osd skill CLI — install, list, remove skills.
 */

import { SkillLoader } from '../core/skills/loader';

const loader = new SkillLoader();

export async function handleSkillCommand(args: string[]): Promise<void> {
  const sub = args[0];
  switch (sub) {
    case 'install': return skillInstall(args[1]);
    case 'list': return skillList();
    case 'remove': return skillRemove(args[1]);
    default:
      console.log('Usage: osd skill <install|list|remove>');
      console.log('  osd skill install <path>   Install a skill from a local path');
      console.log('  osd skill list             List installed skills');
      console.log('  osd skill remove <name>    Remove an installed skill');
  }
}

function skillInstall(source: string): void {
  if (!source) { console.error('Usage: osd skill install <path>'); process.exit(1); }
  try {
    const skill = loader.install(source);
    console.log(`✅ Installed skill "${skill.definition.name}" v${skill.definition.version}`);
    console.log(`   ${skill.definition.description}`);
    console.log(`   Tools: ${skill.definition.tools.map((t) => t.definition.name).join(', ') || 'none'}`);
  } catch (err: unknown) {
    console.error(`❌ ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

function skillList(): void {
  const skills = loader.loadAll();
  if (skills.length === 0) {
    console.log('No skills installed. Install one with: osd skill install <path>');
    return;
  }
  console.log(`Installed skills (${skills.length}):\n`);
  for (const s of skills) {
    const status = s.active ? '🟢 active' : '⚪ inactive';
    console.log(`  ${s.definition.name} v${s.definition.version} — ${status}`);
    console.log(`    ${s.definition.description}`);
    console.log(`    Tools: ${s.definition.tools.map((t) => t.definition.name).join(', ') || 'none'}`);
    console.log();
  }
}

function skillRemove(name: string): void {
  if (!name) { console.error('Usage: osd skill remove <name>'); process.exit(1); }
  try {
    loader.loadAll();
    loader.remove(name);
    console.log(`✅ Removed skill "${name}"`);
  } catch (err: unknown) {
    console.error(`❌ ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
