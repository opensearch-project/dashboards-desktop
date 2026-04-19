import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SkillLoader } from '../../../src/core/skills/loader';
import { ToolRegistry } from '../../../src/core/agent/tool-registry';

vi.mock('better-sqlite3', () => ({ default: vi.fn() }));
vi.mock('worker_threads', () => ({ isMainThread: true, parentPort: null, workerData: {}, Worker: vi.fn() }));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osd-skill-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function createSkillDir(name: string, content: string): string {
  const dir = path.join(tmpDir, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.js'), content);
  return dir;
}

describe('SkillLoader: loadSkill', () => {
  it('loads a valid skill package', () => {
    const dir = createSkillDir('test-skill', `
      module.exports = {
        name: 'test-skill',
        description: 'A test skill',
        version: '1.0.0',
        tools: [],
      };
    `);
    const loader = new SkillLoader();
    const skill = loader.loadSkill(dir);
    expect(skill.definition.name).toBe('test-skill');
    expect(skill.definition.description).toBe('A test skill');
    expect(skill.active).toBe(false);
  });

  it('throws on missing name', () => {
    const dir = createSkillDir('bad-skill', `module.exports = { description: 'no name', tools: [] };`);
    const loader = new SkillLoader();
    expect(() => loader.loadSkill(dir)).toThrow(/missing name/);
  });

  it('throws on missing index file', () => {
    const dir = path.join(tmpDir, 'empty-skill');
    fs.mkdirSync(dir);
    const loader = new SkillLoader();
    expect(() => loader.loadSkill(dir)).toThrow(/No index/);
  });
});

describe('SkillLoader: activate/deactivate', () => {
  it('registers tools into registry on activate', () => {
    const dir = createSkillDir('tool-skill', `
      module.exports = {
        name: 'tool-skill',
        description: 'Skill with tools',
        version: '1.0.0',
        tools: [{
          definition: { name: 'custom-tool', description: 'Custom', source: 'builtin', inputSchema: {}, requiresApproval: false },
          execute: async () => ({ content: 'ok', isError: false }),
        }],
      };
    `);
    const loader = new SkillLoader();
    loader.loadSkill(dir);
    const registry = new ToolRegistry();
    loader.activate('tool-skill', registry);
    expect(registry.get('custom-tool')).toBeDefined();
    expect(loader.get('tool-skill')?.active).toBe(true);
  });

  it('unregisters tools on deactivate', () => {
    const dir = createSkillDir('deact-skill', `
      module.exports = {
        name: 'deact-skill',
        description: 'Deactivatable',
        version: '1.0.0',
        tools: [{
          definition: { name: 'temp-tool', description: 'Temp', source: 'builtin', inputSchema: {}, requiresApproval: false },
          execute: async () => ({ content: 'ok', isError: false }),
        }],
      };
    `);
    const loader = new SkillLoader();
    loader.loadSkill(dir);
    const registry = new ToolRegistry();
    loader.activate('deact-skill', registry);
    loader.deactivate('deact-skill', registry);
    expect(registry.get('temp-tool')).toBeUndefined();
    expect(loader.get('deact-skill')?.active).toBe(false);
  });
});

describe('SkillLoader: list', () => {
  it('lists all loaded skills', () => {
    const loader = new SkillLoader();
    createSkillDir('s1', `module.exports = { name: 's1', description: 'd', version: '1.0.0', tools: [] };`);
    createSkillDir('s2', `module.exports = { name: 's2', description: 'd', version: '1.0.0', tools: [] };`);
    loader.loadSkill(path.join(tmpDir, 's1'));
    loader.loadSkill(path.join(tmpDir, 's2'));
    expect(loader.list()).toHaveLength(2);
  });
});
