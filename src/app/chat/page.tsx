"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  Send,
  ChevronLeft,
  Bot,
  Users,
  Loader2,
} from "lucide-react";
import { Header } from "@/components/layout";

interface Conversation {
  id: string;
  title: string;
  agentId?: string;
  groupId?: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  agentName?: string;
  createdAt: string;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConv, setCurrentConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function loadConversations() {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) setConversations(await res.json());
    } catch (e) {}
  }

  async function loadMessages(convId: string) {
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {}
  }

  const handleSelectConv = async (conv: Conversation) => {
    setCurrentConv(conv);
    await loadMessages(conv.id);
  };

  const handleSend = async () => {
    if (!input.trim() || !currentConv || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    setStreaming("");

    try {
      const isGroup = !!currentConv.groupId;
      const endpoint = isGroup ? "/api/chat/group" : "/api/chat";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: currentConv.id, content }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "token") {
                  full += data.content;
                  setStreaming(full);
                } else if (data.type === "done") {
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: Date.now().toString(),
                      role: "assistant",
                      content: full,
                      createdAt: new Date().toISOString(),
                    },
                  ]);
                  setStreaming("");
                }
              } catch {}
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="聊天" subtitle="与智能体或协作组对话" />

      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r flex flex-col shrink-0">
          <div className="p-3 border-b">
            <span className="text-xs font-semibold text-slate-500">
              对话列表
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400">
                暂无对话
              </div>
            )}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConv(conv)}
                className={`p-3 cursor-pointer border-b hover:bg-emerald-50 transition ${
                  currentConv?.id === conv.id
                    ? "bg-emerald-50 border-l-2 border-l-emerald-500"
                    : ""
                }`}
              >
                <div className="text-sm font-medium text-slate-700 truncate">
                  {conv.title}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {conv.agentId ? "🤖 Agent" : "👥 群组"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {!currentConv ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">选择一个对话开始</p>
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && !streaming && (
                  <div className="text-center py-20 text-slate-400">
                    <div className="text-2xl mb-2">👋</div>
                    <p className="text-sm">开始对话吧</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-xl px-4 py-2.5 ${
                        msg.role === "user"
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {msg.agentName && (
                        <div className="text-xs font-bold text-emerald-600 mb-1">
                          {msg.agentName}
                        </div>
                      )}
                      <div className="text-sm whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
                {streaming && (
                  <div className="flex justify-start">
                    <div className="max-w-[70%] bg-slate-100 border border-emerald-200 rounded-xl px-4 py-2.5">
                      <div className="text-sm text-emerald-700 whitespace-pre-wrap">
                        {streaming}
                        <span className="animate-pulse">▊</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="输入消息..."
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    rows={1}
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !input.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-40"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
