/**
 * osd chat — readline-based CLI chat mode.
 *
 * Usage:
 *   osd chat --model ollama:llama3
 *   osd chat --model openai:gpt-4o
 *   osd chat (uses default model from settings)
 *
 * Commands inside chat:
 *   /model <specifier>  — switch model mid-session
 *   /clear              — clear conversation history
 *   /quit               — exit
 */

import * as readline from 'readline';
import { ModelRouter } from '../core/agent/model-router';
import { ToolRegistry } from '../core/agent/tool-registry';
import { AgentOrchestrator } from '../core/agent/orchestrator';
import { OllamaProvider } from '../core/agent/providers/ollama';
import { OpenAIProvider } from '../core/agent/providers/openai';
import { AnthropicProvider } from '../core/agent/providers/anthropic';
import { BedrockProvider } from '../core/agent/providers/bedrock';
import { OpenAICompatibleProvider } from '../core/agent/providers/openai-compatible';
import type { StreamEvent, ToolContext } from '../core/agent/types';

interface ChatCLIOptions {
  model?: string;
  baseUrl?: string;
}

export async function runChatCLI(options: ChatCLIOptions): Promise<void> {
  const router = new ModelRouter();
  router.register(new OllamaProvider());
  router.register(new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY ?? '' }));
  router.register(new AnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' }));
  router.register(new BedrockProvider(process.env.AWS_REGION ?? 'us-east-1'));
  if (options.baseUrl) {
    router.register(
      new OpenAICompatibleProvider({
        baseUrl: options.baseUrl,
        apiKey: process.env.OSD_API_KEY ?? '',
      }),
    );
  }

  const registry = new ToolRegistry();
  let modelSpecifier = options.model ?? 'ollama:llama3';

  // Validate model specifier
  try {
    router.resolve(modelSpecifier);
  } catch (err: unknown) {
    console.error(`Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  const toolContext: ToolContext = {
    workspaceId: 'cli',
    activeConnection: null,
    signal: new AbortController().signal,
  };

  let orchestrator = createOrchestrator(router, registry, modelSpecifier);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(`\nosd chat — model: ${modelSpecifier}`);
  console.log('Type /model <specifier> to switch, /clear to reset, /quit to exit.\n');

  const prompt = () =>
    rl.question('> ', async (input) => {
      const trimmed = input.trim();
      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed === '/quit' || trimmed === '/exit') {
        rl.close();
        return;
      }

      if (trimmed === '/clear') {
        orchestrator = createOrchestrator(router, registry, modelSpecifier);
        console.log('Conversation cleared.\n');
        prompt();
        return;
      }

      if (trimmed.startsWith('/model ')) {
        const newModel = trimmed.slice(7).trim();
        try {
          router.resolve(newModel);
          modelSpecifier = newModel;
          orchestrator = createOrchestrator(router, registry, modelSpecifier);
          console.log(`Switched to ${modelSpecifier}\n`);
        } catch (err: unknown) {
          console.error(`${err instanceof Error ? err.message : err}\n`);
        }
        prompt();
        return;
      }

      // Send message and stream response
      process.stdout.write('\n');
      await orchestrator.send(trimmed, toolContext);
      process.stdout.write('\n\n');
      prompt();
    });

  prompt();
}

function createOrchestrator(
  modelRouter: ModelRouter,
  toolRegistry: ToolRegistry,
  modelSpecifier: string,
): AgentOrchestrator {
  return new AgentOrchestrator({
    modelRouter,
    toolRegistry,
    modelSpecifier,
    onEvent: (event: StreamEvent) => {
      switch (event.type) {
        case 'token':
          process.stdout.write(event.content);
          break;
        case 'tool_call_start':
          process.stdout.write(`\n[tool: ${event.name}] `);
          break;
        case 'tool_result':
          process.stdout.write(event.isError ? `[error: ${event.output}]` : '[done]');
          break;
        case 'error':
          process.stderr.write(`\nError: ${event.message}\n`);
          break;
        case 'done':
          break;
      }
    },
  });
}

// --- CLI entry point ---

export function parseChatArgs(args: string[]): ChatCLIOptions {
  const opts: ChatCLIOptions = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--model' && args[i + 1]) opts.model = args[++i];
    else if (args[i] === '--base-url' && args[i + 1]) opts.baseUrl = args[++i];
  }
  return opts;
}
