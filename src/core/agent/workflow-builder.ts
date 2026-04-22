/**
 * Workflow builder — define multi-step tool chains as DAGs with conditions.
 */

export interface WorkflowStep {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  condition?: { field: string; op: 'eq' | 'neq' | 'contains' | 'gt' | 'lt'; value: unknown };
  next: string[]; // step IDs to run after this
}

export interface Workflow { id: string; name: string; steps: WorkflowStep[]; entryPoint: string }

export function buildWorkflow(name: string, steps: WorkflowStep[]): Workflow {
  return { id: `wf_${Date.now()}`, name, steps, entryPoint: steps[0]?.id ?? '' };
}

export function evaluateCondition(output: string, condition: WorkflowStep['condition']): boolean {
  if (!condition) return true;
  const { field, op, value } = condition;
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(output); } catch { return op === 'contains' ? output.includes(String(value)) : true; }
  const actual = parsed[field];
  switch (op) {
    case 'eq': return actual === value;
    case 'neq': return actual !== value;
    case 'contains': return String(actual).includes(String(value));
    case 'gt': return Number(actual) > Number(value);
    case 'lt': return Number(actual) < Number(value);
    default: return true;
  }
}

export function getNextSteps(workflow: Workflow, currentId: string, output: string): WorkflowStep[] {
  const current = workflow.steps.find((s) => s.id === currentId);
  if (!current) return [];
  return current.next
    .map((id) => workflow.steps.find((s) => s.id === id))
    .filter((s): s is WorkflowStep => !!s && evaluateCondition(output, s.condition));
}
