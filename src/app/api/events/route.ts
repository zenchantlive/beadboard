import { canonicalizeWindowsPath } from '../../../lib/pathing';
import { issuesEventBus, SSE_CONNECTED_FRAME, SSE_HEARTBEAT_FRAME, toSseFrame } from '../../../lib/realtime';
import { getIssuesWatchManager } from '../../../lib/watcher';

const encoder = new TextEncoder();
const HEARTBEAT_MS = 15_000;

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const projectRootSearchParam = url.searchParams.get('projectRoot');
  if (!projectRootSearchParam) {
    return Response.json(
      {
        ok: false,
        error: {
          classification: 'bad_args',
          message: 'The `projectRoot` query parameter is required.',
        },
      },
      { status: 400 },
    );
  }
  const projectRoot = canonicalizeWindowsPath(projectRootSearchParam);

  try {
    getIssuesWatchManager().startWatch(projectRoot);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: {
          classification: 'unknown',
          message: error instanceof Error ? error.message : 'Failed to initialize watcher.',
        },
      },
      { status: 500 },
    );
  }

  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const write = (payload: string) => {
        if (closed) {
          return;
        }
        controller.enqueue(encoder.encode(payload));
      };

      write(SSE_CONNECTED_FRAME);

      const unsubscribe = issuesEventBus.subscribe(
        (event) => {
          write(toSseFrame(event));
        },
        { projectRoot },
      );

      const heartbeat = setInterval(() => {
        write(SSE_HEARTBEAT_FRAME);
      }, HEARTBEAT_MS);

      const close = () => {
        if (closed) {
          return;
        }

        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        request.signal.removeEventListener('abort', close);
        try {
          controller.close();
        } catch {
          // stream already closed
        }
      };
      cleanup = close;

      request.signal.addEventListener('abort', close);
    },
    cancel() {
      // Called when client closes EventSource/reader.
      // Ensures heartbeat + subscriber cleanup always runs.
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
