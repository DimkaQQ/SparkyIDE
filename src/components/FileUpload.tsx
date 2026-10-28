import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, FileText, X, File } from 'lucide-react';

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
        className="toolbar"
        style={{
          background: 'var(--panel)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <Upload size={16} style={{ color: 'var(--text)' }} />
          <span className="font-semibold" style={{ color: 'var(--text-strong)', fontSize: 'var(--text-sm)' }}>
            File Upload
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4" style={{ background: 'var(--bg)' }}>
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className="rounded-lg p-12 text-center cursor-pointer transition-all"
          style={{
            border: `2px dashed ${isDragActive || dragActive ? 'var(--accent)' : 'var(--border)'}`,
            background: isDragActive || dragActive ? 'var(--surface)' : 'var(--panel)',
          }}
        >
          <input {...getInputProps()} />
          <div
            className="flex items-center justify-center mx-auto mb-4"
            style={{
              width: 64,
              height: 64,
              borderRadius: 'var(--radius-lg)',
              background: isDragActive || dragActive ? 'var(--accent)' : 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <Upload size={32} style={{ color: isDragActive || dragActive ? '#ffffff' : 'var(--muted)' }} />
          </div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-strong)' }}>
            {isDragActive || dragActive ? 'Drop files here...' : 'Drag & drop files here'}
          </p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            or click to browse. Supports code files, images, and documents.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['JS', 'TS', 'Python', 'HTML', 'CSS', 'JSON', 'Images', 'Markdown'].map((type) => (
              <span key={type} className="badge">
                {type}
              </span>
            ))}
          </div>
        </div>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
              Uploaded Files ({uploadedFiles.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="card group relative">
                  <button
                    onClick={() => removeFile(index)}
                    className="btn-icon absolute top-2 right-2"
                    style={{
                      width: 24,
                      height: 24,
                      background: 'var(--error)',
                      color: '#ffffff',
                      borderRadius: '50%',
                    }}
                  >
                    <X size={14} />
                  </button>

                  {file.type.startsWith('image/') ? (
                    <div className="mb-3">
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-28 object-cover rounded"
                        style={{ border: '1px solid var(--border)' }}
                      />
                    </div>
                  ) : (
                    <div
                      className="mb-3 h-28 rounded flex items-center justify-center overflow-hidden"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      {file.content ? (
                        <pre className="text-xs p-3 overflow-hidden max-h-full w-full" style={{ color: 'var(--muted)' }}>
                          {file.content.slice(0, 200)}...
                        </pre>
                      ) : (
                        <File size={28} style={{ color: 'var(--muted)' }} />
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {file.type.startsWith('image/') ? (
                      <FileImage size={14} style={{ color: 'var(--text)' }} />
                    ) : (
                      <FileText size={14} style={{ color: 'var(--text)' }} />
                    )}
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
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
