import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, ImageRun, TextRun, PageBreak } from 'docx';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export interface ConversionProgress {
  currentPage: number;
  totalPages: number;
  status: 'loading' | 'extracting' | 'rendering' | 'building' | 'done' | 'error';
  message: string;
}

interface PageResult {
  textItems: Array<{
    str: string;
    height: number;
  }>;
  pageImage: Uint8Array;
  imgWidth: number;
  imgHeight: number;
}

export async function convertPdfToWordHybrid(
  file: File,
  onProgress: (progress: ConversionProgress) => void
): Promise<{ blob: Blob; url: string }> {
  try {
    onProgress({ currentPage: 0, totalPages: 0, status: 'loading', message: 'Загрузка PDF...' });

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const totalPages = pdf.numPages;

    onProgress({ currentPage: 0, totalPages, status: 'extracting', message: 'Извлечение текста...' });

    const pages: PageResult[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress({
        currentPage: pageNum,
        totalPages,
        status: 'extracting',
        message: `Страница ${pageNum}: извлечение текста...`
      });

      const page = await pdf.getPage(pageNum);

      // Извлекаем текст
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map((item: any) => ({
        str: item.str,
        height: item.height,
      }));

      // Рендерим страницу как картинку
      onProgress({
        currentPage: pageNum,
        totalPages,
        status: 'rendering',
        message: `Страница ${pageNum}: рендеринг скриншота...`
      });

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

      const pngBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });

      const uint8 = new Uint8Array(await pngBlob.arrayBuffer());

      pages.push({
        textItems,
        pageImage: uint8,
        imgWidth: canvas.width,
        imgHeight: canvas.height,
      });

      canvas.width = 0;
      canvas.height = 0;
    }

    // Создаём Word документ
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

      // Заголовок страницы
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `— Страница ${i + 1} —`,
              bold: true,
              size: 24,
              color: '666666',
            }),
          ],
          spacing: { after: 200 },
        })
      );

      // Извлечённый текст
      if (pageData.textItems.length > 0) {
        const textRuns: TextRun[] = [];
        for (const item of pageData.textItems) {
          if (item.str.trim()) {
            textRuns.push(
              new TextRun({
                text: item.str + ' ',
                size: Math.max(20, Math.round(item.height * 2)),
              })
            );
          }
        }

        if (textRuns.length > 0) {
          children.push(
            new Paragraph({
              children: textRuns,
              spacing: { after: 300 },
            })
          );
        }
      }

      // Подпись к скриншоту
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Скриншот страницы:',
              italics: true,
              size: 18,
              color: '888888',
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );

      // Скриншот страницы как картинка
      const aspectRatio = pageData.imgHeight / pageData.imgWidth;
      const targetHeightPt = Math.round(targetWidthPt * aspectRatio);

      const data = pageData.pageImage;
      const imageRun = new ImageRun({
         data,
        transformation: {
          width: targetWidthPt,
          height: targetHeightPt,
        },
        type: 'png',
      });

      children.push(
        new Paragraph({
          children: [imageRun],
          spacing: { after: 200 },
        })
      );

      // Разрыв страницы
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

    onProgress({
      currentPage: totalPages,
      totalPages,
      status: 'building',
      message: 'Генерация файла...'
    });

    const blob = await Packer.toBlob(doc);
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
