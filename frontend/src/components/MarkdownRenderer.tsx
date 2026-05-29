import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm max-w-none">
      {content.split('\n').map((line, i) => (
        <p key={i} className="mb-2">{line}</p>
      ))}
    </div>
  );
}
