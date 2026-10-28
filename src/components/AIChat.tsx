import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, Image } from 'lucide-react';
import { useAppContext } from '../context';
import { marked } from 'marked';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
}

export default function AIChat() {
  const { settings } = useAppContext();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "👋 Привет! Я AI-ассистент на базе Meta Llama. Я могу помочь тебе с кодом, объяснить концепции, написать функции и многое другое. Задавай вопросы или загружай фото для анализа!",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
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

  const sendMessage = async () => {
    if (!input.trim() && images.length === 0) return;
    if (!settings.metaApiKey) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Пожалуйста, укажи API ключ Meta в настройках (кнопка шестерёнки внизу сайдбара).' },
      ]);
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      images: images.length > 0 ? [...images] : undefined,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setImages([]);
    setIsLoading(true);

    try {
      const apiMessages = messages
        .filter((m) => m.role !== 'system' || m.content)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // Using Meta Llama API via Together AI or similar endpoint
      const response = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.metaApiKey}`,
        },
        body: JSON.stringify({
          model: `meta-llama/${settings.model}`,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful coding assistant. You help with programming, debugging, code review, and explaining concepts. Format code blocks with ```language syntax. Be concise but thorough.',
            },
            ...apiMessages,
            ...(images.length > 0
              ? [
                  {
                    role: 'user' as const,
                    content: [
                      { type: 'text', text: input || 'Describe this image' },
                      ...images.map((img) => ({ type: 'image_url', image_url: { url: img } })),
                    ],
                  },
                ]
              : []),
          ],
          max_tokens: 4096,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API Error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices?.[0]?.message?.content || 'No response received.';
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ Ошибка: ${error.message}\n\nУбедись, что API ключ правильный и у тебя есть доступ к Meta Llama API через Together AI (https://api.together.xyz).`,
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-12 bg-[#181825] border-b border-[#313244] flex items-center px-4 gap-2">
        <Sparkles size={18} className="text-purple-400" />
        <span className="font-medium text-sm">AI Assistant</span>
        <span className="text-xs text-gray-500 ml-2">Meta Llama {settings.model}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-purple-400" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#313244] text-gray-200'
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
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <Loader2 size={16} className="text-purple-400 animate-spin" />
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
            placeholder="Ask AI anything..."
            className="flex-1 bg-[#313244] text-white text-sm px-4 py-2.5 rounded-xl border border-[#45475a] focus:border-purple-500 focus:outline-none placeholder-gray-500"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || (!input.trim() && images.length === 0)}
            className="p-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
