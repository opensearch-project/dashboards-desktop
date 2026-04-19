/**
 * MessageBus — typed pub/sub for inter-agent communication.
 */

import { EventEmitter } from 'events';

export interface AgentMessage {
  id: string;
  from: string; // agent ID
  to: string | '*'; // agent ID or '*' for broadcast
  type: 'request' | 'response' | 'delegate' | 'notify';
  content: string;
  metadata?: Record<string, unknown>;
  replyTo?: string; // message ID this is responding to
  timestamp: number;
}

type MessageHandler = (msg: AgentMessage) => void;

export class MessageBus {
  private emitter = new EventEmitter();
  private history: AgentMessage[] = [];
  private nextId = 0;

  /** Send a message to a specific agent or broadcast */
  send(msg: Omit<AgentMessage, 'id' | 'timestamp'>): AgentMessage {
    const full: AgentMessage = { ...msg, id: `msg_${++this.nextId}`, timestamp: Date.now() };
    this.history.push(full);

    if (full.to === '*') {
      this.emitter.emit('broadcast', full);
    } else {
      this.emitter.emit(`agent:${full.to}`, full);
    }
    this.emitter.emit('*', full);
    return full;
  }

  /** Subscribe to messages for a specific agent */
  on(agentId: string, handler: MessageHandler): void {
    this.emitter.on(`agent:${agentId}`, handler);
    this.emitter.on('broadcast', handler);
  }

  /** Unsubscribe */
  off(agentId: string, handler: MessageHandler): void {
    this.emitter.off(`agent:${agentId}`, handler);
    this.emitter.off('broadcast', handler);
  }

  /** Subscribe to all messages (for logging/debugging) */
  onAll(handler: MessageHandler): void {
    this.emitter.on('*', handler);
  }

  /** Send a request and wait for a response */
  async request(
    from: string,
    to: string,
    content: string,
    timeoutMs = 30_000,
  ): Promise<AgentMessage> {
    const msg = this.send({ from, to, type: 'request', content });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`No response from "${to}" within ${timeoutMs}ms`));
      }, timeoutMs);

      const handler = (reply: AgentMessage) => {
        if (reply.replyTo === msg.id) {
          cleanup();
          resolve(reply);
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        this.emitter.off(`agent:${from}`, handler);
      };

      this.emitter.on(`agent:${from}`, handler);
    });
  }

  getHistory(limit?: number): AgentMessage[] {
    return limit ? this.history.slice(-limit) : [...this.history];
  }

  clear(): void {
    this.history = [];
  }
}
