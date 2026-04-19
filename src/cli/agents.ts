/**
 * osd agent CLI — list, switch, and show current persona.
 */

import { listPersonas, switchPersona, getActivePersona } from '../core/skills/personas';

export async function handleAgentCommand(args: string[]): Promise<void> {
  const sub = args[0];
  switch (sub) {
    case 'list': return agentList();
    case 'switch': return agentSwitch(args[1]);
    case 'current': return agentCurrent();
    default:
      console.log('Usage: osd agent <list|switch|current>');
      console.log('  osd agent list             List available personas');
      console.log('  osd agent switch <name>    Switch to a persona');
      console.log('  osd agent current          Show active persona');
  }
}

function agentList(): void {
  const personas = listPersonas();
  const active = getActivePersona();
  console.log('Available personas:\n');
  for (const p of personas) {
    const marker = p.name === active.name ? ' (active)' : '';
    console.log(`  ${p.name}${marker}`);
    console.log(`    ${p.description}`);
    if (p.toolFilter.length) console.log(`    Tools: ${p.toolFilter.join(', ')}`);
    if (p.modelPreference) console.log(`    Model: ${p.modelPreference}`);
    console.log();
  }
}

function agentSwitch(name: string): void {
  if (!name) { console.error('Usage: osd agent switch <name>'); process.exit(1); }
  try {
    const persona = switchPersona(name);
    console.log(`✅ Switched to "${persona.name}" — ${persona.description}`);
  } catch (err: unknown) {
    console.error(`❌ ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

function agentCurrent(): void {
  const p = getActivePersona();
  console.log(`Active persona: ${p.name}`);
  console.log(`  ${p.description}`);
  if (p.modelPreference) console.log(`  Model preference: ${p.modelPreference}`);
}
