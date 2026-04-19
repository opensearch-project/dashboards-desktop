import { describe, it, expect } from 'vitest';
import { getActivePersona, switchPersona, listPersonas, PERSONAS } from '../../../src/core/skills/personas';

describe('Personas: list', () => {
  it('returns all built-in personas', () => {
    const personas = listPersonas();
    expect(personas.length).toBeGreaterThanOrEqual(4);
    expect(personas.map((p) => p.name)).toContain('default');
    expect(personas.map((p) => p.name)).toContain('ops-agent');
    expect(personas.map((p) => p.name)).toContain('analyst-agent');
    expect(personas.map((p) => p.name)).toContain('security-agent');
  });

  it('each persona has required fields', () => {
    for (const p of listPersonas()) {
      expect(p.name).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.systemPrompt).toBeTruthy();
      expect(Array.isArray(p.toolFilter)).toBe(true);
    }
  });
});

describe('Personas: switch', () => {
  it('switches to ops-agent and changes system prompt', () => {
    const persona = switchPersona('ops-agent');
    expect(persona.name).toBe('ops-agent');
    expect(persona.systemPrompt).toContain('operations');
    expect(getActivePersona().name).toBe('ops-agent');
  });

  it('ops-agent filters to ops-relevant tools', () => {
    const persona = switchPersona('ops-agent');
    expect(persona.toolFilter).toContain('cluster-health');
    expect(persona.toolFilter).toContain('opensearch-query');
  });

  it('default persona has empty tool filter (all tools)', () => {
    switchPersona('default');
    expect(getActivePersona().toolFilter).toEqual([]);
  });

  it('security-agent focuses on security tools', () => {
    const persona = switchPersona('security-agent');
    expect(persona.toolFilter).toContain('os-security-manage');
    expect(persona.systemPrompt).toContain('security');
  });

  it('throws on unknown persona', () => {
    expect(() => switchPersona('nonexistent')).toThrow(/Unknown persona/);
  });

  it('error message lists available personas', () => {
    try {
      switchPersona('bad');
    } catch (e: any) {
      expect(e.message).toContain('default');
      expect(e.message).toContain('ops-agent');
    }
  });
});
