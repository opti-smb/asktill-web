export type ProductType = 'physical' | 'digital' | 'service' | 'subscription';
export type RequirementLevel = 'required' | 'optional' | 'prohibited';
export type EvidenceStatus = 'found' | 'missing' | 'not_applicable' | 'conflicting' | 'rejected';

export type EvidenceRequirement = {
  id?: string;
  template_id?: string;
  evidence_code: string;
  display_name: string;
  requirement_level: RequirementLevel;
  source_preference?: string | null;
  description?: string | null;
  sort_order: number;
};

export type EvidenceTemplate = {
  id: string;
  reason: string;
  product_type: ProductType | string;
  version: number;
  active: boolean;
  effective_from?: string;
  created_by?: string;
  created_at?: string;
  resolution?: string;
  requirements: EvidenceRequirement[];
};

export type ReadinessItem = {
  evidence_code: string;
  display_name: string;
  requirement_level: RequirementLevel;
  status: EvidenceStatus | string;
};

export type PacketOverview = {
  id: string;
  case_id: string;
  merchant_id: string;
  dispute_id: string;
  reason: string;
  product_type: string;
  evidence_template_id: string;
  evidence_template_version?: number | null;
  packet_version: number;
  status: string;
  amount?: number | null;
  currency?: string | null;
  deadline?: string | null;
  lineage_status: string;
  lineage_incomplete_fields?: string[];
  order_status?: string | null;
  delivery_status?: string | null;
  service_status?: string | null;
  policy_at_purchase_status?: string | null;
  policy_acceptance_status?: string | null;
  continue_allowed: boolean;
  readiness: {
    required_found: number;
    required_total: number;
    continue_allowed: boolean;
    items: ReadinessItem[];
  };
  tabs: {
    order: boolean;
    delivery: boolean;
    service: boolean;
    policy: boolean;
    lineage: boolean;
  };
  later_modules?: Array<{ code: string; enabled: boolean }>;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
};

export type LineageField = {
  evidence_code: string;
  value: unknown;
  source_system: string;
  source_object_id?: string | null;
  source_field?: string | null;
  fetched_at?: string | null;
  extractor_version?: string | null;
  status: string;
  source_hash?: string | null;
  canonical?: boolean;
};

export type LineageResponse = {
  status: string;
  incomplete_fields: string[];
  conflicts: Array<{ evidence_code: string; values: Array<{ value: unknown; source_system: string; source_object_id?: string | null }> }>;
  fields: LineageField[];
};

export type OrderProof = {
  status?: string;
  source_system?: string;
  source_order_id?: string;
  order_number?: string | null;
  order_created_at?: string | null;
  currency?: string;
  gross_amount_minor?: number;
  disputed_amount_minor?: number;
  disputed_currency?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  receipt_url?: string | null;
  line_items?: Array<{ title?: string; sku?: string; quantity?: number }>;
  fetched_at?: string;
  extractor_version?: string;
  reconciliation?: string;
  reconciled?: boolean;
  mismatch?: string | null;
};

export type DeliveryProof = {
  status?: string;
  carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  delivery_status?: string;
  delivery_unverified?: boolean;
  signed_delivery_available?: boolean;
  proof_source_id?: string | null;
  source_fulfillment_id?: string | null;
  address_matches_order?: boolean | null;
  item_fulfillment_ok?: boolean;
  item_fulfillment_detail?: string | null;
  fetched_at?: string;
  extractor_version?: string;
};

export type ServiceProof = {
  status?: string;
  hidden?: boolean;
  customer_ref?: string;
  order_ref?: string | null;
  customer_ref_matched?: boolean;
  order_ref_matched?: boolean;
  collection_basis?: string | null;
  retention_policy_version?: string | null;
  forced_review?: boolean;
  forced_review_reason?: string | null;
  events?: Array<{
    event_id?: string;
    event_type?: string;
    occurred_at?: string;
    ip_address?: string | null;
    device_id?: string | null;
    description?: string | null;
  }>;
  fetched_at?: string;
  extractor_version?: string;
};

export type PolicyProof = {
  historical_available: boolean;
  message?: string;
  transaction_date?: string | null;
  policy_type?: string;
  version?: number;
  effective_from?: string | null;
  effective_to?: string | null;
  source_url?: string | null;
  content_hash?: string | null;
  text?: string;
  accepted_at?: string | null;
  acceptance_method?: string | null;
  source_event_id?: string | null;
  missing_acceptance?: boolean;
  current_webpage_used?: boolean;
};
