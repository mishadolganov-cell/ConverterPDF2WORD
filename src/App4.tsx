import { useState } from 'react';
import { convertPdfToWordFormatted } from './converter4';

function App4() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<{
    currentPage: number;
    totalPages: number;
    status: string;
    message: string;
  } | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setProgress(null);
      setDownloadUrl(null);
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    try {
      setProgress({
        currentPage: 0,
        totalPages: 0,
        status: 'loading',
        message: 'Загрузка PDF...',
      });

      const result = await convertPdfToWordFormatted(file, (p) => {
        setProgress(p);
      });

      setDownloadUrl(result.url);
      setFileName(file.name.replace(/\.pdf$/i, '') + '_formatted.docx');
    } catch (error) {
      console.error('Conversion error:', error);
      alert('Ошибка при конвертации: ' + (error as Error).message);
    }
  };

  const handleReset = () => {
    setFile(null);
    setProgress(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  };

  const progressPercent = progress && progress.totalPages > 0
    ? Math.round((progress.currentPage / progress.totalPages) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            PDF → Word (Форматирование)
          </h1>
          <p className="text-gray-300 text-sm md:text-base">
            Сохранение форматирования и разметки PDF в Word
          </p>
        </div>

        {/* Upload Area */}
        {!file && (
          <div className="bg-white/5 backdrop-blur-sm border-2 border-dashed border-white/20 rounded-2xl p-8 md:p-12 text-center hover:border-purple-400/50 transition-all">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-white text-lg md:text-xl font-medium mb-2">
                  Загрузите PDF файл
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  Нажмите для выбора или перетащите файл
                </p>
                <label className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium cursor-pointer hover:from-indigo-600 hover:to-purple-700 transition-all">
                  Выбрать файл
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* File Info */}
        {file && !downloadUrl && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{file.name}</p>
                <p className="text-gray-400 text-sm">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={handleReset}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress */}
            {progress && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">{progress.message}</span>
                  {progress.totalPages > 0 && (
                    <span className="text-sm text-purple-300 font-medium">
                      {progress.currentPage}/{progress.totalPages} стр.
                    </span>
                  )}
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      progress.status === 'error'
                        ? 'bg-red-500'
                        : progress.status === 'done'
                        ? 'bg-green-500'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Convert Button */}
            {!progress || (progress.status !== 'loading' && progress.status !== 'rendering' && progress.status !== 'building') ? (
              <button
                onClick={handleConvert}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl shadow-lg hover:from-indigo-600 hover:to-purple-700 transition-all"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Конвертировать с форматированием
                </span>
              </button>
            ) : (
              <button
                disabled
                className="w-full px-6 py-3 bg-white/10 text-white/50 font-medium rounded-xl cursor-not-allowed"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Обработка...
                </span>
              </button>
            )}
          </div>
        )}

        {/* Download Area */}
        {downloadUrl && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-green-300 font-medium">Конвертация завершена!</p>
                <p className="text-gray-400 text-sm truncate">{fileName}</p>
              </div>
            </div>

            <a
              href={downloadUrl}
              download={fileName}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl shadow-lg hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 no-underline"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Скачать Word файл
            </a>

            <button
              onClick={handleReset}
              className="w-full mt-3 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all"
            >
              Конвертировать другой файл
            </button>
          </div>
        )}

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-white font-medium text-sm mb-1">Сохранение форматирования</h3>
            <p className="text-gray-400 text-xs">
              Шрифты, размеры, цвета, жирность и курсив сохраняются в Word документе.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </div>
            <h3 className="text-white font-medium text-sm mb-1">Структура документа</h3>
            <p className="text-gray-400 text-xs">
              Абзацы, отступы и выравнивание текста воспроизводятся в Word.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-white font-medium text-sm mb-1">Изображения</h3>
            <p className="text-gray-400 text-xs">
              Изображения из PDF извлекаются и вставляются в Word документ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App4;
