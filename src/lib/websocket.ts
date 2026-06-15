import { prisma } from "@/lib/prisma";

/**
 * WebSocket + Broadcast Channel — 实时消息推送
 * 
 * Next.js 原生不支持 WebSocket，但可以通过以下方式实现：
 * 1. 开发环境：使用原生 ws 模块（独立端口）
 * 2. 生产环境：使用 Redis Pub/Sub + Server-Sent Events  fallback
 * 
 * 本文件导出 WebSocket 广播工具，供 API 路由调用推送消息。
 */

let wss: any = null;

export function initWebSocket(port = 3001) {
  if (wss) return wss;
  try {
    const { WebSocketServer } = require("ws");
    wss = new WebSocketServer({ port });
    wss.on("connection", (ws: any) => {
      ws.on("message", (data: any) => {
        try {
          const msg = JSON.parse(data.toString());
          broadcast(msg);
        } catch (e) {}
      });
      ws.send(JSON.stringify({ type: "connected", time: Date.now() }));
    });
    console.log(`WebSocket server running on ws://localhost:${port}`);
  } catch (e) {
    console.log("ws module not available, using BroadcastChannel fallback");
  }
  return wss;
}

export function broadcast(data: any) {
  const msg = JSON.stringify(data);
  if (wss) {
    wss.clients?.forEach((client: any) => {
      if (client.readyState === 1) client.send(msg);
    });
  }
  try {
    const bc = new BroadcastChannel("bloombloomgarden");
    bc.postMessage(msg);
    bc.close();
  } catch (e) {}
}

export async function emitEvent(type: string, payload: any) {
  try {
    await prisma.activityLog.create({
      data: {
        title: type,
        description: JSON.stringify(payload),
        type: payload.type || "system",
        status: payload.status || "info",
        source: payload.source || "websocket",
      },
    });
  } catch (e) {}
  broadcast({ type, payload, time: Date.now() });
}
