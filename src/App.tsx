import { useState, useRef, useCallback } from 'react';
import { convertPdfToWord, ConversionProgress } from './converter';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<ConversionProgress | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setProgress(null);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setProgress(null);
    }
  }, []);

  const handleConvert = async () => {
    if (!file) return;
    
    setIsConverting(true);
    setProgress({ currentPage: 0, totalPages: 0, status: 'loading', message: 'Starting conversion...' });
    
    try {
      await convertPdfToWord(file, (p) => setProgress(p));
    } catch {
      // Error is handled in the progress callback
    } finally {
      setIsConverting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getProgressPercentage = () => {
    if (!progress || progress.totalPages === 0) return 0;
    return Math.round((progress.currentPage / progress.totalPages) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">PDF → Word Converter</h1>
            <p className="text-xs text-purple-300">Convert PDF pages to Word document with images</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Info Card */}
        <div className="mb-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">How it works</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Each PDF page is rendered as a high-quality image (200 DPI) and inserted into a Word document. 
                The result preserves the exact visual layout of your PDF. All processing happens in your browser — 
                no files are uploaded to any server.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        {!file && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative cursor-pointer border-2 border-dashed rounded-2xl p-16 text-center
              transition-all duration-300 ease-out
              ${dragOver
                ? 'border-purple-400 bg-purple-500/10 scale-[1.02]'
                : 'border-white/20 bg-white/5 hover:border-purple-400/50 hover:bg-white/10'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="flex flex-col items-center gap-4">
              <div className={`
                w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300
                ${dragOver ? 'bg-purple-500/30 scale-110' : 'bg-white/10'}
              `}>
                <svg className={`w-10 h-10 transition-colors ${dragOver ? 'text-purple-300' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              
              <div>
                <p className="text-lg font-medium text-white mb-1">
                  {dragOver ? 'Drop your PDF here' : 'Upload your PDF file'}
                </p>
                <p className="text-sm text-gray-400">
                  Drag & drop or click to browse • PDF files only
                </p>
              </div>
            </div>
          </div>
        )}

        {/* File Selected */}
        {file && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            {/* File Info */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{file.name}</p>
                <p className="text-sm text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              {!isConverting && progress?.status !== 'done' && (
                <button
                  onClick={handleReset}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Progress */}
            {progress && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">{progress.message}</span>
                  {progress.totalPages > 0 && (
                    <span className="text-sm text-purple-300 font-medium">
                      {progress.currentPage}/{progress.totalPages} pages
                    </span>
                  )}
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      progress.status === 'error'
                        ? 'bg-red-500'
                        : progress.status === 'done'
                        ? 'bg-green-500'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500'
                    }`}
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {!isConverting && progress?.status !== 'done' && (
                <button
                  onClick={handleConvert}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Convert to Word
                  </span>
                </button>
              )}
              
              {progress?.status === 'done' && (
                <button
                  onClick={handleReset}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-medium rounded-xl shadow-lg shadow-green-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Convert Another File
                  </span>
                </button>
              )}

              {isConverting && (
                <button
                  disabled
                  className="flex-1 px-6 py-3 bg-white/10 text-white/50 font-medium rounded-xl cursor-not-allowed"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Converting...
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
            <div className="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-white font-medium text-sm mb-1">100% Private</h3>
            <p className="text-xs text-gray-400">All processing happens in your browser. No files are uploaded.</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </div>
            <h3 className="text-white font-medium text-sm mb-1">High Quality</h3>
            <p className="text-xs text-gray-400">Pages rendered at 200 DPI for crisp, clear output.</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-white font-medium text-sm mb-1">Fast & Free</h3>
            <p className="text-xs text-gray-400">No limits, no registration required. Just convert.</p>
          </div>
        </div>

        {/* Python Code Reference */}
        <div className="mt-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <h3 className="text-white font-medium text-sm">Equivalent Python Code</h3>
          </div>
          <pre className="text-xs text-gray-400 overflow-x-auto bg-black/30 rounded-lg p-4 font-mono leading-relaxed">
{`import fitz  # PyMuPDF
from docx import Document
from docx.shared import Inches
import os

def pdf_to_word_as_images(pdf_path, docx_path):
    doc = fitz.open(pdf_path)
    word_doc = Document()
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        mat = fitz.Matrix(200/72, 200/72)
        pix = page.get_pixmap(matrix=mat)
        img_filename = f"page_{page_num + 1}.png"
        pix.save(img_filename)
        word_doc.add_picture(img_filename, width=Inches(6.0))
        word_doc.add_page_break()
        os.remove(img_filename)
    
    word_doc.save(docx_path)
    print(f"✅ Done! Saved to {docx_path}")`}
          </pre>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center">
          <p className="text-sm text-gray-500">
            PDF to Word Converter • Client-side processing • No data leaves your browser
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
