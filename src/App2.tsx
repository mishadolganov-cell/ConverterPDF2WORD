import { useState, useRef, useCallback, useEffect } from 'react';
import { convertPdfToWordWithText, ConversionProgress } from './converter2';

function App2() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<ConversionProgress | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputFileName, setOutputFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [extractedText, setExtractedText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

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
      setExtractedText('');
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  }, [downloadUrl]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setProgress(null);
      setExtractedText('');
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  }, [downloadUrl]);

  const handleConvert = async () => {
    if (!file) return;

    setIsConverting(true);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    setProgress({ currentPage: 0, totalPages: 0, status: 'loading', message: 'Начало конвертации...' });

    try {
      const result = await convertPdfToWordWithText(file, (p) => {
        setProgress(p);
        // Показываем превью извлечённого текста
        if (p.status === 'extracting' && p.currentPage > 0) {
          setExtractedText(`Обработано страниц: ${p.currentPage} из ${p.totalPages}`);
        }
      });
      setDownloadUrl(result.url);
      setFileSize(result.blob.size);
      setOutputFileName(file.name.replace(/\.pdf$/i, '') + '_text.docx');
      setExtractedText('Текст и изображения успешно извлечены!');
    } catch (err) {
      console.error('Conversion failed:', err);
      alert(`Ошибка конвертации: ${(err as Error).message}`);
    } finally {
      setIsConverting(false);
    }
  };

  const handleReset = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    setFile(null);
    setProgress(null);
    setDownloadUrl(null);
    setOutputFileName('');
    setFileSize(0);
    setExtractedText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getProgressPercentage = () => {
    if (!progress || progress.totalPages === 0) return 0;
    return Math.round((progress.currentPage / progress.totalPages) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-white truncate">PDF → Word (Текст)</h1>
            <p className="text-[10px] sm:text-xs text-blue-300 truncate">Извлечение текста и изображений</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-12 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        {/* Info Card */}
        <div className="mb-6 sm:mb-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base text-white font-medium mb-1">Как это работает</h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Извлекает текст и изображения из PDF отдельно. Текст сохраняется как редактируемый текст в Word, 
                а изображения вставляются как отдельные объекты. Результат можно редактировать в Word.
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
              relative cursor-pointer border-2 border-dashed rounded-xl sm:rounded-2xl p-8 sm:p-16 text-center
              transition-all duration-300 ease-out active:scale-[0.98]
              ${dragOver
                ? 'border-blue-400 bg-blue-500/10 scale-[1.02]'
                : 'border-white/20 bg-white/5 hover:border-blue-400/50 hover:bg-white/10'
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

            <div className="flex flex-col items-center gap-3 sm:gap-4">
              <div className={`
                w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-all duration-300
                ${dragOver ? 'bg-blue-500/30 scale-110' : 'bg-white/10'}
              `}>
                <svg className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${dragOver ? 'text-blue-300' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>

              <div>
                <p className="text-base sm:text-lg font-medium text-white mb-1">
                  {dragOver ? 'Отпустите PDF файл' : 'Загрузите PDF файл'}
                </p>
                <p className="text-xs sm:text-sm text-gray-400">
                  Нажмите для выбора • Только PDF файлы
                </p>
              </div>
            </div>
          </div>
        )}

        {/* File Selected */}
        {file && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-8">
            {/* File Info */}
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base text-white font-medium truncate">{file.name}</p>
                <p className="text-xs sm:text-sm text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              {!isConverting && (
                <button
                  onClick={handleReset}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Progress */}
            {progress && (
              <div className="mb-4 sm:mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm text-gray-300 truncate mr-2">{progress.message}</span>
                  {progress.totalPages > 0 && (
                    <span className="text-xs sm:text-sm text-blue-300 font-medium flex-shrink-0">
                      {progress.currentPage}/{progress.totalPages} стр.
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
                        : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                    }`}
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>
            )}

            {/* Extracted Text Preview */}
            {extractedText && (
              <div className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-blue-300">{extractedText}</p>
              </div>
            )}

            {/* Download Button */}
            {downloadUrl && progress?.status === 'done' && (
              <div className="mb-4 sm:mb-6 bg-green-500/10 border border-green-500/30 rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-green-300 font-medium text-xs sm:text-sm">Конвертация завершена!</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 truncate">{outputFileName} • {(fileSize / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:gap-3">
                  <a
                    href={downloadUrl}
                    download={outputFileName}
                    className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 sm:gap-3 cursor-pointer no-underline text-center text-sm sm:text-base"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>📥 Скачать файл Word</span>
                  </a>

                  <button
                    onClick={() => window.open(downloadUrl, '_blank')}
                    className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-medium rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span>Открыть в новой вкладке</span>
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {!isConverting && !downloadUrl && (
                <button
                  onClick={handleConvert}
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-[0.98] text-sm sm:text-base"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Извлечь текст и изображения
                  </span>
                </button>
              )}

              {progress?.status === 'done' && (
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-white/10 hover:bg-white/20 text-white text-sm sm:text-base font-medium rounded-xl transition-all duration-200 active:scale-[0.98]"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Новый файл
                  </span>
                </button>
              )}

              {isConverting && (
                <button
                  disabled
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-3.5 bg-white/10 text-white/50 font-medium rounded-xl cursor-not-allowed text-sm sm:text-base"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Извлечение...
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-green-500/20 flex items-center justify-center mb-2 sm:mb-3">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-white font-medium text-xs sm:text-sm mb-1">Редактируемый текст</h3>
            <p className="text-[10px] sm:text-xs text-gray-400">Текст извлекается и сохраняется как редактируемый текст в Word.</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-500/20 flex items-center justify-center mb-2 sm:mb-3">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-white font-medium text-xs sm:text-sm mb-1">Отдельные изображения</h3>
            <p className="text-[10px] sm:text-xs text-gray-400">Изображения извлекаются как отдельные объекты.</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-purple-500/20 flex items-center justify-center mb-2 sm:mb-3">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-white font-medium text-xs sm:text-sm mb-1">100% Приватно</h3>
            <p className="text-[10px] sm:text-xs text-gray-400">Вся обработка происходит локально в вашем браузере.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-8 sm:mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 text-center">
          <p className="text-xs sm:text-sm text-gray-500">
            PDF to Word (Текст) • Извлечение текста и изображений
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App2;
