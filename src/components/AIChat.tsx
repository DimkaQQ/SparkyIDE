import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, ChevronDown, Paperclip, Image as ImageIcon } from 'lucide-react';
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
      content: '👋 **Привет!** Я AI-ассистент в MetaCode IDE.\n\nЯ могу помочь тебе с:\n- 📝 Написанием кода\n- 🐛 Дебагом\n- 📖 Объяснением концепций\n- 🖼️ Анализом изображений\n\nВыбери провайдера и начни общение!',
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
      { role: 'system', content: 'You are a helpful coding assistant. Format code with ```language blocks. Be concise but thorough.' },
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
              return { type: 'image', source: { type: 'base64', media_type: mediaType,  base64 } };
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
            return { type: 'image', source: { type: 'base64', media_type: mediaType,  base64 } };
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
          parts.push({ inline_data: { mime_type: mimeType,  base64 } });
        }
      }
      contents.push({ role, parts });
    }
    if (imgs.length > 0) {
      const parts: any[] = [{ text: userInput || 'Describe this image' }];
      for (const img of imgs) {
        const base64 = img.split(',')[1];
        const mimeType = img.split(';')[0].split(':')[1];
        parts.push({ inline_data: { mime_type: mimeType,  base64 } });
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
      setMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ Выбери AI-провайдер!' }]);
      return;
    }
    if (!activeProvider.apiKey) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ API ключ для **${activeProvider.name}** не установлен. Открой настройки (⚙️).` },
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
        { role: 'assistant', content: `❌ **Ошибка** (${activeProvider.name}): ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (content: string) => {
    const html = marked.parse(content, { breaks: true }) as string;
    return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Header */}
      <div
        className="h-16 flex items-center px-6 gap-4 border-b relative z-10"
        style={{
          background: 'var(--bg-glass)',
          borderColor: 'var(--border-primary)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-glow"
          style={{ background: `${activeProvider?.color || '#8b5cf6'}20`, border: `1px solid ${activeProvider?.color || '#8b5cf6'}40` }}
        >
          <Sparkles size={20} style={{ color: activeProvider?.color || '#8b5cf6' }} />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            AI Assistant
          </h2>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            {activeProvider?.name || 'Select a provider'}
          </p>
        </div>

        {/* Provider Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowProviderPicker(!showProviderPicker)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm transition-all duration-300 hover:scale-105"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-secondary)',
              color: 'var(--text-primary)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <span className="text-base">{activeProvider?.icon}</span>
            <span className="text-xs font-semibold">{activeProvider?.name.split(' ')[0]}</span>
            <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
          </button>

          {showProviderPicker && (
            <div
              className="absolute top-full right-0 mt-3 rounded-2xl shadow-glow-strong z-50 w-80 py-3 max-h-96 overflow-y-auto animate-scale-in"
              style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-secondary)',
                backdropFilter: 'blur(30px) saturate(180%)',
                WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              }}
            >
              <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                AI Providers
              </div>
              {settings.providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => switchProvider(provider.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 text-left"
                  style={{
                    background: provider.id === settings.activeProviderId ? 'var(--bg-tertiary)' : 'transparent',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      provider.id === settings.activeProviderId ? 'var(--bg-tertiary)' : 'transparent')
                  }
                >
                  <span className="text-xl">{provider.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {provider.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {provider.model}
                    </p>
                  </div>
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: provider.apiKey ? 'var(--success)' : 'var(--error)' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ background: 'transparent' }}>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-4 animate-fade-in ${msg.role === 'user' ? 'justify-end' : ''}`}
          >
            {msg.role === 'assistant' && (
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-glow"
                style={{
                  background: `${activeProvider?.color || '#8b5cf6'}15`,
                  border: `1px solid ${activeProvider?.color || '#8b5cf6'}30`,
                }}
              >
                <Bot size={20} style={{ color: activeProvider?.color || '#8b5cf6' }} />
              </div>
            )}
            <div
              className={`max-w-[70%] rounded-2xl px-6 py-4 ${
                msg.role === 'user' ? '' : ''
              }`}
              style={
                msg.role === 'user'
                  ? {
                      background: 'var(--accent-gradient)',
                      color: 'white',
                      boxShadow: 'var(--shadow-lg), var(--accent-glow)',
                    }
                  : {
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border-secondary)',
                      color: 'var(--text-primary)',
                      backdropFilter: 'blur(20px)',
                      boxShadow: 'var(--shadow-md)',
                    }
              }
            >
              {msg.role === 'user' ? (
                <div>
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-4">
                      {msg.images.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt="uploaded"
                          className="max-w-[220px] max-h-[160px] rounded-xl border-2 border-white/20"
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">{msg.content}</p>
                </div>
              ) : (
                <div className="text-sm">{renderMessage(msg.content)}</div>
              )}
            </div>
            {msg.role === 'user' && (
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-secondary)',
                }}
              >
                <User size={20} style={{ color: 'var(--text-accent)' }} />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 animate-fade-in">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-glow"
              style={{
                background: `${activeProvider?.color || '#8b5cf6'}15`,
                border: `1px solid ${activeProvider?.color || '#8b5cf6'}30`,
              }}
            >
              <Loader2 size={20} className="animate-spin" style={{ color: activeProvider?.color || '#8b5cf6' }} />
            </div>
            <div
              className="rounded-2xl px-6 py-5"
              style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-secondary)',
                backdropFilter: 'blur(20px)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full animate-bounce"
                    style={{
                      background: activeProvider?.color || '#8b5cf6',
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
        className="p-5 border-t relative z-10"
        style={{
          background: 'var(--bg-glass)',
          borderColor: 'var(--border-primary)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        {images.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-4">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                <img
                  src={img}
                  alt="preview"
                  className="w-20 h-20 object-cover rounded-xl border-2"
                  style={{ borderColor: 'var(--border-secondary)' }}
                />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                  style={{ background: 'var(--error)' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-xl transition-all duration-300 hover:scale-105"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-secondary)',
            }}
            title="Upload image"
          >
            <Paperclip size={20} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={`Ask ${activeProvider?.name?.split(' ')[0] || 'AI'} anything...`}
            className="input-field flex-1"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || (!input.trim() && images.length === 0)}
            className="p-3.5 rounded-xl text-white transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 gradient-bg shadow-glow"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
