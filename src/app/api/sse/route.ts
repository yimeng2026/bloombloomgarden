import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  let timer: any = null;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("data: {\"type\":\"connected\"}\n\n"));
      timer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: {"type":"ping","time":${Date.now()}}\n\n`));
        } catch (e) {
          clearInterval(timer);
        }
      }, 30000);
    },
    cancel() {
      clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
