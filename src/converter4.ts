import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, ImageRun, TextRun, PageBreak, AlignmentType } from 'docx';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export interface ConversionProgress {
  currentPage: number;
  totalPages: number;
  status: 'loading' | 'analyzing' | 'building' | 'done' | 'error';
  message: string;
}

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
  isBold: boolean;
  isItalic: boolean;
}

interface Line {
  items: TextItem[];
  y: number;
  maxHeight: number;
}

interface ExtractedImage {
  imageData: Uint8Array;
  width: number;
  height: number;
}

interface PageStructure {
  lines: Line[];
  images: ExtractedImage[];
  pageWidth: number;
  pageHeight: number;
}

export async function convertPdfToWordFormatted(
  file: File,
  onProgress: (progress: ConversionProgress) => void
): Promise<{ blob: Blob; url: string }> {
  try {
    onProgress({ currentPage: 0, totalPages: 0, status: 'loading', message: 'Загрузка PDF...' });

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const totalPages = pdf.numPages;

    onProgress({ currentPage: 0, totalPages, status: 'analyzing', message: 'Анализ структуры документа...' });

    const pages: PageStructure[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress({
        currentPage: pageNum,
        totalPages,
        status: 'analyzing',
        message: `Анализ страницы ${pageNum} из ${totalPages}...`
      });

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });

      // Извлекаем текст с координатами и стилями
      const textContent = await page.getTextContent();
      const textItems: TextItem[] = [];

      for (const item of textContent.items as any[]) {
        if (!item.str || !item.transform) continue;

        const fontSize = Math.abs(item.transform[0]) || item.height;
        const fontName = item.fontName || '';
        const isBold = fontName.toLowerCase().includes('bold') || fontName.toLowerCase().includes('black');
        const isItalic = fontName.toLowerCase().includes('italic') || fontName.toLowerCase().includes('oblique');

        textItems.push({
          str: item.str,
          x: item.transform[4],
          y: viewport.height - item.transform[5], // Инвертируем Y (PDF начинается снизу)
          width: item.width,
          height: fontSize,
          fontSize: fontSize,
          fontName: fontName,
          isBold: isBold,
          isItalic: isItalic,
        });
      }

      // Группируем текст по строкам (элементы с похожей Y-координатой)
      const lines: Line[] = [];
      const sortedItems = [...textItems].sort((a, b) => a.y - b.y || a.x - b.x);

      let currentLine: Line | null = null;
      const lineThreshold = 2; // Порог для группировки по Y

      for (const item of sortedItems) {
        if (!currentLine || Math.abs(item.y - currentLine.y) > lineThreshold) {
          // Новая строка
          currentLine = {
            items: [item],
            y: item.y,
            maxHeight: item.height,
          };
          lines.push(currentLine);
        } else {
          // Добавляем в текущую строку
          currentLine.items.push(item);
          currentLine.maxHeight = Math.max(currentLine.maxHeight, item.height);
        }
      }

      // Сортируем элементы внутри каждой строки по X
      for (const line of lines) {
        line.items.sort((a, b) => a.x - b.x);
      }

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
                imageData: uint8,
                width: img.width,
                height: img.height,
              });

              canvas.width = 0;
              canvas.height = 0;
            }
          } catch (e) {
            console.warn('Failed to extract image:', e);
          }
        }
      }

      pages.push({
        lines,
        images,
        pageWidth: viewport.width,
        pageHeight: viewport.height,
      });
    }

    // Создаём Word документ с сохранением форматирования
    onProgress({
      currentPage: totalPages,
      totalPages,
      status: 'building',
      message: 'Сборка документа Word с форматированием...'
    });

    const children: Paragraph[] = [];

    for (let i = 0; i < pages.length; i++) {
      const pageData = pages[i];
      const pageWidthPt = 450; // Ширина страницы Word в пунктах (~6.25 дюйма)
      const scale = pageWidthPt / pageData.pageWidth;

      // Обрабатываем каждую строку
      for (const line of pageData.lines) {
        const textRuns: TextRun[] = [];
        let prevX = 0;

        for (const item of line.items) {
          // Добавляем пробелы для имитации позиции
          const gap = item.x - prevX;
          if (gap > 5 && textRuns.length > 0) {
            const spaces = Math.round(gap / 3);
            if (spaces > 0) {
              textRuns.push(new TextRun({ text: ' '.repeat(spaces), size: Math.round(item.fontSize * 2) }));
            }
          }

          // Создаём TextRun с форматированием
          textRuns.push(
            new TextRun({
              text: item.str,
              size: Math.round(item.fontSize * 2), // Конвертируем в half-points
              bold: item.isBold,
              italics: item.isItalic,
            })
          );

          prevX = item.x + item.width;
        }

        if (textRuns.length > 0) {
          // Определяем выравнивание по позиции первого элемента
          const firstItem = line.items[0];
          let alignment: typeof AlignmentType.LEFT | typeof AlignmentType.CENTER | typeof AlignmentType.RIGHT = AlignmentType.LEFT;
          
          if (firstItem.x > pageData.pageWidth * 0.4) {
            alignment = AlignmentType.RIGHT;
          } else if (firstItem.x > pageData.pageWidth * 0.25) {
            alignment = AlignmentType.CENTER;
          }

          children.push(
            new Paragraph({
              children: textRuns,
              alignment: alignment,
              spacing: {
                after: Math.round(line.maxHeight * scale * 0.5),
                line: Math.round(line.maxHeight * scale * 2.4),
              },
            })
          );
        }
      }

      // Добавляем изображения в конце страницы
      for (const img of pageData.images) {
        const maxWidth = pageWidthPt;
        const imgScale = Math.min(1, maxWidth / img.width);
        const scaledWidth = Math.round(img.width * imgScale);
        const scaledHeight = Math.round(img.height * imgScale);

        const data = img.imageData;
        const imageRun = new ImageRun({
           data,
          transformation: {
            width: scaledWidth,
            height: scaledHeight,
          },
          type: 'png',
        });

        children.push(
          new Paragraph({
            children: [imageRun],
            spacing: { before: 200, after: 200 },
          })
        );
      }

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
      message: '✅ Готово! Форматирование сохранено.'
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
