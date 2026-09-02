export type LeadItem = {
  id: string;
  display_name: string;
  slug: string;
  count: number;
  image_url?: string | null;
  image_alt?: string | null;
  image_focus_x?: number | null;
  image_focus_y?: number | null;
};

export type LeadGroup = {
  letter: string;
  items: LeadItem[];
};
