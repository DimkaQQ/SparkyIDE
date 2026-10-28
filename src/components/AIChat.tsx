import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, ChevronDown, Paperclip, X } from 'lucide-react';
import { useAppContext, AIProvider } from '../context';
import { useTheme } from '../ThemeContext';
import { marked } from 'marked';
import { githubTools, executeTool } from '../tools';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
}

export default function AIChat() {
  const { settings, setSettings } = useAppContext();
  const { theme } = useTheme();
  const activeProvider = settings.providers.find((p) => p.id === settings.activeProviderId);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AI assistant in MetaCode IDE. I can help with code, debugging, explanations, and image analysis. Select a provider above and start chatting!",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImages((prev) => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const switchProvider = (providerId: string) => {
    setSettings((prev) => ({ ...prev, activeProviderId: providerId }));
    setShowProviderPicker(false);
  };

  const sendMessage = async () => {
    if (!input.trim() && images.length === 0) return;
    if (!activeProvider) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Please select an AI provider.' }]);
      return;
    }
    if (!activeProvider.apiKey) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `API key for **${activeProvider.name}** is not set. Open settings to add it.` },
      ]);
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      images: images.length > 0 ? [...images] : undefined,
    };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    const currentImages = [...images];
    setInput('');
    setImages([]);
    setIsLoading(true);

    try {
      // Build messages array with tool support
      const apiMessages: any[] = [];
      
      // Add system message with tool instructions
      const hasUserMessage = messages.some(m => m.role === 'user') || currentInput.trim();
      if (hasUserMessage) {
        apiMessages.push({ 
          role: 'system', 
          content: `You are a helpful coding assistant with access to GitHub tools. Format code with \`\`\`language blocks.

Available tools:
- create_repository: Create a new GitHub repository
- push_files: Push multiple files to a GitHub repository
- list_repositories: List all your GitHub repositories
- get_repository_files: Get all files from a repository

When the user asks to push code, create a repo, or manage GitHub, use the appropriate tool.` 
        });
      }
      
      // Add conversation history
      for (const msg of messages) {
        if (msg.role === 'system') continue;
        if (msg.role === 'user' && msg.images && msg.images.length > 0) {
          apiMessages.push({
            role: 'user',
            content: [
              { type: 'text', text: msg.content },
              ...msg.images.map((img) => ({ type: 'image_url', image_url: { url: img } })),
            ],
          });
        } else {
          apiMessages.push({ role: msg.role, content: msg.content });
        }
      }
      
      // Add current message
      if (currentImages.length > 0) {
        apiMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: currentInput || 'Describe this image' },
            ...currentImages.map((img) => ({ type: 'image_url', image_url: { url: img } })),
          ],
        });
      } else if (currentInput.trim()) {
        apiMessages.push({ role: 'user', content: currentInput });
      }

      // Call API with tools
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeProvider.apiKey}`,
        ...activeProvider.headers,
      };

      let response = await fetch(`${activeProvider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: activeProvider.model,
          messages: apiMessages,
          tools: githubTools,
          tool_choice: 'auto',
          max_tokens: 4096,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`${response.status}: ${err}`);
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message;

      // Check if AI wants to use tools
      if (message?.tool_calls && message.tool_calls.length > 0) {
        // Add assistant message with tool calls
        apiMessages.push(message);

        // Execute each tool call
        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);
          
          setMessages((prev) => [
            ...prev,
            { 
              role: 'assistant', 
              content: `🔧 Executing tool: **${toolName}**\n\nArguments: \`\`\`json\n${JSON.stringify(toolArgs, null, 2)}\n\`\`\`` 
            },
          ]);

          const result = await executeTool(
            { name: toolName, arguments: toolArgs },
            settings.githubToken
          );

          // Add tool result
          apiMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result.success ? result.output : `Error: ${result.error}`,
          });

          setMessages((prev) => [
            ...prev,
            { 
              role: 'assistant', 
              content: result.success 
                ? `✅ Tool executed successfully:\n\n${result.output}`
                : `❌ Tool failed: ${result.error}`
            },
          ]);
        }

        // Get final response from AI
        response = await fetch(`${activeProvider.baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: activeProvider.model,
            messages: apiMessages,
            max_tokens: 4096,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          throw new Error(`${response.status}: ${err}`);
        }

        const finalData = await response.json();
        const finalResponse = finalData.choices?.[0]?.message?.content || 'No response.';
        setMessages((prev) => [...prev, { role: 'assistant', content: finalResponse }]);
      } else {
        // No tool calls, just display the response
        const responseText = message?.content || 'No response.';
        setMessages((prev) => [...prev, { role: 'assistant', content: responseText }]);
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error (${activeProvider.name}): ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (content: string) => {
    const html = marked.parse(content, { breaks: true }) as string;
    return <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="toolbar">
        <div className="flex items-center gap-2">
          <Sparkles size={16} style={{ color: 'var(--accent)' }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--text-strong)' }}>
            AI Assistant
          </span>
          <span style={{ color: 'var(--muted)', fontSize: 'var(--text-xs)' }}>
            {activeProvider?.name || 'Select provider'}
          </span>
        </div>

        <div className="flex-1" />

        {/* Provider Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowProviderPicker(!showProviderPicker)}
            className="btn"
            style={{ gap: 'var(--gap)' }}
          >
            <span style={{ fontSize: 'var(--text-sm)' }}>{activeProvider?.icon}</span>
            <span style={{ fontSize: 'var(--text-xs)' }}>{activeProvider?.name.split(' ')[0]}</span>
            <ChevronDown size={14} />
          </button>

          {showProviderPicker && (
            <div
              className="absolute top-full right-0 mt-1 rounded-lg z-50 py-1 animate-fade-in"
              style={{
                width: 280,
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                maxHeight: 400,
                overflowY: 'auto',
              }}
            >
              {settings.providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => switchProvider(provider.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                  style={{
                    background: provider.id === settings.activeProviderId ? 'var(--surface)' : 'transparent',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      provider.id === settings.activeProviderId ? 'var(--surface)' : 'transparent')
                  }
                >
                  <span style={{ fontSize: 'var(--text-md)' }}>{provider.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {provider.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                      {provider.model}
                    </p>
                  </div>
                  <div
                    className="status-dot"
                    style={{ background: provider.apiKey ? 'var(--success)' : 'var(--error)' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message-bubble ${msg.role}`}>
            {msg.role === 'user' && msg.images && msg.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {msg.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt="uploaded"
                    className="max-w-[200px] max-h-[150px] rounded"
                    style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                  />
                ))}
              </div>
            )}
            {msg.role === 'user' ? (
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            ) : (
              <div className="text-sm">{renderMessage(msg.content)}</div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="message-bubble assistant">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-spin"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    animationDelay: `${i * 150}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                <img
                  src={img}
                  alt="preview"
                  className="rounded"
                  style={{
                    width: 64,
                    height: 64,
                    objectFit: 'cover',
                    border: '1px solid var(--border)',
                  }}
                />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="btn-icon absolute -top-1 -right-1"
                  style={{
                    width: 20,
                    height: 20,
                    background: 'var(--error)',
                    color: '#ffffff',
                    borderRadius: '50%',
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-icon"
            title="Upload image"
          >
            <Paperclip size={16} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={`Ask ${activeProvider?.name?.split(' ')[0] || 'AI'}...`}
            className="input flex-1"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || (!input.trim() && images.length === 0)}
            className="btn-primary"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
