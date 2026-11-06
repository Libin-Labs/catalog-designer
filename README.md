# @lp-labs/catalog-designer

Deterministic product-grid planning, geometric image fitting, page numbers, and standalone safe SVG
output. Product images are metadata/placeholders; this package never fetches or embeds image assets.

## Install and quickstart

```sh
npm install @lp-labs/catalog-designer
```

```js
import { planCatalog, renderCatalogSvg } from '@lp-labs/catalog-designer';

const plan = planCatalog(
  [
    {
      id: 'mug',
      name: 'Stoneware mug',
      description: '12 oz',
      priceMinor: 2400,
      currency: 'USD',
      image: { width: 1200, height: 900, alt: 'Blue mug' },
    },
  ],
  { pageWidth: 612, pageHeight: 792, columns: 2, rows: 3, imageFit: 'contain' },
);
console.log(plan.pages, plan.placements[0].pageNumber);
console.log(renderCatalogSvg(plan));
```

## API and types

- `planCatalog(products, options): CatalogPlan` validates and snapshots products and creates a
  deterministic row-major grid. Pages are one-based in placements.
- `renderCatalogSvg(plan): string` generates standalone SVG text with escaped labels, product
  image placeholders, product text, page numbers, and a catalog accessible name.
- `CatalogProduct`: unique `id`, nonempty `name`, optional `description`, nonnegative integer
  `priceMinor`, three-letter uppercase `currency`, and optional image dimensions/alt text.
- `CatalogOptions`: required page width/height; optional rows, columns, margin, gutter,
  `imageFit` (`contain` or `cover`), and capacity limits.
- `CatalogPlacement` includes page, cell bounds and `ImageFit` coordinates/scale/crop offsets.

## Customization, errors, and limits

The planner computes image fit rectangles; it does not open files, load URLs, inspect image content,
or supply a PDF/print engine. SVG output deliberately displays a labeled placeholder, not a remote
image URL. Embed images using your own trusted renderer or asset pipeline. Product text is XML
escaped. Money remains integer minor units in the plan; SVG uses a basic two-decimal display and
does not apply locale-specific currency formatting.

Defaults/caps: 10,000 products, 1,000 pages, 100 rows and columns per page, 100,000 page units, and
1,000,000 image dimension units. A product grid may have fractional cell dimensions. Malformed
identifiers, text, currencies, and fit modes throw `TypeError`; invalid geometry, prices, or capacity
throws `RangeError`. Planning is O(products); rendering is O(products × pages) with bounded input.

## Modules and development

Independent ESM/CommonJS and declarations, zero runtime/peer dependencies.
CommonJS: `const { planCatalog } = require('@lp-labs/catalog-designer')`.
TypeScript ^5.9.3 and Prettier ^3.6.2 are development-only.
Run `npm run build`, `npm run typecheck`, `npm test`, `npm run format`, `npm run format:check`.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
