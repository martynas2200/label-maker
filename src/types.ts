
export interface Item {
  item_code: string;
  item_name: string;
  item_group: string;
  stock_uom: string;
  deposit_package_count: number; //TODO: Add a frappe custom field in the app
  image: string;
  disabled: boolean;
  allow_alternative_item: boolean;
  is_stock_item: boolean;
  has_variants: boolean;
  valuation_rate: number;
  standard_rate: number;
  is_fixed_asset: boolean;
  auto_create_assets: boolean;
  is_grouped_asset: boolean;
  asset_category: string;
  asset_naming_series: string;
  over_delivery_receipt_allowance: number;
  over_billing_allowance: number;
  description: string;
  brand: string;
  shelf_life_in_days: number;
  end_of_life: string;
  default_material_request_type: string;
  valuation_method: string;
  opening_stock: number;
  naming_series: string;
  warranty_period: string;
  weight_per_unit: number;
  weight_uom: string;
  allow_negative_stock: boolean;
  has_batch_no: boolean;
  create_new_batch: boolean;
  batch_number_series: string;
  has_expiry_date: boolean;
  retain_sample: boolean;
  sample_quantity: number;
  has_serial_no: boolean;
  serial_no_series: string;
  variant_of: string;
  variant_based_on: string;
  enable_deferred_expense: boolean;
  no_of_months_exp: number;
  enable_deferred_revenue: boolean;
  no_of_months: number;
  purchase_uom: string;
  min_order_qty: number;
  safety_stock: number;
  is_purchase_item: boolean;
  lead_time_days: number;
  last_purchase_rate: number;
  is_customer_provided_item: boolean;
  customer: string;
  delivered_by_supplier: boolean;
  country_of_origin: string;
  customs_tariff_number: string
  sales_uom: string
  grant_commission: boolean;
  is_sales_item: boolean;
  max_discount: number;
  inspection_required_before_purchase: boolean;
  quality_inspection_template: string
  inspection_required_before_delivery: boolean;
  include_item_in_manufacturing: boolean;
  is_sub_contracted_item: boolean;
  default_bom: string
  customer_code: string
  default_item_manufacturer: string
  default_manufacturer_part_no: string
  stock_qty: number;
  taxes: Array<{
    charge_type: string;
    account_head: string;
    description: string;
    rate: number;
  }>;
  // customer_items: [];
  // supplier_items: [];
  // item_defaults: [];
  attributes: Array<{
    attribute: string;
    attribute_value: string;
  }>;
  reorder_levels: Array<{
    warehouse: string;
    reorder_level: number;
    reorder_qty: number;
    preferred_supplier: string;
  }>;
  uoms: Array<{
    uom: string;
    conversion_factor: number;
  }>;
  barcodes: Array<{
    barcode: string;
    uom: string;
  }>;

  // Helper method to get the first barcode
  getBarcode(): string | null;
}

export interface PackagedItem extends Item {
  expiry_date: string;
  add_package_fee?: boolean;
  add_manufacturer?: boolean;
  total_price?: number;
  weight?: number | string;
}
