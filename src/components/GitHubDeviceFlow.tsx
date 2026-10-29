import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Copy, Github, Loader2, X } from 'lucide-react';
import {
  DeviceFlowError,
  startDeviceFlow,
  waitForAccessToken,
  type DeviceAuthorization,
} from '../github-oauth';

interface GitHubDeviceFlowProps {
  onToken: (token: string) => void;
  onError?: (message: string) => void;
}

/**
 * One-click-ish GitHub sign-in: GitHub shows a short code, the developer
 * approves it on github.com, and no personal access token needs to be copied.
 */
export default function GitHubDeviceFlow({ onToken, onError }: GitHubDeviceFlowProps) {
  const [authorization, setAuthorization] = useState<DeviceAuthorization | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const fail = (message: string) => {
    setError(message);
    onError?.(message);
  };

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setAuthorization(null);
  };

  const start = async () => {
    setError('');
    setStarting(true);
    setCopied(false);
    try {
      const next = await startDeviceFlow();
      setAuthorization(next);
      const controller = new AbortController();
      abortRef.current = controller;
      const token = await waitForAccessToken(next, { signal: controller.signal });
      abortRef.current = null;
      setAuthorization(null);
      onToken(token);
    } catch (caught) {
      if (caught instanceof DeviceFlowError && caught.code === 'cancelled') {
        setError('');
      } else {
        fail(caught instanceof Error ? caught.message : 'GitHub sign-in failed.');
      }
      setAuthorization(null);
    } finally {
      setStarting(false);
    }
  };

  const copyCode = async () => {
    if (!authorization) return;
    try {
      await navigator.clipboard.writeText(authorization.userCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the code stays visible, so copying is only a convenience */
    }
  };

  if (authorization) {
    return (
      <div className="device-flow">
        <div className="device-flow-row">
          <span className="device-flow-label">Enter this code on GitHub</span>
          <span className="device-flow-code">{authorization.userCode}</span>
          <button type="button" className="btn btn-sm" onClick={() => void copyCode()}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <a
          className="btn btn-sm"
          href={authorization.verificationUri}
          target="_blank"
          rel="noreferrer"
        >
          Open github.com/login/device <ArrowUpRight size={11} />
        </a>
        <div className="device-flow-status">
          <Loader2 size={12} className="spin" />
          Waiting for approval… (expires in {Math.round(authorization.expiresIn / 60)} min)
          <button type="button" className="btn btn-sm" onClick={cancel}>
            <X size={11} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="device-flow-start">
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => void start()}
        disabled={starting}
      >
        {starting ? <Loader2 size={13} className="spin" /> : <Github size={13} />}
        {starting ? 'Talking to GitHub…' : 'Sign in with GitHub'}
      </button>
      {error && (
        <div className="notice error">
          <X size={13} /> {error}
        </div>
      )}
    </div>
  );
}
