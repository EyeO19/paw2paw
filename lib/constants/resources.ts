export type CampusResource = {
  id: string;
  name: string;
  href: string;
  description: string;
};

export const CAMPUS_RESOURCES: CampusResource[] = [
  {
    id: "cps-cares",
    name: "CPS Cares Line (24/7)",
    href: "https://uhs.princeton.edu/counseling-psychological-services/cares",
    description: "Urgent counseling support from Princeton Health Services.",
  },
  {
    id: "share",
    name: "SHARE",
    href: "https://sexualmisconduct.princeton.edu/",
    description: "Support for sexual misconduct concerns.",
  },
  {
    id: "gsrc",
    name: "GSRC",
    href: "https://lgbtq.princeton.edu/",
    description: "Gender and sexuality resource center.",
  },
  {
    id: "fields",
    name: "Carl A. Fields Center",
    href: "https://fields.princeton.edu/",
    description: "Support for students of color.",
  },
  {
    id: "disability",
    name: "Disability Services",
    href: "https://ods.princeton.edu/",
    description: "Accommodations and disability-related support.",
  },
];
