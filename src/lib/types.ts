export type EnforcementAlert = {
  recall_number: string;
  recalling_firm: string;
  product_description: string;
  reason_for_recall: string;
  report_date: string;
  classification: string;
  status: string;
  distribution_pattern?: string;
};

export type EnforcementResponse = {
  results: EnforcementAlert[];
};
