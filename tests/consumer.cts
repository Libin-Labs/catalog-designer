import {
  planCatalog,
  renderCatalogSvg,
  type CatalogImage,
  type CatalogOptions,
  type CatalogPlacement,
  type CatalogPlan,
  type CatalogProduct,
  type ImageFit,
} from '@lp-labs/catalog-designer';
const image: CatalogImage = { width: 100, height: 80, alt: 'Product' };
const product: CatalogProduct = { id: 'book', name: 'Book', image };
const options: CatalogOptions = { pageWidth: 612, pageHeight: 792, imageFit: 'cover' };
const plan: CatalogPlan = planCatalog([product], options);
const placement: CatalogPlacement | undefined = plan.placements[0];
const fit: ImageFit | undefined = placement?.image;
const svg: string = renderCatalogSvg(plan);
void fit;
void svg;
// @ts-expect-error fit mode is restricted
const badFit: CatalogOptions['imageFit'] = 'stretch';
void badFit;
