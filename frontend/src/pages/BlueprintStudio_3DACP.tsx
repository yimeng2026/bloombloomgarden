import React from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function BlueprintStudio() {
  const { blueprintId } = useParams();
  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex-1 p-6">
        <h1 className="text-xl font-bold text-white mb-4">蓝图编排工作室</h1>
        {blueprintId && <p className="text-gray-500">当前蓝图: {blueprintId}</p>}
        <div className="mt-8 p-8 bg-[#12121a] border border-gray-800 rounded-xl text-center text-gray-500">
          <p>拖拽节点以编排Agent流水线</p>
          <p className="text-sm mt-2">支持 sequential / parallel / hierarchical 三种执行模式</p>
        </div>
      </div>
    </div>
  );
}
