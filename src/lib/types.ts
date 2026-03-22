export type EnforcementAlert = {
  recall_number: string;
  recalling_firm: string;
  product_description: string;
  reason_for_recall: string;
  city?: string;
  state?: string;
  country?: string;
  report_date: string;
  classification: string;
  status: string;
  recall_initiation_date?: string;
  termination_date?: string;
  distribution_pattern?: string;
};

export type EnforcementResponse = {
  results: EnforcementAlert[];
  meta?: {
    last_page: number;
    total_pages: number;
    results?: {
      skip: number;
      limit: number;
      total: number;
    };
  };
};
