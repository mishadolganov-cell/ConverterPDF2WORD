import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, ImageRun, PageBreak } from 'docx';

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export interface ConversionProgress {
  currentPage: number;
  totalPages: number;
  status: 'loading' | 'rendering' | 'building' | 'done' | 'error';
  message: string;
}

interface PageData {
  image: Uint8Array;
  width: number;
  height: number;
}

export async function convertPdfToWord(
  file: File,
  onProgress: (progress: ConversionProgress) => void
): Promise<{ blob: Blob; url: string }> {
  try {
    // Step 1: Load PDF
    onProgress({ currentPage: 0, totalPages: 0, status: 'loading', message: 'Загрузка PDF...' });

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    onProgress({ currentPage: 0, totalPages, status: 'rendering', message: 'Рендеринг страниц...' });

    // Step 2: Render each page as an image
    const pages: PageData[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress({
        currentPage: pageNum,
        totalPages,
        status: 'rendering',
        message: `Рендеринг страницы ${pageNum} из ${totalPages}...`
      });

      const page = await pdf.getPage(pageNum);
      const scale = 200 / 72;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      // Convert canvas to PNG blob then to Uint8Array
      const pngBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });

      const uint8 = new Uint8Array(await pngBlob.arrayBuffer());
      pages.push({
        image: uint8,
        width: canvas.width,
        height: canvas.height,
      });

      canvas.width = 0;
      canvas.height = 0;
    }

    // Step 3: Build Word document
    onProgress({
      currentPage: totalPages,
      totalPages,
      status: 'building',
      message: 'Сборка документа Word...'
    });

    const children: Paragraph[] = [];
    const targetWidthPt = 432;

    for (let i = 0; i < pages.length; i++) {
      const pageData = pages[i];
      const aspectRatio = pageData.height / pageData.width;
      const targetHeightPt = Math.round(targetWidthPt * aspectRatio);

      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: pageData.image,
              transformation: {
                width: targetWidthPt,
                height: targetHeightPt,
              },
              type: 'png',
            }),
          ],
          spacing: { after: 0 },
        })
      );

      if (i < pages.length - 1) {
        children.push(
          new Paragraph({
            children: [new PageBreak()],
          })
        );
      }
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: children,
      }],
    });

    // Step 4: Generate blob
    onProgress({
      currentPage: totalPages,
      totalPages,
      status: 'building',
      message: 'Генерация файла...'
    });

    // Используем toBlob для браузерной среды
    const blob = await Packer.toBlob(doc);

    // Создаём URL для скачивания
    const url = URL.createObjectURL(blob);

    onProgress({
      currentPage: totalPages,
      totalPages,
      status: 'done',
      message: '✅ Готово! Нажмите "Скачать файл Word".'
    });

    return { blob, url };

  } catch (error) {
    console.error('Conversion error:', error);
    onProgress({
      currentPage: 0,
      totalPages: 0,
      status: 'error',
      message: `❌ Ошибка: ${(error as Error).message}`
    });
    throw error;
  }
}
