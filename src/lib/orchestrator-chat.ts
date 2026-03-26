/**
 * orchestrator-chat.ts
 *
 * First-class conversation turn store for the orchestrator chat panel.
 * Turns are the source of truth; they are NOT projected from runtime events.
 *
 * Runtime events continue to flow to the runtime console — events and turns
 * are separate concerns.
 */

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  status?: 'streaming' | 'complete' | 'error';
}

/**
 * OrchestratorChatMessage is kept as a type alias for ConversationTurn so that
 * existing component prop types continue to compile without changes.
 */
export type OrchestratorChatMessage = ConversationTurn;

/**
 * In-memory conversation turn store for a single project.
 * Manages the ordered list of turns and provides streaming-update helpers.
 */
export class ConversationTurnStore {
  private turns: ConversationTurn[] = [];

  /**
   * Append a fully-formed turn (used for user messages and completed assistant turns).
   */
  appendTurn(turn: ConversationTurn): void {
    this.turns.push(turn);
  }

  /**
   * Apply an updater function to the last turn in the store.
   * Used to stream text deltas into an in-progress assistant turn without
   * creating a second turn.
   */
  updateLastTurn(updater: (turn: ConversationTurn) => ConversationTurn): void {
    if (this.turns.length === 0) return;
    const last = this.turns[this.turns.length - 1];
    this.turns[this.turns.length - 1] = updater(last);
  }

  /**
   * Return a shallow copy of all turns in chronological order.
   * No artificial cap is applied.
   */
  listTurns(): ConversationTurn[] {
    return [...this.turns];
  }

  /** Reset the store (used in tests). */
  reset(): void {
    this.turns = [];
  }
}

/**
 * Generate a stable, unique turn ID.
 */
export function makeTurnId(prefix: 'user' | 'asst'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
