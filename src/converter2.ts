import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, ImageRun, TextRun, PageBreak } from 'docx';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export interface ConversionProgress {
  currentPage: number;
  totalPages: number;
  status: 'loading' | 'extracting' | 'building' | 'done' | 'error';
  message: string;
}

interface ExtractedImage {
  data: Uint8Array;
  width: number;
  height: number;
}

interface PageContent {
  textItems: Array<{
    str: string;
    transform: number[];
    width: number;
    height: number;
    fontName: string;
  }>;
  images: ExtractedImage[];
}

export async function convertPdfToWordWithText(
  file: File,
  onProgress: (progress: ConversionProgress) => void
): Promise<{ blob: Blob; url: string }> {
  try {
    onProgress({ currentPage: 0, totalPages: 0, status: 'loading', message: 'Загрузка PDF...' });

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const totalPages = pdf.numPages;

    onProgress({ currentPage: 0, totalPages, status: 'extracting', message: 'Извлечение текста и изображений...' });

    const pagesContent: PageContent[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress({
        currentPage: pageNum,
        totalPages,
        status: 'extracting',
        message: `Обработка страницы ${pageNum} из ${totalPages}...`
      });

      const page = await pdf.getPage(pageNum);
      
      // Извлекаем текст
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map((item: any) => ({
        str: item.str,
        transform: item.transform,
        width: item.width,
        height: item.height,
        fontName: item.fontName
      }));

      // Извлекаем изображения
      const images: ExtractedImage[] = [];
      const ops = await page.getOperatorList();
      
      for (let i = 0; i < ops.fnArray.length; i++) {
        if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject || 
            ops.fnArray[i] === pdfjsLib.OPS.paintXObject) {
          try {
            const imgName = ops.argsArray[i][0];
            const img = await page.objs.get(imgName);
            
            if (img && img.bitmap) {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d')!;
              ctx.drawImage(img.bitmap, 0, 0);
              
              const blob = await new Promise<Blob>((resolve) => {
                canvas.toBlob((b) => resolve(b!), 'image/png');
              });
              
              const uint8 = new Uint8Array(await blob.arrayBuffer());
              images.push({
                data: uint8,
                width: img.width,
                height: img.height
              });
              
              canvas.width = 0;
              canvas.height = 0;
            }
          } catch (e) {
            console.warn('Failed to extract image:', e);
          }
        }
      }

      pagesContent.push({ textItems, images });
    }

    // Создаём Word документ
    onProgress({
      currentPage: totalPages,
      totalPages,
      status: 'building',
      message: 'Сборка документа Word...'
    });

    const children: Paragraph[] = [];

    for (let i = 0; i < pagesContent.length; i++) {
      const pageData = pagesContent[i];

      // Добавляем текст
      if (pageData.textItems.length > 0) {
        const textRuns: TextRun[] = [];
        
        for (const item of pageData.textItems) {
          if (item.str.trim()) {
            textRuns.push(
              new TextRun({
                text: item.str,
                size: Math.round(item.height * 2),
              })
            );
          }
        }

        if (textRuns.length > 0) {
          children.push(
            new Paragraph({
              children: textRuns,
              spacing: { after: 200 },
            })
          );
        }
      }

      // Добавляем изображения
      for (const img of pageData.images) {
        const maxWidth = 450;
        const scale = Math.min(1, maxWidth / img.width);
        const scaledWidth = Math.round(img.width * scale);
        const scaledHeight = Math.round(img.height * scale);

        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: img.data,
                transformation: {
                  width: scaledWidth,
                  height: scaledHeight,
                },
                type: 'png',
              }),
            ],
            spacing: { before: 200, after: 200 },
          })
        );
      }

      // Разрыв страницы между страницами PDF
      if (i < pagesContent.length - 1) {
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
