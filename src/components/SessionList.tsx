import { GitBranch, MessageSquare, Plus, Settings2, Trash2, Cpu } from 'lucide-react';
import { useStore } from '../state';
import { timeAgo } from '../lib/markdown';

export default function SessionList() {
  const {
    sessions,
    activeSessionId,
    selectSession,
    newSession,
    deleteSession,
    providers,
    setSettingsOpen,
    setMode,
    githubUser,
    newSession: createChat,
  } = useStore();

  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  const configured = providers.filter((provider) => provider.apiKey).length;

  return (
    <div className="sidebar-inner">
      <div className="sidebar-head">
        <span className="sidebar-title">Chats</span>
        <button type="button" className="btn btn-sm" onClick={newSession} title="New chat">
          <Plus size={13} />
          New
        </button>
      </div>

      <div className="session-list">
        {sorted.map((session) => {
          const userMessages = session.messages.filter((message) => message.role === 'user').length;
          return (
            <div
              key={session.id}
              className={`session-row ${session.id === activeSessionId ? 'active' : ''}`}
              onClick={() => selectSession(session.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter') selectSession(session.id);
              }}
            >
              <MessageSquare size={13} className="session-icon" />
              <div className="session-text">
                <span className="session-title">{session.title}</span>
                <span className="session-meta">
                  {userMessages} message{userMessages === 1 ? '' : 's'} · {timeAgo(session.updatedAt)}
                </span>
              </div>
              <button
                type="button"
                className="session-delete"
                title="Delete chat"
                onClick={(event) => {
                  event.stopPropagation();
                  deleteSession(session.id);
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="sidebar-foot">
        <button
          type="button"
          className="sidebar-foot-btn"
          onClick={() => createChat()}
          title="Start a fresh chat"
        >
          <Plus size={13} />
          New chat
        </button>
        <button
          type="button"
          className="sidebar-foot-btn"
          onClick={() => setSettingsOpen(true)}
        >
          <Cpu size={13} />
          {configured} of {providers.length} providers
          <Settings2 size={12} className="foot-gear" />
        </button>
        <button type="button" className="sidebar-foot-btn" onClick={() => setMode('github')}>
          <GitBranch size={13} />
          {githubUser ? `@${githubUser.login}` : 'Connect GitHub'}
        </button>
      </div>
    </div>
  );
}
