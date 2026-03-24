import type { RuntimeConsoleEvent } from './embedded-runtime';

export interface OrchestratorChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export function projectOrchestratorChat(events: RuntimeConsoleEvent[]): OrchestratorChatMessage[] {
  const ordered = [...events]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const messages: OrchestratorChatMessage[] = [];
  let currentAssistantIndex: number | null = null;

  for (const event of ordered) {
    if (event.actorLabel === 'human' && event.detail.trim()) {
      messages.push({
        id: `chat-${event.id}`,
        role: 'user',
        text: event.detail,
        timestamp: event.timestamp,
      });
      currentAssistantIndex = null;
      continue;
    }

    if (event.title === 'Orchestrator Responding') {
      if (currentAssistantIndex === null) {
        messages.push({
          id: `chat-${event.id}`,
          role: 'assistant',
          text: '…',
          timestamp: event.timestamp,
        });
        currentAssistantIndex = messages.length - 1;
      }
      continue;
    }

    if (event.title === 'Orchestrator Thinking' && event.detail.trim()) {
      if (currentAssistantIndex === null) {
        messages.push({
          id: `chat-${event.id}`,
          role: 'assistant',
          text: event.detail,
          timestamp: event.timestamp,
        });
        currentAssistantIndex = messages.length - 1;
      } else {
        const last = messages[currentAssistantIndex];
        messages[currentAssistantIndex] = {
          ...last,
          text: `${last.text === '…' ? '' : last.text}${event.detail}`,
          timestamp: event.timestamp,
        };
      }
      continue;
    }

    if (event.title === 'Orchestrator Reply' && event.detail.trim()) {
      if (currentAssistantIndex !== null && messages[currentAssistantIndex]?.role === 'assistant') {
        const last = messages[currentAssistantIndex];
        const nextText = event.detail;
        const mergedText = nextText.startsWith(last.text) || nextText.length >= last.text.length
          ? nextText
          : `${last.text === '…' ? '' : last.text}${nextText}`;
        messages[currentAssistantIndex] = {
          ...last,
          text: mergedText,
          timestamp: event.timestamp,
        };
      } else {
        messages.push({
          id: `chat-${event.id}`,
          role: 'assistant',
          text: event.detail,
          timestamp: event.timestamp,
        });
        currentAssistantIndex = messages.length - 1;
      }
      continue;
    }

    if (event.title === 'Session Error') {
      currentAssistantIndex = null;
      continue;
    }

    // Worker events - when worker completes, orchestrator should report it
    if (event.kind === 'worker.spawned') {
      if (currentAssistantIndex === null) {
        messages.push({
          id: `chat-${event.id}`,
          role: 'assistant',
          text: `Spawning worker${event.metadata?.taskId ? ` for task ${event.metadata.taskId}` : ''}...`,
          timestamp: event.timestamp,
        });
        currentAssistantIndex = messages.length - 1;
      }
      continue;
    }

    if (event.kind === 'worker.updated') {
      if (currentAssistantIndex !== null && messages[currentAssistantIndex]?.role === 'assistant') {
        const last = messages[currentAssistantIndex];
        messages[currentAssistantIndex] = {
          ...last,
          text: `${last.text === '…' ? '' : last.text}Worker is now working${event.metadata?.taskId ? ` on task ${event.metadata.taskId}` : ''}.`,
          timestamp: event.timestamp,
        };
      }
      continue;
    }

    if (event.kind === 'worker.completed') {
      if (currentAssistantIndex === null) {
        messages.push({
          id: `chat-${event.id}`,
          role: 'assistant',
          text: `Worker${event.metadata?.workerId ? ` ${event.metadata.workerId}` : ''} completed${event.metadata?.taskId ? ` task ${event.metadata.taskId}` : ''}.`,
          timestamp: event.timestamp,
        });
        currentAssistantIndex = messages.length - 1;
      } else if (currentAssistantIndex !== null && messages[currentAssistantIndex]?.role === 'assistant') {
        const last = messages[currentAssistantIndex];
        messages[currentAssistantIndex] = {
          ...last,
          text: `${last.text === '…' ? '' : last.text}Worker${event.metadata?.workerId ? ` ${event.metadata.workerId}` : ''} completed${event.metadata?.taskId ? ` task ${event.metadata.taskId}` : ''}.`,
          timestamp: event.timestamp,
        };
      }
      continue;
    }

    if (event.kind === 'worker.failed') {
      if (currentAssistantIndex === null) {
        messages.push({
          id: `chat-${event.id}`,
          role: 'assistant',
          text: `Worker${event.metadata?.workerId ? ` ${event.metadata.workerId}` : ''} failed${event.metadata?.taskId ? ` task ${event.metadata.taskId}` : ''}${event.detail ? `: ${event.detail}` : ''}.`,
          timestamp: event.timestamp,
        });
        currentAssistantIndex = messages.length - 1;
      } else if (currentAssistantIndex !== null && messages[currentAssistantIndex]?.role === 'assistant') {
        const last = messages[currentAssistantIndex];
        messages[currentAssistantIndex] = {
          ...last,
          text: `${last.text === '…' ? '' : last.text}Worker${event.metadata?.workerId ? ` ${event.metadata.workerId}` : ''} failed${event.metadata?.taskId ? ` task ${event.metadata.taskId}` : ''}${event.detail ? `: ${event.detail}` : ''}.`,
          timestamp: event.timestamp,
        };
      }
      continue;
    }
  }

  return messages;
}
