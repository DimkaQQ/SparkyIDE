import { useState } from 'react';
import {
  Check,
  ChevronRight,
  ExternalLink,
  GitBranch,
  Loader2,
  AlertTriangle,
  Wrench,
} from 'lucide-react';
import { describeTool, parseToolArgs } from '../agent/labels';
import type { ToolCall, ToolMessage } from '../types';

interface ToolCardProps {
  call: ToolCall;
  result?: ToolMessage;
  onOpenFile?: (path: string) => void;
}

export function ToolCard({ call, result, onOpenFile }: ToolCardProps) {
  const [open, setOpen] = useState(false);
  const args = parseToolArgs(call);
  const isGitHub = call.name.startsWith('github_');
  const path = typeof args.path === 'string' ? args.path : null;
  const running = !result;
  const failed = result ? !result.ok : false;
  const Icon = isGitHub ? GitBranch : Wrench;
  const output = result?.content ?? '';

  return (
    <div className={`tool-card ${failed ? 'is-error' : ''}`}>
      <button type="button" className="tool-head" onClick={() => setOpen((value) => !value)}>
        <ChevronRight size={12} className={`tool-chevron ${open ? 'open' : ''}`} />
        <span className={`tool-icon ${isGitHub ? 'gh' : ''}`}>
          <Icon size={13} />
        </span>
        <span className="tool-label">{describeTool(call)}</span>
        <span className="tool-status">
          {running ? (
            <Loader2 size={13} className="spin" />
          ) : failed ? (
            <AlertTriangle size={13} className="text-error" />
          ) : (
            <Check size={13} className="text-success" />
          )}
        </span>
      </button>

      {result?.title && !open && <div className="tool-sub">{result.title}</div>}

      {open && (
        <div className="tool-body">
          <div className="tool-section">
            <div className="tool-section-title">Input</div>
            <pre className="tool-pre">{formatJson(args)}</pre>
          </div>
          {result && (
            <div className="tool-section">
              <div className="tool-section-title">
                {failed ? 'Error' : 'Result'}
                {path && onOpenFile && (
                  <button
                    type="button"
                    className="tool-link"
                    onClick={() => onOpenFile(path)}
                  >
                    Open file <ExternalLink size={10} />
                  </button>
                )}
              </div>
              <pre className="tool-pre">{output.length > 6000 ? `${output.slice(0, 6000)}\n…` : output}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatJson(value: Record<string, unknown>): string {
  try {
    const printed = JSON.stringify(value, null, 2);
    return printed.length > 4000 ? `${printed.slice(0, 4000)}\n…` : printed;
  } catch {
    return String(value);
  }
}
