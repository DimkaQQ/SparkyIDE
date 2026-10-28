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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="h-14 flex items-center px-5 gap-3 border-b"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249, 115, 22, 0.15)' }}>
          <Upload size={16} style={{ color: '#f97316' }} />
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>File Upload</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Drag & drop or browse files</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5" style={{ background: 'var(--bg-primary)' }}>
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className="rounded-2xl p-10 text-center cursor-pointer transition-all duration-300"
          style={{
            border: `2px dashed ${isDragActive || dragActive ? 'var(--accent-primary)' : 'var(--border-secondary)'}`,
            background: isDragActive || dragActive ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
            boxShadow: isDragActive || dragActive ? 'var(--accent-glow)' : 'none',
          }}
        >
          <input {...getInputProps()} />
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center transition-all duration-300"
            style={{
              background: isDragActive || dragActive ? 'var(--accent-gradient)' : 'var(--bg-tertiary)',
              boxShadow: isDragActive || dragActive ? 'var(--accent-glow)' : 'none',
            }}
          >
            {isDragActive || dragActive ? (
              <Sparkles size={28} className="text-white" />
            ) : (
              <Upload size={28} style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
          <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            {isDragActive || dragActive ? 'Drop files here...' : 'Drag & drop files here'}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            or click to browse. Supports code files, images, and documents.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {['JS', 'TS', 'Python', 'HTML', 'CSS', 'JSON', 'Images', 'Markdown'].map((type) => (
              <span
                key={type}
                className="badge"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
              >
                {type}
              </span>
            ))}
          </div>
        </div>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
              Uploaded Files ({uploadedFiles.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="card group relative transition-all duration-200 hover:scale-[1.02]"
                >
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                    style={{ background: 'var(--error)', color: 'white' }}
                  >
                    <X size={12} />
                  </button>

                  {file.type.startsWith('image/') ? (
                    <div className="mb-3">
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-28 object-cover rounded-xl"
                      />
                    </div>
                  ) : (
                    <div className="mb-3 h-28 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                      {file.content ? (
                        <pre className="text-[10px] p-3 overflow-hidden max-h-full w-full" style={{ color: 'var(--text-muted)' }}>
                          {file.content.slice(0, 200)}...
                        </pre>
                      ) : (
                        <File size={28} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {file.type.startsWith('image/') ? (
                      <FileImage size={14} style={{ color: '#ec4899' }} />
                    ) : (
                      <FileText size={14} style={{ color: 'var(--info)' }} />
                    )}
                    <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
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
