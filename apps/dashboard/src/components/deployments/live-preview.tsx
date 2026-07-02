'use client';

import { useState } from 'react';
import { Card, Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { ExternalLinkIcon, RefreshIcon } from '@hugeicons/core-free-icons';

interface LivePreviewProps {
  url: string;
}

export function LivePreview({ url }: LivePreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  function reloadPreview() {
    setIframeKey(k => k + 1);
  }

  return (
    <Card className="border border-[var(--rail)] p-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 px-4 py-3 border-b border-[var(--rail)]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--success)] flex-shrink-0 animate-pulse" />
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Live preview</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--accent)] hover:text-[var(--accent)] truncate font-mono"
          >
            {url.replace(/^https?:\/\//, '')}
          </a>
        </div>
        <PreviewControls
          expanded={expanded}
          url={url}
          onToggle={() => setExpanded(v => !v)}
          onReload={reloadPreview}
        />
      </div>

      {expanded && (
        <PreviewFrame url={url} iframeKey={iframeKey} />
      )}
    </Card>
  );
}

function PreviewControls({
  expanded,
  url,
  onToggle,
  onReload,
}: {
  expanded: boolean;
  url: string;
  onToggle: () => void;
  onReload: () => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      {expanded && (
        <>
          <button
            onClick={onReload}
            className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--text-muted)] hover:bg-[var(--hover)] transition-colors"
            title="Reload preview"
          >
            <HugeiconsIcon icon={RefreshIcon} size={14} />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--text-muted)] hover:bg-[var(--hover)] transition-colors"
            title="Open in new tab"
          >
            <HugeiconsIcon icon={ExternalLinkIcon} size={14} />
          </a>
        </>
      )}
      <Button variant={expanded ? 'secondary' : 'primary'} size="sm" onClick={onToggle}>
        {expanded ? 'Hide' : 'Preview'}
      </Button>
    </div>
  );
}

function PreviewFrame({ url, iframeKey }: { url: string; iframeKey: number }) {
  return (
    <div className="relative bg-white" style={{ height: 'min(50vh, 400px)' }}>
      <iframe
        key={iframeKey}
        src={url}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        title="Deployment preview"
        loading="lazy"
      />
    </div>
  );
}
