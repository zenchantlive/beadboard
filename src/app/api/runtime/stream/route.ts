import { bbDaemon } from '../../../../lib/bb-daemon';

export const dynamic = 'force-dynamic';

const encoder = new TextEncoder();
const HEARTBEAT_MS = 15_000;
const POLL_MS = 250;

function toRuntimeSseFrame(event: unknown): string {
  return `event: runtime\ndata: ${JSON.stringify(event)}\n\n`;
}

function toTurnsSseFrame(turns: unknown): string {
  return `event: turns\ndata: ${JSON.stringify(turns)}\n\n`;
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const projectRoot = searchParams.get('projectRoot');

  if (!projectRoot) {
    return Response.json({ ok: false, error: 'projectRoot is required' }, { status: 400 });
  }

  await bbDaemon.start();

  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const write = (payload: string) => {
        if (!closed) controller.enqueue(encoder.encode(payload));
      };

      write(': connected\n\n');

      // Seed runtime events
      const seenIds = new Set<string>();
      const seed = bbDaemon.listEvents(projectRoot);
      for (const event of seed) {
        seenIds.add(event.id);
        write(toRuntimeSseFrame(event));
      }

      // Seed conversation turns
      let lastTurnCount = 0;
      let lastTurnSnapshot = '';
      const seedTurns = bbDaemon.listTurns(projectRoot);
      if (seedTurns.length > 0) {
        lastTurnCount = seedTurns.length;
        lastTurnSnapshot = JSON.stringify(seedTurns[seedTurns.length - 1]);
        write(toTurnsSseFrame(seedTurns));
      }

      const poll = setInterval(() => {
        // Poll runtime events
        const current = bbDaemon.listEvents(projectRoot);
        const unseen = current.filter((event) => !seenIds.has(event.id));
        for (const event of unseen.reverse()) {
          seenIds.add(event.id);
          write(toRuntimeSseFrame(event));
        }

        // Poll conversation turns: push full snapshot whenever count changes or
        // the last turn (streaming) changes text.
        const turns = bbDaemon.listTurns(projectRoot);
        const lastTurn = turns[turns.length - 1];
        const currentSnapshot = lastTurn ? JSON.stringify(lastTurn) : '';
        if (turns.length !== lastTurnCount || currentSnapshot !== lastTurnSnapshot) {
          lastTurnCount = turns.length;
          lastTurnSnapshot = currentSnapshot;
          write(toTurnsSseFrame(turns));
        }
      }, POLL_MS);

      const heartbeat = setInterval(() => {
        write(': heartbeat\n\n');
      }, HEARTBEAT_MS);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearInterval(poll);
        request.signal.removeEventListener('abort', close);
        try {
          controller.close();
        } catch {}
      };

      cleanup = close;
      request.signal.addEventListener('abort', close);
    },
    cancel() {
      cleanup();
      return Promise.resolve();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
