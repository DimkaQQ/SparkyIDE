import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, FileText, X, File, Sparkles } from 'lucide-react';

interface UploadedFile {
  name: string;
  type: string;
  url: string;
  content?: string;
}

interface FileUploadProps {
  uploadedFiles: UploadedFile[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  setFiles: React.Dispatch<React.SetStateAction<{ name: string; content: string; language: string }[]>>;
}

const TEXT_EXTENSIONS = ['js', 'ts', 'tsx', 'jsx', 'py', 'html', 'css', 'json', 'md', 'txt', 'java', 'cpp', 'c', 'rs', 'go', 'rb', 'php', 'sql', 'yaml', 'yml', 'xml', 'sh', 'bash'];

const LANG_MAP: Record<string, string> = {
  js: 'javascript', ts: 'typescript', tsx: 'typescript', jsx: 'javascript',
  py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown',
  txt: 'markdown', java: 'java', cpp: 'cpp', c: 'cpp', rs: 'rust',
  go: 'go', rb: 'ruby', php: 'php', sql: 'sql', yaml: 'yaml', yml: 'yaml',
  xml: 'xml', sh: 'shell', bash: 'shell',
};

export default function FileUpload({ uploadedFiles, setUploadedFiles, setFiles }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isText = TEXT_EXTENSIONS.includes(ext);
      const isImage = file.type.startsWith('image/');

      if (isImage) {
        reader.onload = () => {
          const url = reader.result as string;
          setUploadedFiles((prev) => [...prev, { name: file.name, type: file.type, url }]);
        };
        reader.readAsDataURL(file);
      } else if (isText) {
        reader.onload = () => {
          const content = reader.result as string;
          const language = LANG_MAP[ext] || 'javascript';
          setFiles((prev) => [...prev, { name: file.name, content, language }]);
          setUploadedFiles((prev) => [...prev, { name: file.name, type: file.type, url: '', content }]);
        };
        reader.readAsText(file);
      } else {
        reader.onload = () => {
          const url = reader.result as string;
          setUploadedFiles((prev) => [...prev, { name: file.name, type: file.type, url }]);
        };
        reader.readAsDataURL(file);
      }
    });
  }, [setUploadedFiles, setFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
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
          style={{ background: 'rgba(249, 115, 22, 0.15)', border: '1px solid rgba(249, 115, 22, 0.3)' }}
        >
          <Upload size={20} style={{ color: '#f97316' }} />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>File Upload</h2>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Drag & drop or browse files</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6" style={{ background: 'transparent' }}>
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className="rounded-3xl p-12 text-center cursor-pointer transition-all duration-500 relative overflow-hidden"
          style={{
            border: `2px dashed ${isDragActive || dragActive ? 'var(--accent-primary)' : 'var(--border-secondary)'}`,
            background: isDragActive || dragActive ? 'var(--bg-tertiary)' : 'var(--bg-glass)',
            boxShadow: isDragActive || dragActive ? 'var(--accent-glow-strong)' : 'none',
            backdropFilter: 'blur(20px)',
          }}
        >
          <input {...getInputProps()} />
          <div
            className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center transition-all duration-500 shadow-glow"
            style={{
              background: isDragActive || dragActive ? 'var(--accent-gradient)' : 'var(--bg-tertiary)',
              boxShadow: isDragActive || dragActive ? 'var(--accent-glow-strong)' : 'none',
            }}
          >
            {isDragActive || dragActive ? (
              <Sparkles size={32} className="text-white animate-float" />
            ) : (
              <Upload size={32} style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
          <p className="text-xl font-bold mb-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {isDragActive || dragActive ? 'Drop files here...' : 'Drag & drop files here'}
          </p>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            or click to browse. Supports code files, images, and documents.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5 mt-6">
            {['JS', 'TS', 'Python', 'HTML', 'CSS', 'JSON', 'Images', 'Markdown'].map((type) => (
              <span
                key={type}
                className="badge"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-primary)' }}
              >
                {type}
              </span>
            ))}
          </div>
        </div>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-5" style={{ color: 'var(--text-muted)' }}>
              Uploaded Files ({uploadedFiles.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="card group relative transition-all duration-300 hover:scale-[1.02]"
                >
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-glow"
                    style={{ background: 'var(--error)', color: 'white' }}
                  >
                    <X size={14} />
                  </button>

                  {file.type.startsWith('image/') ? (
                    <div className="mb-4">
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-32 object-cover rounded-2xl"
                      />
                    </div>
                  ) : (
                    <div className="mb-4 h-32 rounded-2xl flex items-center justify-center overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                      {file.content ? (
                        <pre className="text-[10px] p-4 overflow-hidden max-h-full w-full font-mono" style={{ color: 'var(--text-muted)' }}>
                          {file.content.slice(0, 200)}...
                        </pre>
                      ) : (
                        <File size={32} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    {file.type.startsWith('image/') ? (
                      <FileImage size={16} style={{ color: '#ec4899' }} />
                    ) : (
                      <FileText size={16} style={{ color: 'var(--info)' }} />
                    )}
                    <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {file.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
