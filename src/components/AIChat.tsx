import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, Image, ChevronDown } from 'lucide-react';
import { useAppContext, AIProvider } from '../context';
import { marked } from 'marked';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
}

export default function AIChat() {
  const { settings, setSettings } = useAppContext();
  const activeProvider = settings.providers.find((p) => p.id === settings.activeProviderId);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '👋 Привет! Я AI-ассистент. Я могу работать с любым провайдером — Claude, GPT, Gemini, Llama и другими. Выбери провайдера сверху и задавай вопросы! Можно загружать фото для анализа.',
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

  // === API Call Functions for different providers ===

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

    // Add current message with images if any
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
      body: JSON.stringify({
        model: provider.model,
        messages: apiMessages,
        max_tokens: 4096,
        temperature: 0.7,
      }),
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
        system: 'You are a helpful coding assistant. Format code with ```language blocks. Be concise but thorough.',
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
        systemInstruction: { parts: [{ text: 'You are a helpful coding assistant. Format code with ```language blocks. Be concise but thorough.' }] },
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
        { role: 'assistant', content: `⚠️ API ключ для ${activeProvider.name} не установлен. Открой настройки (⚙️) и добавь ключ.` },
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
        {
          role: 'assistant',
          content: `❌ Ошибка (${activeProvider.name}): ${error.message}\n\nПроверь API ключ и настройки провайдера.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (content: string) => {
    const html = marked.parse(content, { breaks: true }) as string;
    return <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const configuredProviders = settings.providers.filter((p) => p.apiKey);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with Provider Picker */}
      <div className="h-12 bg-[#181825] border-b border-[#313244] flex items-center px-4 gap-2">
        <Sparkles size={18} className="text-purple-400" />
        <span className="font-medium text-sm">AI Assistant</span>

        {/* Provider Switcher */}
        <div className="relative ml-3">
          <button
            onClick={() => setShowProviderPicker(!showProviderPicker)}
            className="flex items-center gap-1.5 bg-[#313244] px-3 py-1.5 rounded-lg text-sm hover:bg-[#45475a] transition-colors"
            style={{ borderLeft: `3px solid ${activeProvider?.color || '#8b5cf6'}` }}
          >
            <span>{activeProvider?.icon}</span>
            <span className="text-gray-300">{activeProvider?.name || 'Select Provider'}</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {showProviderPicker && (
            <div className="absolute top-full left-0 mt-1 bg-[#1e1e2e] border border-[#313244] rounded-xl shadow-2xl z-50 w-72 py-2 max-h-80 overflow-y-auto">
              <div className="px-3 py-1.5 text-xs text-gray-500 font-medium">CONFIGURED</div>
              {settings.providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => switchProvider(provider.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-[#313244] transition-colors text-left ${
                    provider.id === settings.activeProviderId ? 'bg-[#313244]' : ''
                  }`}
                >
                  <span className="text-lg">{provider.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{provider.name}</p>
                    <p className="text-xs text-gray-500 truncate">{provider.model}</p>
                  </div>
                  {provider.apiKey ? (
                    <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0"></span>
                  )}
                </button>
              ))}
              <div className="border-t border-[#313244] mt-1 pt-1">
                <button
                  onClick={() => {
                    setShowProviderPicker(false);
                    // Trigger settings open
                    document.querySelector<HTMLButtonElement>('[title="Settings"]')?.click();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-purple-400 hover:bg-[#313244] transition-colors"
                >
                  + Add Custom Provider
                </button>
              </div>
            </div>
          )}
        </div>

        <span className="text-xs text-gray-500 ml-auto">
          {configuredProviders.length} provider{configuredProviders.length !== 1 ? 's' : ''} ready
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${activeProvider?.color || '#8b5cf6'}20` }}
              >
                <Bot size={16} style={{ color: activeProvider?.color || '#8b5cf6' }} />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-[#313244] text-gray-200'
              }`}
            >
              {msg.role === 'user' ? (
                <div>
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {msg.images.map((img, i) => (
                        <img key={i} src={img} alt="uploaded" className="max-w-[200px] max-h-[150px] rounded-lg" />
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
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-blue-400" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${activeProvider?.color || '#8b5cf6'}20` }}
            >
              <Loader2 size={16} className="animate-spin" style={{ color: activeProvider?.color || '#8b5cf6' }} />
            </div>
            <div className="bg-[#313244] rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#313244] bg-[#181825]">
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                <img src={img} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-[#45475a]" />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-[#313244] transition-colors"
            title="Upload image"
          >
            <Image size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={`Ask ${activeProvider?.name || 'AI'} anything...`}
            className="flex-1 bg-[#313244] text-white text-sm px-4 py-2.5 rounded-xl border border-[#45475a] focus:border-purple-500 focus:outline-none placeholder-gray-500"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || (!input.trim() && images.length === 0)}
            className="p-2.5 rounded-xl text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ backgroundColor: activeProvider?.color || '#8b5cf6' }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
