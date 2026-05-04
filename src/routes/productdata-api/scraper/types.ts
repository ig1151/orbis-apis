export interface ProductData {
  title:        string | null;
  price:        number | null;
  currency:     string | null;
  availability: 'in_stock' | 'out_of_stock' | null;
  images:       string[];
  brand:        string | null;
  sku:          string | null;
  description:  string | null;
  rating:       number | null;
  review_count: number | null;
  source:       string;
}
