import React from 'react'
import { useState } from 'react';
import { ChevronDown, ChevronUp, Wrench, CheckCircle, Loader2, XCircle, Clock, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToolCall {
  id: string;
  toolName: string;
  agent: string;
  params: string;
  result: string;
  duration: string;
  status: 'success' | 'running' | 'failed' | 'pending';
  timestamp: string;
}

const statusCfg: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  success: { color: '#7fb89f', bg: 'rgba(127,184,159,0.15)', icon: CheckCircle, label: '成功' },
  running: { color: '#d4a373', bg: 'rgba(212,163,115,0.15)', icon: Loader2, label: '进行中' },
  failed: { color: '#b85c5c', bg: 'rgba(184,92,92,0.15)', icon: XCircle, label: '失败' },
  pending: { color: '#8f9a7d', bg: 'rgba(143,154,125,0.15)', icon: Clock, label: '等待中' },
};

export default function ToolCallsPanel() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-2" style={{ maxHeight: 540, overflowY: 'auto', paddingRight: 4 }}>
      <div className="text-sm text-center py-8" style={{ color: 'var(--sage-400)' }}>
        暂无工具调用记录
      </div>
    </div>
  );
}
