"use client";

import { useState, useEffect } from "react";
import {
  Link, Globe, MessageSquare, Users, Clock, RefreshCw, Plus,
  CheckCircle, XCircle, PauseCircle, Play, ChevronDown, ChevronUp,
  Search, Trash2, Settings, MessageCircle, Send, Hash, Mail, Terminal,
  Video, Building, Radio, Cloud
} from "lucide-react";
import { Header } from "@/components/layout";
import { StatsCard } from "@/components/dashboard/StatsCard";

interface ChannelItem {
  id: string; name: string; type: string;
  status: "connected" | "disconnected" | "not_installed";
  messageCount: number; lastActive: string; users: number;
  config: Record<string, string>; category: string;
}

const channels: ChannelItem[] = [
  { id: "c1", name: "WhatsApp", type: "whatsapp", status: "connected", messageCount: 342, lastActive: "刚刚", users: 12, config: { phone: "+86-***-****" }, category: "即时通讯" },
  { id: "c2", name: "Telegram", type: "telegram", status: "connected", messageCount: 156, lastActive: "2分钟前", users: 8, config: { botToken: "***" }, category: "即时通讯" },
  { id: "c3", name: "Discord", type: "discord", status: "connected", messageCount: 89, lastActive: "5分钟前", users: 24, config: { serverId: "***" }, category: "即时通讯" },
  { id: "c4", name: "Slack", type: "slack", status: "connected", messageCount: 203, lastActive: "1分钟前", users: 15, config: { workspace: "***" }, category: "即时通讯" },
  { id: "c5", name: "微信", type: "wechat", status: "connected", messageCount: 412, lastActive: "刚刚", users: 45, config: { appId: "***" }, category: "即时通讯" },
  { id: "c6", name: "飞书", type: "feishu", status: "connected", messageCount: 67, lastActive: "10分钟前", users: 6, config: { appId: "***" }, category: "办公协作" },
  { id: "c7", name: "钉钉", type: "dingtalk", status: "disconnected", messageCount: 0, lastActive: "2小时前", users: 0, config: { appKey: "***" }, category: "办公协作" },
  { id: "c8", name: "企业微信", type: "wecom", status: "not_installed", messageCount: 0, lastActive: "—", users: 0, config: {}, category: "办公协作" },
  { id: "c9", name: "QQ", type: "qq", status: "not_installed", messageCount: 0, lastActive: "—", users: 0, config: {}, category: "即时通讯" },
  { id: "c10", name: "Gmail", type: "gmail", status: "connected", messageCount: 34, lastActive: "15分钟前", users: 1, config: { email: "***@gmail.com" }, category: "邮件社交" },
  { id: "c11", name: "Signal", type: "signal", status: "not_installed", messageCount: 0, lastActive: "—", users: 0, config: {}, category: "即时通讯" },
  { id: "c12", name: "Matrix", type: "matrix", status: "disconnected", messageCount: 12, lastActive: "1天前", users: 3, config: { server: "matrix.org" }, category: "邮件社交" },
  { id: "c13", name: "LINE", type: "line", status: "not_installed", messageCount: 0, lastActive: "—", users: 0, config: {}, category: "即时通讯" },
  { id: "c14", name: "Twitch", type: "twitch", status: "not_installed", messageCount: 0, lastActive: "—", users: 0, config: {}, category: "媒体其他" },
  { id: "c15", name: "IRC", type: "irc", status: "disconnected", messageCount: 56, lastActive: "3天前", users: 5, config: { server: "irc.libera.chat" }, category: "邮件社交" },
  { id: "c16", name: "Teams", type: "teams", status: "not_installed", messageCount: 0, lastActive: "—", users: 0, config: {}, category: "办公协作" },
  { id: "c17", name: "Zalo", type: "zalo", status: "not_installed", messageCount: 0, lastActive: "—", users: 0, config: {}, category: "即时通讯" },
  { id: "c18", name: "Nostr", type: "nostr", status: "not_installed", messageCount: 0, lastActive: "—", users: 0, config: {}, category: "邮件社交" },
  { id: "c19", name: "Nextcloud Talk", type: "nextcloud", status: "not_installed", messageCount: 0, lastActive: "—", users: 0, config: {}, category: "媒体其他" },
  { id: "c20", name: "WebChat", type: "webchat", status: "connected", messageCount: 128, lastActive: "刚刚", users: 6, config: { url: "http://localhost:3000" }, category: "媒体其他" },
];

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  connected: { color: "text-emerald-600", bg: "bg-emerald-50", label: "已连接", icon: CheckCircle },
  disconnected: { color: "text-amber-600", bg: "bg-amber-50", label: "已断开", icon: PauseCircle },
  not_installed: { color: "text-slate-400", bg: "bg-slate-100", label: "未安装", icon: XCircle },
};

const categoryColors: Record<string, string> = {
  "即时通讯": "bg-blue-50 text-blue-600",
  "办公协作": "bg-violet-50 text-violet-600",
  "邮件社交": "bg-amber-50 text-amber-600",
  "媒体其他": "bg-rose-50 text-rose-600",
};

export default function ChannelsPage() {
  const [channelList, setChannelList] = useState<ChannelItem[]>(channels);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTimeout(() => setLoading(false), 400); }, []);

  const toggleConnect = (id: string) => {
    setChannelList((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const next = c.status === "connected" ? "disconnected" : c.status === "disconnected" ? "connected" : "connected";
      return { ...c, status: next, lastActive: next === "connected" ? "刚刚" : c.lastActive };
    }));
  };

  const filtered = channelList.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.status === filter;
    return matchSearch && matchFilter;
  });

  const grouped = filtered.reduce((acc, c) => {
    acc[c.category] = acc[c.category] || [];
    acc[c.category].push(c);
    return acc;
  }, {} as Record<string, ChannelItem[]>);

  const connectedCount = channelList.filter((c) => c.status === "connected").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="通道管理" subtitle={`${connectedCount} 已连接 · ${channelList.length} 个平台`} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="已连接通道" value={connectedCount.toString()} change={8.3} icon={Link} color="bg-emerald-500" />
            <StatsCard title="在线平台" value="5" change={2.1} icon={Globe} color="bg-blue-500" />
            <StatsCard title="今日消息" value="1.2K" change={12.5} icon={MessageSquare} color="bg-amber-500" />
            <StatsCard title="活跃会话" value="23" change={5.7} icon={Users} color="bg-violet-500" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索通道..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
            <div className="flex items-center gap-1">
              {["all", "connected", "disconnected", "not_installed"].map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filter === f ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                  {f === "all" ? "全部" : f === "connected" ? "已连接" : f === "disconnected" ? "已断开" : "未安装"}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20"><RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" /><p className="text-slate-500">加载中...</p></div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([category, list]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[category] || "bg-slate-100 text-slate-500"}`}>{category}</span>
                    <span className="text-slate-400 font-normal">{list.length} 个</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {list.map((channel) => {
                      const sc = statusConfig[channel.status];
                      const StatusIcon = sc.icon;
                      const isExpanded = expandedId === channel.id;
                      return (
                        <div key={channel.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${sc.bg}`}>
                                  <StatusIcon className={`w-4 h-4 ${sc.color}`} />
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold text-slate-800">{channel.name}</h4>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => toggleConnect(channel.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 transition-colors" title={channel.status === "connected" ? "断开" : "连接"}>
                                  {channel.status === "connected" ? <XCircle size={14} /> : <Play size={14} />}
                                </button>
                                <button onClick={() => setExpandedId(isExpanded ? null : channel.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              <span className="flex items-center gap-1"><MessageSquare size={10} /> {channel.messageCount}</span>
                              <span className="flex items-center gap-1"><Users size={10} /> {channel.users}</span>
                              <span className="flex items-center gap-1"><Clock size={10} /> {channel.lastActive}</span>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                              <p className="text-xs font-medium text-slate-600 mb-2">配置</p>
                              {Object.entries(channel.config).map(([k, v]) => (
                                <div key={k} className="flex items-center gap-2 mb-1.5">
                                  <span className="text-xs text-slate-400 w-20">{k}</span>
                                  <input defaultValue={v} className="flex-1 px-2 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-300" />
                                </div>
                              ))}
                              {Object.keys(channel.config).length === 0 && <p className="text-xs text-slate-400">暂无配置</p>}
                              <div className="flex items-center gap-2 mt-3">
                                <button className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600">保存配置</button>
                                <button className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs"><Trash2 size={12} /></button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
