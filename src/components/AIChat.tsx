import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, ChevronDown, Paperclip, X } from 'lucide-react';
import { useAppContext, AIProvider } from '../context';
import { useTheme } from '../ThemeContext';
import { marked } from 'marked';

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

  // === API Call Functions ===
  const callOpenAICompatible = async (provider: AIProvider, msgs: Message[], imgs: string[], userInput: string) => {
    const apiMessages: any[] = [
      { role: 'system', content: 'You are a helpful coding assistant. Format code with ```language blocks.' },
    ];
    for (const msg of msgs) {
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
    if (imgs.length > 0) {
      apiMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: userInput || 'Describe this image' },
          ...imgs.map((img) => ({ type: 'image_url', image_url: { url: img } })),
        ],
      });
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
      ...provider.headers,
    };
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: provider.model, messages: apiMessages, max_tokens: 4096, temperature: 0.7 }),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`${response.status}: ${err}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response.';
  };

  const callAnthropic = async (provider: AIProvider, msgs: Message[], imgs: string[], userInput: string) => {
    const apiMessages: any[] = [];
    for (const msg of msgs) {
      if (msg.role === 'system') continue;
      if (msg.role === 'user' && msg.images && msg.images.length > 0) {
        apiMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: msg.content },
            ...msg.images.map((img) => {
              const base64 = img.split(',')[1];
              const mediaType = img.split(';')[0].split(':')[1];
              return { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };
            }),
          ],
        });
      } else {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }
    if (imgs.length > 0) {
      apiMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: userInput || 'Describe this image' },
          ...imgs.map((img) => {
            const base64 = img.split(',')[1];
            const mediaType = img.split(';')[0].split(':')[1];
            return { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };
          }),
        ],
      });
    }
    const response = await fetch(`${provider.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        ...provider.headers,
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 4096,
        system: 'You are a helpful coding assistant. Format code with ```language blocks.',
        messages: apiMessages,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`${response.status}: ${err}`);
    }
    const data = await response.json();
    return data.content?.[0]?.text || 'No response.';
  };

  const callGemini = async (provider: AIProvider, msgs: Message[], imgs: string[], userInput: string) => {
    const contents: any[] = [];
    for (const msg of msgs) {
      if (msg.role === 'system') continue;
      const role = msg.role === 'assistant' ? 'model' : 'user';
      const parts: any[] = [{ text: msg.content }];
      if (msg.images && msg.images.length > 0) {
        for (const img of msg.images) {
          const base64 = img.split(',')[1];
          const mimeType = img.split(';')[0].split(':')[1];
          parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
        }
      }
      contents.push({ role, parts });
    }
    if (imgs.length > 0) {
      const parts: any[] = [{ text: userInput || 'Describe this image' }];
      for (const img of imgs) {
        const base64 = img.split(',')[1];
        const mimeType = img.split(';')[0].split(':')[1];
        parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
      }
      contents.push({ role: 'user', parts });
    }
    const url = `${provider.baseUrl}/models/${provider.model}:generateContent?key=${provider.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: 'You are a helpful coding assistant.' }] },
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`${response.status}: ${err}`);
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
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
      let response: string;
      switch (activeProvider.format) {
        case 'anthropic':
          response = await callAnthropic(activeProvider, messages, currentImages, currentInput);
          break;
        case 'gemini':
          response = await callGemini(activeProvider, messages, currentImages, currentInput);
          break;
        default:
          response = await callOpenAICompatible(activeProvider, messages, currentImages, currentInput);
          break;
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="toolbar"
        style={{
          background: 'var(--panel)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={16} style={{ color: 'var(--accent)' }} />
          <span className="font-semibold" style={{ color: 'var(--text-strong)', fontSize: 'var(--text-sm)' }}>
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
              className="absolute top-full right-0 mt-1 rounded-lg shadow-lg z-50 py-1 animate-fade-in"
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ background: 'var(--bg)' }}>
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <Bot size={18} style={{ color: 'var(--accent)' }} />
              </div>
            )}
            <div
              className="max-w-[70%] rounded-lg px-4 py-3"
              style={{
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--panel)',
                color: msg.role === 'user' ? '#ffffff' : 'var(--text)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
              }}
            >
              {msg.role === 'user' ? (
                <div>
                  {msg.images && msg.images.length > 0 && (
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
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              ) : (
                <div className="text-sm">{renderMessage(msg.content)}</div>
              )}
            </div>
            {msg.role === 'user' && (
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <User size={18} style={{ color: 'var(--text)' }} />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 animate-fade-in">
            <div
              className="flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
            <div
              className="rounded-lg px-4 py-3"
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
              }}
            >
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
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        className="p-3"
        style={{
          background: 'var(--panel)',
          borderTop: '1px solid var(--border)',
        }}
      >
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
