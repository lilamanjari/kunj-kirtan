export type LeadItem = {
  id: string;
  display_name: string;
  slug: string;
};

export type LeadGroup = {
  letter: string;
  items: LeadItem[];
};
