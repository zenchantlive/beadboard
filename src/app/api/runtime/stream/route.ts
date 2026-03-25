import { bbDaemon } from '../../../../lib/bb-daemon';

export const dynamic = 'force-dynamic';

const encoder = new TextEncoder();
const HEARTBEAT_MS = 15_000;
const POLL_MS = 250;

function toRuntimeSseFrame(event: unknown): string {
  return `event: runtime\ndata: ${JSON.stringify(event)}\n\n`;
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

      const seenIds = new Set<string>();
      const seed = bbDaemon.listEvents(projectRoot);
      for (const event of seed) {
        seenIds.add(event.id);
        write(toRuntimeSseFrame(event));
      }

      const poll = setInterval(() => {
        const current = bbDaemon.listEvents(projectRoot);
        const unseen = current.filter((event) => !seenIds.has(event.id));
        for (const event of unseen.reverse()) {
          seenIds.add(event.id);
          write(toRuntimeSseFrame(event));
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
