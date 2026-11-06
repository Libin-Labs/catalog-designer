export interface CatalogImage {
  readonly width: number;
  readonly height: number;
  readonly alt: string;
}

export interface CatalogProduct {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly priceMinor?: number;
  readonly currency?: string;
  readonly image?: CatalogImage;
}

export interface CatalogOptions {
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly columns?: number;
  readonly rows?: number;
  readonly margin?: number;
  readonly gutter?: number;
  readonly imageFit?: 'contain' | 'cover';
  readonly maxProducts?: number;
  readonly maxPages?: number;
}

export interface ImageFit {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly cropX: number;
  readonly cropY: number;
}

export interface CatalogPlacement {
  readonly product: CatalogProduct;
  readonly page: number;
  readonly pageNumber: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly image: ImageFit;
}

export interface CatalogPlan {
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly pages: number;
  readonly placements: readonly CatalogPlacement[];
}

function text(value: unknown, name: string, maximum = 2000): string {
  if (
    typeof value !== 'string' ||
    value.length > maximum ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)
  )
    throw new TypeError(`${name} must be plain text of at most ${maximum} characters.`);
  return value;
}

function positive(value: number, name: string, ceiling: number): number {
  if (!Number.isFinite(value) || value <= 0 || value > ceiling)
    throw new RangeError(`${name} must be positive and at most ${ceiling}.`);
  return value;
}

function count(value: number | undefined, fallback: number, ceiling: number, name: string): number {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < 1 || result > ceiling)
    throw new RangeError(`${name} must be an integer from 1 to ${ceiling}.`);
  return result;
}

function fitImage(
  sourceWidth: number,
  sourceHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
  fit: 'contain' | 'cover',
): ImageFit {
  const scale =
    fit === 'contain'
      ? Math.min(width / sourceWidth, height / sourceHeight)
      : Math.max(width / sourceWidth, height / sourceHeight);
  const fittedWidth = sourceWidth * scale;
  const fittedHeight = sourceHeight * scale;
  return Object.freeze({
    x: x + (width - fittedWidth) / 2,
    y: y + (height - fittedHeight) / 2,
    width: fittedWidth,
    height: fittedHeight,
    scale,
    cropX: Math.max(0, (fittedWidth - width) / 2),
    cropY: Math.max(0, (fittedHeight - height) / 2),
  });
}

/** Plans deterministic product pages and geometric image fitting; it does not fetch image assets. */
export function planCatalog(
  products: readonly CatalogProduct[],
  options: CatalogOptions,
): CatalogPlan {
  if (!Array.isArray(products)) throw new TypeError('products must be an array.');
  const maxProducts = count(options.maxProducts, 10_000, 100_000, 'maxProducts');
  const maxPages = count(options.maxPages, 1000, 10_000, 'maxPages');
  if (products.length > maxProducts) throw new RangeError('Product limit exceeded.');
  const pageWidth = positive(options.pageWidth, 'pageWidth', 100_000);
  const pageHeight = positive(options.pageHeight, 'pageHeight', 100_000);
  const columns = count(options.columns, 2, 100, 'columns');
  const rows = count(options.rows, 3, 100, 'rows');
  const margin = options.margin ?? 24;
  const gutter = options.gutter ?? 12;
  if (!Number.isFinite(margin) || margin < 0 || !Number.isFinite(gutter) || gutter < 0)
    throw new RangeError('margin and gutter must be finite and nonnegative.');
  if (margin * 2 >= pageWidth || margin * 2 >= pageHeight)
    throw new RangeError('Margins must leave positive page content space.');
  if (
    options.imageFit !== undefined &&
    options.imageFit !== 'contain' &&
    options.imageFit !== 'cover'
  )
    throw new TypeError('imageFit must be contain or cover.');
  const cellWidth = (pageWidth - margin * 2 - gutter * (columns - 1)) / columns;
  const cellHeight = (pageHeight - margin * 2 - gutter * (rows - 1)) / rows;
  if (cellWidth <= 0 || cellHeight <= 0) throw new RangeError('Grid does not fit inside the page.');
  const ids = new Set<string>();
  const placements = products.map((product, index) => {
    if (!product || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/u.test(product.id) || ids.has(product.id))
      throw new TypeError('Product ids must be unique safe identifiers.');
    ids.add(product.id);
    text(product.name, 'product name', 300);
    if (!product.name) throw new TypeError('Product name must not be empty.');
    if (product.description !== undefined) text(product.description, 'description');
    if (
      product.priceMinor !== undefined &&
      (!Number.isSafeInteger(product.priceMinor) || product.priceMinor < 0)
    )
      throw new RangeError('priceMinor must be a nonnegative safe integer.');
    if (product.currency !== undefined && !/^[A-Z]{3}$/u.test(product.currency))
      throw new TypeError('currency must be a three-letter uppercase code.');
    const image = product.image;
    if (image) {
      positive(image.width, 'image width', 1_000_000);
      positive(image.height, 'image height', 1_000_000);
      text(image.alt, 'image alt text', 500);
    }
    const page = Math.floor(index / (columns * rows)) + 1;
    if (page > maxPages) throw new RangeError('Page limit exceeded.');
    const slot = index % (columns * rows);
    const column = slot % columns;
    const row = Math.floor(slot / columns);
    const x = margin + column * (cellWidth + gutter);
    const y = margin + row * (cellHeight + gutter);
    const imageBoxHeight = cellHeight * 0.58;
    const fit = image
      ? fitImage(
          image.width,
          image.height,
          x,
          y,
          cellWidth,
          imageBoxHeight,
          options.imageFit ?? 'contain',
        )
      : Object.freeze({ x, y, width: 0, height: 0, scale: 0, cropX: 0, cropY: 0 });
    const snapshot = Object.freeze({
      ...product,
      ...(image ? { image: Object.freeze({ ...image }) } : {}),
    });
    return Object.freeze({
      product: snapshot,
      page,
      pageNumber: page,
      x,
      y,
      width: cellWidth,
      height: cellHeight,
      image: fit,
    });
  });
  return Object.freeze({
    pageWidth,
    pageHeight,
    pages: products.length ? Math.ceil(products.length / (columns * rows)) : 0,
    placements: Object.freeze(placements),
  });
}

function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/gu,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[character]!,
  );
}

function svgNumber(value: number): string {
  return Number(value.toFixed(3)).toString();
}

/** Produces standalone safe SVG with product text, image placeholders, and page numbers. */
export function renderCatalogSvg(plan: CatalogPlan): string {
  if (
    !plan ||
    !Number.isFinite(plan.pageWidth) ||
    plan.pageWidth <= 0 ||
    plan.pageWidth > 100_000 ||
    !Number.isFinite(plan.pageHeight) ||
    plan.pageHeight <= 0 ||
    plan.pageHeight > 100_000 ||
    !Number.isSafeInteger(plan.pages) ||
    plan.pages < 0 ||
    plan.pages > 10_000 ||
    !Array.isArray(plan.placements) ||
    plan.placements.length > 100_000
  )
    throw new TypeError('Expected a bounded catalog plan.');
  const placementsByPage = new Map<number, CatalogPlacement[]>();
  for (const placement of plan.placements) {
    if (
      !placement ||
      !Number.isSafeInteger(placement.page) ||
      placement.page < 1 ||
      placement.page > plan.pages
    )
      throw new TypeError('Catalog placements must reference a valid one-based page.');
    const bucket = placementsByPage.get(placement.page) ?? [];
    bucket.push(placement);
    placementsByPage.set(placement.page, bucket);
  }
  const pages: string[] = [];
  for (let page = 1; page <= plan.pages; page += 1) {
    const cards = (placementsByPage.get(page) ?? [])
      .map((placement) => {
        const coordinates = [
          placement.x,
          placement.y,
          placement.width,
          placement.height,
          placement.image?.x,
          placement.image?.y,
          placement.image?.width,
          placement.image?.height,
        ];
        if (
          !placement.product ||
          !coordinates.every((value) => Number.isFinite(value) && Math.abs(value!) <= 100_000)
        )
          throw new TypeError('Catalog placement geometry must be finite and bounded.');
        text(placement.product.name, 'product name', 300);
        if (placement.product.description !== undefined)
          text(placement.product.description, 'description');
        if (placement.product.image) text(placement.product.image.alt, 'image alt text', 500);
        const { product } = placement;
        const image = product.image
          ? `<rect x="${svgNumber(placement.x)}" y="${svgNumber(placement.y)}" width="${svgNumber(placement.width)}" height="${svgNumber(placement.height * 0.58)}" fill="#f1f3f5"/><text x="${svgNumber(placement.x + placement.width / 2)}" y="${svgNumber(placement.y + placement.height * 0.3)}" text-anchor="middle" font-size="12">${escapeXml(product.image.alt || 'Product image')}</text>`
          : '';
        const price =
          product.priceMinor === undefined
            ? ''
            : `${(product.priceMinor / 100).toFixed(2)} ${product.currency ?? ''}`;
        return `${image}<text x="${svgNumber(placement.x)}" y="${svgNumber(placement.y + placement.height * 0.68)}" font-size="14">${escapeXml(product.name)}</text><text x="${svgNumber(placement.x)}" y="${svgNumber(placement.y + placement.height * 0.78)}" font-size="11">${escapeXml(product.description ?? '')}</text><text x="${svgNumber(placement.x)}" y="${svgNumber(placement.y + placement.height * 0.9)}" font-size="12">${escapeXml(price)}</text>`;
      })
      .join('');
    pages.push(
      `<g data-page="${page}">${cards}<text x="${svgNumber(plan.pageWidth / 2)}" y="${svgNumber(plan.pageHeight - 8)}" text-anchor="middle" font-size="10">${page} / ${plan.pages}</text></g>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgNumber(plan.pageWidth)}" height="${svgNumber(plan.pageHeight)}" viewBox="0 0 ${svgNumber(plan.pageWidth)} ${svgNumber(plan.pageHeight)}" role="img" aria-label="Product catalog">${pages.join('')}</svg>`;
}
