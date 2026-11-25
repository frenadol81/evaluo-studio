import JSZip from 'jszip';

const imageTypes: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp', avif: 'image/avif',
};

const wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const relationshipNamespace = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export interface PhotoCandidate {
  label: string;
  filename: string;
  folders?: string[];
  read: () => Promise<string>;
}

export function isPhotoImportFile(file: File) {
  return /\.(png|jpe?g|webp|gif|bmp|avif|docx?|odt|zip)$/i.test(file.name);
}

export async function readDroppedPhotoFiles(transfer: DataTransfer): Promise<File[]> {
  const fallback = Array.from(transfer.files);
  const entries = Array.from(transfer.items || []).flatMap(item => {
    const entry = item.webkitGetAsEntry?.();
    return entry ? [entry] : [];
  });
  if (!entries.length) return fallback.filter(isPhotoImportFile);
  const files: File[] = [];
  async function visit(entry: FileSystemEntry, folders: string[]) {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject));
      if (isPhotoImportFile(file)) files.push(Object.assign(file, { photoFolders: folders }));
      return;
    }
    if (!entry.isDirectory) return;
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const path = [...folders, entry.name];
    while (true) {
      const children = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
      if (!children.length) break;
      for (const child of children) await visit(child, path);
    }
  }
  for (const entry of entries) await visit(entry, []);
  return files;
}

export function photoGroupCodes(text: string): string[] {
  const cleaned = text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const matches = cleaned.matchAll(/(?:^|[^\p{L}\p{N}])([1-9])(?:er|rt|r|n|t|e|º|ª)?[\s._-]*([a-z])(?=$|[^\p{L}\p{N}])/gu);
  return [...new Set(Array.from(matches, match => match[1] + match[2].toUpperCase()))];
}

export function photoPlanetRound(text: string): number | undefined {
  const match = /(?:\bplaneta(?:\s+blau)?[\s_-]+(?:ronda[\s_-]+)?|^g_pb_r?)(\d+)(?!\d)/i.exec(text);
  return match ? Number(match[1]) : undefined;
}

export function preselectPhotoProfiles(rows: { ids: string[]; choice: string; possibleTypo?: boolean }[],
  identity: (id: string) => string = id => id) {
  const used = new Set<string>();
  const ordered = [...rows].sort((a, b) =>
    Number(Boolean(a.possibleTypo)) - Number(Boolean(b.possibleTypo)) || a.ids.length - b.ids.length);
  for (const row of ordered) {
    row.choice = row.ids.find(id => !used.has(identity(id))) || '';
    if (row.choice) used.add(identity(row.choice));
  }
}

function differsByOneLetter(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1 || left === right) return false;
  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
  let index = 0;
  while (index < shorter.length && shorter[index] === longer[index]) index++;
  if (shorter.length !== longer.length) return shorter.slice(index) === longer.slice(index + 1);
  return shorter.slice(index + 1) === longer.slice(index + 1) ||
    (shorter[index] === longer[index + 1] && shorter[index + 1] === longer[index] &&
      shorter.slice(index + 2) === longer.slice(index + 2));
}

export function matchStudentPhotos(label: string, names: string[], exactOnly = false, withinClass = false, allowTypos = true): number[] {
  const cleanLabel = (value: string) => normalize(value.replace(/[ºª]/g, ' '))
    .replace(/^(?:(?:[1-9](?:er|rt|r|n|t|e)? ?[a-z]|\d+|foto|fotografia|retrat|nom i cognoms|nom|alumne|alumna) )+/, '')
    .replace(/(?: [1-9](?:er|rt|r|n|t|e)? ?[a-z]| \d+| copia| copy)+$/, '');
  const text = cleanLabel(label);
  const full: number[] = [];
  const abbreviated: number[] = [];
  const significant = (value: string) => value.split(' ').filter(part =>
    part && !['de', 'del', 'd', 'la', 'las', 'les', 'el', 'los', 'i', 'y'].includes(part));
  const words = significant(text);
  names.forEach((name, index) => {
    const clean = cleanLabel(name);
    if (!clean.includes(' ')) return;
    const parts = clean.split(' ');
    const variants = parts.map((_, offset) => [...parts.slice(offset), ...parts.slice(0, offset)].join(' '));
    if (variants.includes(text)) full.push(index);
    else {
      const nameWords = significant(clean);
      const firstName = nameWords[0];
      const surnames = nameWords.slice(1);
      if (words.length === 2 &&
          ((words[0] === firstName && surnames.includes(words[1])) ||
           (words[1] === firstName && surnames.includes(words[0])))) abbreviated.push(index);
      else if (words.length >= 2 && words.length === nameWords.length &&
          nameWords.some((_, offset) => [...nameWords.slice(offset), ...nameWords.slice(0, offset)].join(' ') === words.join(' '))) {
        abbreviated.push(index);
      }
    }
  });
  if (full.length) return full;
  if (text) {
    const labelParts = text.split(' ');
    const comma = label.indexOf(',');
    const firstName = (comma >= 0 ? cleanLabel(label.slice(comma + 1)) : text).split(' ')[0];
    const sameFirstName = names.flatMap((name, index) =>
      cleanLabel(name).split(' ')[0] === firstName ? [index] : []);
    if (labelParts.length === 1 && sameFirstName.length) return sameFirstName;
    if (withinClass && sameFirstName.some(index => !cleanLabel(names[index]).includes(' '))) {
      return sameFirstName;
    }
  }
  if (exactOnly) return [];
  if (abbreviated.length || !allowTypos) return abbreviated;
  if (words.length === 0 || (words.length === 1 && (!withinClass || words[0].length < 5))) return [];

  return names.flatMap((name, index) => {
    const nameWords = significant(cleanLabel(name));
    const shorter = nameWords.slice(0, words.length);
    const candidates = words.length === 1 ? [shorter] : [
      ...nameWords.map((_, offset) => [...nameWords.slice(offset), ...nameWords.slice(0, offset)]),
      shorter,
      [...shorter].reverse(),
    ];
    const matches = candidates.some(candidate => {
      if (candidate.length !== words.length) return false;
      const different = words.flatMap((word, i) => word === candidate[i] ? [] : [i]);
      return different.length === 1 && words[different[0]].length >= 4 &&
        differsByOneLetter(words[different[0]], candidate[different[0]]);
    });
    return matches ? [index] : [];
  });
}

async function preparePhoto(blob: Blob): Promise<Blob> {
  const image = await createImageBitmap(blob);
  try {
    if (blob.size < 300_000) return blob;
    const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No es pot preparar la imatge.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const reduced = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.88));
    return reduced && reduced.size < blob.size ? reduced : blob;
  } finally {
    image.close();
  }
}

function imageCandidate(filename: string, label: string, read: () => Promise<Blob>): PhotoCandidate | undefined {
  const type = imageTypes[filename.split('.').pop()?.toLowerCase() || ''];
  if (!type) return;
  return {
    filename,
    label,
    read: async () => {
      const blob = await preparePhoto(new Blob([await read()], { type }));
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    },
  };
}

function parseXml(text: string) {
  const xml = new DOMParser().parseFromString(text, 'application/xml');
  if (xml.getElementsByTagName('parsererror').length) throw new Error('El document conté XML invàlid.');
  return xml;
}

async function readWordPhotos(data: ArrayBuffer, names: string[], withinClass: boolean): Promise<PhotoCandidate[]> {
  const zip = await JSZip.loadAsync(data);
  const document = zip.file('word/document.xml');
  const relationships = zip.file('word/_rels/document.xml.rels');
  if (!document) throw new Error('El fitxer Word no conté un document vàlid.');
  if (!relationships) return [];

  const filesById = new Map<string, string>();
  for (const element of Array.from(parseXml(await relationships.async('text')).getElementsByTagNameNS('*', 'Relationship'))) {
    const id = element.getAttribute('Id');
    const target = element.getAttribute('Target');
    if (!id || !target || element.getAttribute('TargetMode') === 'External' ||
        !element.getAttribute('Type')?.endsWith('/image')) continue;
    const path = target.startsWith('/') ? target.slice(1) : `word/${target}`;
    if (path.startsWith('word/media/')) filesById.set(id, path);
  }

  const xml = parseXml(await document.async('text'));
  const paragraphs = Array.from(xml.getElementsByTagNameNS(wordNamespace, 'p'));
  const text = (element: Element) => Array.from(element.getElementsByTagNameNS(wordNamespace, 'p'))
    .map(p => Array.from(p.getElementsByTagNameNS(wordNamespace, 't'), t => t.textContent).join('')).join(' ').trim();
  const paragraphText = (p: Element) => Array.from(p.getElementsByTagNameNS(wordNamespace, 't'), t => t.textContent).join('').trim();
  const photos: PhotoCandidate[] = [];
  const matchesCaption = (caption: string, exactOnly = false) =>
    matchStudentPhotos(caption, names, exactOnly, withinClass).length > 0;
  const isImage = (element: Element) => element.localName === 'blip' || element.localName === 'imagedata';
  const countImages = (element: Element) => Array.from(element.getElementsByTagName('*')).filter(isImage).length;
  const rowCells = (row: Element) => Array.from(row.children).filter(child =>
    child.namespaceURI === wordNamespace && child.localName === 'tc');

  for (const paragraph of paragraphs) {
    const elements = Array.from(paragraph.getElementsByTagName('*'));
    const images = elements.filter(isImage);
    const inlineCaptions = new Map<Element, string>();
    if (images.length > 1) {
      let caption = '';
      for (const element of elements) {
        if (isImage(element)) {
          inlineCaptions.set(element, caption.trim());
          caption = '';
        } else if (element.namespaceURI === wordNamespace) {
          if (element.localName === 't') caption += element.textContent || '';
          if (element.localName === 'tab' || element.localName === 'br') caption += ' ';
        }
      }
      const captions = [...inlineCaptions.values()];
      const trailing = caption.trim();
      if (!captions[0] && trailing && captions.slice(1).every(Boolean)) {
        images.forEach((image, index) => inlineCaptions.set(image, captions[index + 1] || trailing));
      } else if (captions.some(value => !value) || trailing) {
        inlineCaptions.clear();
      }
    }
    for (const image of images) {
      const id = image.getAttributeNS(relationshipNamespace, 'embed') || image.getAttributeNS(relationshipNamespace, 'id');
      const path = id && filesById.get(id);
      const entry = path && zip.file(path);
      if (!entry || !path) continue;

      let cell = paragraph.parentElement;
      while (cell && (cell.namespaceURI !== wordNamespace || cell.localName !== 'tc')) {
        cell = cell.parentElement;
      }
      const row = cell?.parentElement;
      const labels = images.length > 1 ? [inlineCaptions.get(image) || ''] : [paragraphText(paragraph)];
      let drawing = image.parentElement;
      while (drawing && drawing !== paragraph && drawing.localName !== 'inline' && drawing.localName !== 'anchor') {
        drawing = drawing.parentElement;
      }
      if (drawing && drawing !== paragraph) {
        const properties = Array.from(drawing.children).find(element => element.localName === 'docPr');
        for (const attribute of ['descr', 'title']) {
          const label = properties?.getAttribute(attribute);
          if (label) labels.unshift(label);
        }
      }
      if (cell && countImages(cell) === 1) labels.push(text(cell));
      if (images.length === 1 && row && countImages(row) === 1) labels.push(text(row));
      if (!labels.some(value => matchesCaption(value))) {
        const container = row && countImages(row) === 1 ? row : cell && countImages(cell) === 1 ? cell : null;
        if (container) {
          const captions = Array.from(container.getElementsByTagNameNS(wordNamespace, 'p'), paragraphText)
            .filter(value => matchesCaption(value, true));
          if (new Set(captions.map(normalize)).size === 1) labels.push(captions[0]);
        }
      }
      if (cell && row && countImages(cell) === 1 && !labels.some(value => matchesCaption(value))) {
        const cells = rowCells(row);
        const column = cells.indexOf(cell);
        const captions = [row.previousElementSibling, row.nextElementSibling].flatMap(neighbor => {
          if (column < 0 || !neighbor || neighbor.localName !== 'tr' || countImages(neighbor)) return [];
          const adjacentCells = rowCells(neighbor);
          if (adjacentCells.length !== cells.length || [...cells, ...adjacentCells].some(item =>
            item.getElementsByTagNameNS(wordNamespace, 'gridSpan').length ||
            item.getElementsByTagNameNS(wordNamespace, 'vMerge').length)) return [];
          const caption = text(adjacentCells[column]);
          return matchesCaption(caption) ? [caption] : [];
        });
        if (new Set(captions.map(normalize)).size === 1) labels.push(captions[0]);
      }
      if (withinClass && images.length === 1 && !labels.some(value => matchesCaption(value))) {
        const next = paragraph.nextElementSibling;
        if (next?.namespaceURI === wordNamespace && next.localName === 'p' && !countImages(next)) {
          const caption = paragraphText(next);
          if (matchesCaption(caption, true)) labels.push(caption);
        }
      }
      const label = labels.find(value => matchesCaption(value)) || labels.find(Boolean) || '';
      const photo = imageCandidate(path, label, () => entry.async('blob'));
      if (photo) photos.push(photo);
    }
  }
  return photos;
}

export async function readStudentPhotos(file: File, names: string[], withinClass = false): Promise<PhotoCandidate[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'docx') return readWordPhotos(await file.arrayBuffer(), names, withinClass);
  if (extension === 'doc' || extension === 'odt') {
    const response = await fetch(`/api/student-photos/convert/${extension}`, {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'No s’ha pogut convertir el document a DOCX.');
    }
    return readWordPhotos(await response.arrayBuffer(), names, withinClass);
  }
  if (extension === 'zip') {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    return Object.values(zip.files).flatMap(entry => {
      if (entry.dir || entry.name.includes('__MACOSX/')) return [];
      const filename = entry.name.split('/').pop() || entry.name;
      const candidate = imageCandidate(filename, filename.replace(/\.[^.]+$/, ''), () => entry.async('blob'));
      return candidate ? [{ ...candidate, folders: entry.name.split('/').slice(0, -1) }] : [];
    });
  }
  const extensionFromMime = Object.entries(imageTypes).find(([, type]) => type === file.type)?.[0];
  const filename = extensionFromMime && (!extension || !imageTypes[extension])
    ? `${file.name}.${extensionFromMime}` : file.name;
  const photo = imageCandidate(filename, file.name.replace(/\.[^.]+$/, ''), async () => file);
  if (!photo) throw new Error('Format no compatible.');
  return [photo];
}
