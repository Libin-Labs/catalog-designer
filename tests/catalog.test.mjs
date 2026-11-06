import test from 'node:test';
import assert from 'node:assert/strict';
import { planCatalog, renderCatalogSvg } from '../dist/esm/index.js';

const products = [
  {
    id: 'chair',
    name: 'Chair',
    description: 'Wood',
    priceMinor: 12500,
    currency: 'USD',
    image: { width: 800, height: 400, alt: 'Chair photo' },
  },
  {
    id: 'lamp',
    name: 'Lamp',
    priceMinor: 5000,
    image: { width: 300, height: 600, alt: 'Lamp photo' },
  },
];
const options = {
  pageWidth: 240,
  pageHeight: 300,
  columns: 1,
  rows: 1,
  margin: 10,
  imageFit: 'contain',
};

test('creates repeatable product layouts with fitted image geometry and page numbers', () => {
  const plan = planCatalog(products, options);
  assert.equal(plan.pages, 2);
  assert.equal(plan.placements[0].pageNumber, 1);
  assert.equal(plan.placements[1].pageNumber, 2);
  assert.ok(plan.placements[0].image.width <= plan.placements[0].width + 1e-9);
  assert.ok(plan.placements[0].image.height <= plan.placements[0].height * 0.58 + 1e-9);
  assert.deepEqual(planCatalog(products, options), plan);
});

test('renders complete deterministic SVG and escapes untrusted product strings', () => {
  const plan = planCatalog(
    [
      {
        id: 'a',
        name: '<script>alert(1)</script>',
        image: { width: 1, height: 2, alt: '& photo' },
      },
    ],
    options,
  );
  const svg = renderCatalogSvg(plan);
  assert.match(svg, /&lt;script&gt;/u);
  assert.doesNotMatch(svg, /<script>/u);
  assert.match(svg, /1 \/ 1/u);
  assert.match(svg, /&amp; photo/u);
  assert.throws(
    () =>
      renderCatalogSvg({
        pageWidth: 100,
        pageHeight: 100,
        pages: 1,
        placements: [{ page: 1, x: '<script>', product: {} }],
      }),
    TypeError,
  );
});

test('supports image cover crop geometry and empty catalogs', () => {
  const plan = planCatalog(products.slice(1), { ...options, imageFit: 'cover' });
  assert.ok(plan.placements[0].image.cropY > 0);
  assert.equal(planCatalog([], options).pages, 0);
});

test('rejects duplicate ids, unsafe prices and invalid image dimensions', () => {
  assert.throws(() => planCatalog([products[0], products[0]], options), TypeError);
  assert.throws(() => planCatalog([{ id: 'p', name: 'P', priceMinor: -1 }], options), RangeError);
  assert.throws(
    () => planCatalog([{ id: 'p', name: 'P', image: { width: 0, height: 10, alt: '' } }], options),
    RangeError,
  );
});

test('enforces grid, page, product and dimension bounds', () => {
  assert.throws(() => planCatalog(products, { ...options, columns: 0 }), RangeError);
  assert.throws(() => planCatalog(products, { ...options, pageWidth: 10, margin: 5 }), RangeError);
  assert.throws(() => planCatalog(products, { ...options, maxProducts: 1 }), RangeError);
  assert.throws(() => planCatalog(products, { ...options, maxPages: 1 }), RangeError);
});
