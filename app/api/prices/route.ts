import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  let intervalId: NodeJS.Timeout;

  const stream = new ReadableStream({
    start(controller) {
      intervalId = setInterval(() => {
        // Mock live price tick data
        const update = {
          symbol: "BTCUSD",
          lastPrice: Math.floor(Math.random() * 1000) + 60000,
          updatedAt: new Date().toISOString(),
        };

        // Check request signal before enqueuing to prevent closed controller errors
        if (req.signal.aborted) {
          clearInterval(intervalId);
          return;
        }

        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(update)}\n\n`),
          );
        } catch (e) {
          // If controller is already closed, clear timer gracefully
          clearInterval(intervalId);
        }
      }, 2000);
    },
    cancel() {
      // Triggered automatically when client closes connection or navigates away
      if (intervalId) clearInterval(intervalId);
    },
  });

  // Handle client disconnect signal directly
  req.signal.addEventListener("abort", () => {
    if (intervalId) clearInterval(intervalId);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
