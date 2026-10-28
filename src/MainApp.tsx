import { useState } from 'react';
import App from './App';
import App2 from './App2';
import App3 from './App3';

function MainApp() {
  const [mode, setMode] = useState<'image' | 'text' | 'hybrid'>('image');

  return (
    <div className="relative">
      {/* Mode Switcher */}
      <div className="fixed top-4 right-4 z-50 flex flex-wrap gap-2 bg-black/50 backdrop-blur-md rounded-full p-1 border border-white/10">
        <button
          onClick={() => setMode('image')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            mode === 'image'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📄 Страницы как картинки
        </button>
        <button
          onClick={() => setMode('text')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            mode === 'text'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📝 Текст + Изображения
        </button>
        <button
          onClick={() => setMode('hybrid')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            mode === 'hybrid'
              ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🔀 Текст + Скриншоты
        </button>
      </div>

      {/* Content */}
      {mode === 'image' ? <App /> : mode === 'text' ? <App2 /> : <App3 />}
    </div>
  );
}

export default MainApp;
