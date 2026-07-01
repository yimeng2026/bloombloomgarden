"use client";

import { useState, useMemo } from "react";
import {
  researchNotes, modules, papers, type ResearchNote
} from "../data";

// ==================== 辅助组件 ====================

function NoteCard({ note, onClick }: { note: ResearchNote; onClick: () => void }) {
  const relatedModule = modules.find(m => m.id === note.relatedModule);
  const relatedPaper = papers.find(p => p.id === note.relatedPaper);

  return (
    <button onClick={onClick} className="text-left bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-violet-200 hover:shadow-md transition w-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm text-gray-800">{note.title}</h3>
        <span className="text-xs text-gray-400">{new Date(note.updatedAt).toLocaleDateString("zh-CN")}</span>
      </div>
      <p className="text-sm text-gray-600 line-clamp-3 mb-3">{note.content}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {note.tags.map(tag => (
          <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700">{tag}</span>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
        {relatedModule && <span>📦 {relatedModule.name}</span>}
        {relatedPaper && <span>📄 {relatedPaper.title}</span>}
      </div>
    </button>
  );
}

function NoteEditor({ note, onSave, onCancel }: { note: ResearchNote | null; onSave: (n: ResearchNote) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [tags, setTags] = useState(note?.tags.join(", ") || "");
  const [relatedModule, setRelatedModule] = useState(note?.relatedModule || "");
  const [relatedPaper, setRelatedPaper] = useState(note?.relatedPaper || "");

  const handleSave = () => {
    const now = new Date().toISOString().split("T")[0];
    onSave({
      id: note?.id || `note-${Date.now()}`,
      title: title || "无标题笔记",
      content,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      relatedModule: relatedModule || undefined,
      relatedPaper: relatedPaper || undefined,
      createdAt: note?.createdAt || now,
      updatedAt: now,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">{note ? "编辑笔记" : "新建笔记"}</h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">标题</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
              placeholder="笔记标题..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">内容</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 resize-none"
              placeholder="笔记内容..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">标签（逗号分隔）</label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
              placeholder="集合论, 力迫法, CH..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">关联模块</label>
              <select
                value={relatedModule}
                onChange={e => setRelatedModule(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="">-- 选择模块 --</option>
                {modules.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">关联论文</label>
              <select
                value={relatedPaper}
                onChange={e => setRelatedPaper(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="">-- 选择论文 --</option>
                {papers.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">取消</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm hover:bg-violet-400 transition">保存</button>
        </div>
      </div>
    </div>
  );
}

// ==================== 主页面 ====================

export default function WorkspacePage() {
  const [notes, setNotes] = useState<ResearchNote[]>(researchNotes);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [editingNote, setEditingNote] = useState<ResearchNote | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(n => n.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchSearch = search === "" || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
      const matchTag = selectedTag === "all" || n.tags.includes(selectedTag);
      return matchSearch && matchTag;
    });
  }, [notes, search, selectedTag]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach(n => n.tags.forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return counts;
  }, [notes]);

  const handleSave = (note: ResearchNote) => {
    setNotes(prev => {
      const idx = prev.findIndex(n => n.id === note.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = note;
        return next;
      }
      return [note, ...prev];
    });
    setShowEditor(false);
    setEditingNote(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("确定删除此笔记？")) {
      setNotes(prev => prev.filter(n => n.id !== id));
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📝 研究协作空间</h1>
          <p className="text-sm text-gray-500 mt-1">研究笔记、想法与关联</p>
        </div>
        <button
          onClick={() => { setEditingNote(null); setShowEditor(true); }}
          className="px-4 py-2 bg-violet-500 text-white rounded-lg text-sm hover:bg-violet-400 transition"
        >
          + 新建笔记
        </button>
      </div>

      {/* 标签云 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <h2 className="text-sm font-bold text-gray-700 mb-3">🏷️ 标签云</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${selectedTag === "all" ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            全部 ({notes.length})
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${selectedTag === tag ? "bg-violet-500 text-white" : "bg-violet-50 text-violet-700 hover:bg-violet-100"}`}
            >
              {tag} ({tagCounts[tag]})
            </button>
          ))}
        </div>
      </div>

      {/* 搜索 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <input
          type="text"
          placeholder="搜索笔记标题或内容..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
        />
        <div className="text-xs text-gray-500 mt-2">共 {filteredNotes.length} 篇笔记</div>
      </div>

      {/* 笔记列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNotes.map(note => (
          <div key={note.id} className="relative group">
            <NoteCard note={note} onClick={() => { setEditingNote(note); setShowEditor(true); }} />
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-rose-500 text-xs px-2 py-1"
            >
              🗑️
            </button>
          </div>
        ))}
        {filteredNotes.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-400">
            <div className="text-3xl mb-2">📝</div>
            <div className="text-sm">没有匹配的笔记</div>
            <div className="text-xs mt-1">尝试调整搜索或筛选条件</div>
          </div>
        )}
      </div>

      {/* 编辑器弹窗 */}
      {showEditor && (
        <NoteEditor
          note={editingNote}
          onSave={handleSave}
          onCancel={() => { setShowEditor(false); setEditingNote(null); }}
        />
      )}
    </div>
  );
}
