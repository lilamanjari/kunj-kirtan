export type LeadItem = {
  id: string;
  display_name: string;
  slug: string;
  count: number;
};

export type LeadGroup = {
  letter: string;
  items: LeadItem[];
};
