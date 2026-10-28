import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, ImageRun, TextRun, PageBreak, AlignmentType } from 'docx';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export interface ConversionProgress {
  currentPage: number;
  totalPages: number;
  status: 'loading' | 'analyzing' | 'rendering' | 'building' | 'done' | 'error';
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
  color?: string;
  isBold: boolean;
  isItalic: boolean;
}

interface TextLine {
  items: TextItem[];
  y: number;
  height: number;
  indent: number;
}

interface TextBlock {
  lines: TextLine[];
  alignment: 'left' | 'center' | 'right' | 'both' | 'start' | 'end';
}

interface ExtractedImage {
  data: Uint8Array;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PageContent {
  blocks: TextBlock[];
  images: ExtractedImage[];
  width: number;
  height: number;
}

// Определение стиля шрифта по имени
function analyzeFont(fontName: string): { isBold: boolean; isItalic: boolean } {
  const name = fontName.toLowerCase();
  return {
    isBold: name.includes('bold') || name.includes('black') || name.includes('heavy'),
    isItalic: name.includes('italic') || name.includes('oblique'),
  };
}

// Группировка текстовых элементов в строки
function groupIntoLines(items: TextItem[], tolerance: number = 2): TextLine[] {
  if (items.length === 0) return [];

  // Сортируем по Y (сверху вниз)
  const sorted = [...items].sort((a, b) => b.y - a.y);
  
  const lines: TextLine[] = [];
  let currentLine: TextItem[] = [];
  let currentY = sorted[0].y;
  let currentHeight = sorted[0].height;

  for (const item of sorted) {
    if (Math.abs(item.y - currentY) <= tolerance) {
      currentLine.push(item);
      currentHeight = Math.max(currentHeight, item.height);
    } else {
      if (currentLine.length > 0) {
        // Сортируем элементы в строке по X
        currentLine.sort((a, b) => a.x - b.x);
        lines.push({
          items: currentLine,
          y: currentY,
          height: currentHeight,
          indent: currentLine[0].x,
        });
      }
      currentLine = [item];
      currentY = item.y;
      currentHeight = item.height;
    }
  }

  if (currentLine.length > 0) {
    currentLine.sort((a, b) => a.x - b.x);
    lines.push({
      items: currentLine,
      y: currentY,
      height: currentHeight,
      indent: currentLine[0].x,
    });
  }

  return lines;
}

// Группировка строк в абзацы
function groupIntoBlocks(lines: TextLine[], pageWidth: number): TextBlock[] {
  if (lines.length === 0) return [];

  const blocks: TextBlock[] = [];
  let currentBlock: TextLine[] = [];
  let lastIndent = lines[0].indent;
  let lastY = lines[0].y;
  let lastHeight = lines[0].height;

  for (const line of lines) {
    const verticalGap = Math.abs(lastY - line.y);
    const indentDiff = Math.abs(line.indent - lastIndent);
    const heightDiff = Math.abs(line.height - lastHeight);

    // Определяем, начинается ли новый абзац
    const isNewParagraph = 
      verticalGap > lastHeight * 1.5 || // Большой вертикальный отступ
      indentDiff > pageWidth * 0.05 || // Значительный отступ слева
      heightDiff > lastHeight * 0.3; // Изменение размера шрифта

    if (isNewParagraph && currentBlock.length > 0) {
      // Определяем выравнивание
      const avgIndent = currentBlock.reduce((sum, l) => sum + l.indent, 0) / currentBlock.length;
      let alignment: 'left' | 'center' | 'right' = 'left';
      
      if (avgIndent > pageWidth * 0.3) {
        alignment = 'center';
      } else if (avgIndent > pageWidth * 0.5) {
        alignment = 'right';
      }

      blocks.push({
        lines: currentBlock,
        alignment,
      });
      currentBlock = [];
    }

    currentBlock.push(line);
    lastIndent = line.indent;
    lastY = line.y;
    lastHeight = line.height;
  }

  if (currentBlock.length > 0) {
    const avgIndent = currentBlock.reduce((sum, l) => sum + l.indent, 0) / currentBlock.length;
    let alignment: 'left' | 'center' | 'right' = 'left';
    
    if (avgIndent > pageWidth * 0.3) {
      alignment = 'center';
    } else if (avgIndent > pageWidth * 0.5) {
      alignment = 'right';
    }

    blocks.push({
      lines: currentBlock,
      alignment,
    });
  }

  return blocks;
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

    onProgress({ currentPage: 0, totalPages, status: 'analyzing', message: 'Анализ форматирования...' });

    const pagesContent: PageContent[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress({
        currentPage: pageNum,
        totalPages,
        status: 'analyzing',
        message: `Страница ${pageNum}: анализ текста...`
      });

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });

      // Извлекаем текст с форматированием
      const textContent = await page.getTextContent();
      const textItems: TextItem[] = [];

      for (const item of textContent.items as any[]) {
        if (!item.str || item.str.trim() === '') continue;

        const transform = item.transform;
        const fontSize = Math.abs(transform[0]) || item.height;
        const fontAnalysis = analyzeFont(item.fontName);

        textItems.push({
          str: item.str,
          x: transform[4],
          y: transform[5],
          width: item.width,
          height: item.height,
          fontSize: fontSize,
          fontName: item.fontName,
          isBold: fontAnalysis.isBold,
          isItalic: fontAnalysis.isItalic,
        });
      }

      // Группируем в строки и абзацы
      const lines = groupIntoLines(textItems);
      const blocks = groupIntoBlocks(lines, viewport.width);

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
                x: 0, // Позицию сложно определить из operatorList
                y: 0,
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

      pagesContent.push({
        blocks,
        images,
        width: viewport.width,
        height: viewport.height,
      });
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

      // Добавляем текстовые блоки
      for (const block of pageData.blocks) {
        for (const line of block.lines) {
          const textRuns: TextRun[] = [];

          for (const item of line.items) {
            const runOptions: any = {
              text: item.str,
              size: Math.round(item.fontSize * 2), // конвертируем в half-points
              bold: item.isBold,
              italics: item.isItalic,
            };

            if (item.color) {
              runOptions.color = item.color;
            }

            textRuns.push(new TextRun(runOptions));
          }

          if (textRuns.length > 0) {
            children.push(
              new Paragraph({
                children: textRuns,
                alignment: block.alignment,
                spacing: {
                  after: 100,
                  line: 276, // 1.15 межстрочный интервал
                },
                indent: {
                  left: Math.round(line.indent * 20), // конвертируем в twips
                },
              })
            );
          }
        }

        // Добавляем пустую строку между абзацами
        children.push(
          new Paragraph({
            children: [],
            spacing: { after: 100 },
          })
        );
      }

      // Добавляем изображения
      for (const img of pageData.images) {
        const maxWidth = 450;
        const scale = Math.min(1, maxWidth / img.width);
        const scaledWidth = Math.round(img.width * scale);
        const scaledHeight = Math.round(img.height * scale);

        const data = img.data;
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
