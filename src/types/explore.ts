export type LeadItem = {
  id: string;
  display_name: string;
  slug: string;
  count: number;
  image_url?: string | null;
  image_alt?: string | null;
};

export type LeadGroup = {
  letter: string;
  items: LeadItem[];
};
