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
      <div className="h-12 bg-[#181825] border-b border-[#313244] flex items-center px-4 gap-2">
        <Upload size={18} className="text-blue-400" />
        <span className="font-medium text-sm">File Upload</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
            isDragActive || dragActive
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-[#45475a] hover:border-purple-500/50 hover:bg-[#313244]/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload size={48} className={`mx-auto mb-4 ${isDragActive ? 'text-purple-400' : 'text-gray-500'}`} />
          <p className="text-gray-300 font-medium mb-1">
            {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-gray-500">
            or click to browse. Supports code files, images, and documents.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['JS', 'TS', 'Python', 'HTML', 'CSS', 'JSON', 'Images', 'Markdown'].map((type) => (
              <span key={type} className="text-xs bg-[#313244] text-gray-400 px-2 py-1 rounded">
                {type}
              </span>
            ))}
          </div>
        </div>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Uploaded Files ({uploadedFiles.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="bg-[#313244] rounded-lg p-3 group relative"
                >
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 w-5 h-5 bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} className="text-white" />
                  </button>

                  {file.type.startsWith('image/') ? (
                    <div className="mb-2">
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="mb-2 h-24 bg-[#1e1e2e] rounded-lg flex items-center justify-center">
                      {file.content ? (
                        <pre className="text-[10px] text-gray-400 p-2 overflow-hidden max-h-full w-full">
                          {file.content.slice(0, 200)}...
                        </pre>
                      ) : (
                        <File size={24} className="text-gray-500" />
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {file.type.startsWith('image/') ? (
                      <FileImage size={14} className="text-pink-400" />
                    ) : (
                      <FileText size={14} className="text-blue-400" />
                    )}
                    <span className="text-xs text-gray-300 truncate">{file.name}</span>
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
