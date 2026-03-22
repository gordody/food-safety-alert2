export type AboutLink = {
  label: string;
  href: string;
};

export type AboutItem = {
  name: string;
  links: AboutLink[];
};

export type AboutSection = {
  title: string;
  description?: string;
  items?: AboutItem[];
};

export type AboutContent = {
  panelLabel: string;
  appName: string;
  description: string;
  sections: AboutSection[];
  copyright: string;
};

export const aboutContent: AboutContent = {
  panelLabel: "About",
  appName: "Food Safety Alerts",
  description:
    "Food Safety Alerts helps you browse official U.S. recall reports, check local impact, and review recall details in a mobile-friendly format.",
  sections: [
    {
      title: "APIs and Data Sources",
      items: [
        {
          name: "FDA openFDA API",
          links: [{ label: "API docs and terms", href: "https://open.fda.gov/apis/" }],
        },
        {
          name: "USDA FSIS Data APIs",
          links: [{ label: "Developer portal", href: "https://www.fsis.usda.gov/developer" }],
        },
        {
          name: "OpenStreetMap / Nominatim",
          links: [
            {
              label: "Usage policy",
              href: "https://operations.osmfoundation.org/policies/nominatim/",
            },
            {
              label: "License (ODbL)",
              href: "https://www.openstreetmap.org/copyright",
            },
          ],
        },
      ],
    },
    {
      title: "Technologies and Licenses",
      items: [
        {
          name: "Tauri",
          links: [
            {
              label: "MIT",
              href: "https://github.com/tauri-apps/tauri/blob/dev/LICENSE_MIT",
            },
            {
              label: "Apache-2.0",
              href: "https://github.com/tauri-apps/tauri/blob/dev/LICENSE_APACHE-2.0",
            },
          ],
        },
        {
          name: "Svelte",
          links: [{ label: "MIT", href: "https://github.com/sveltejs/svelte/blob/main/LICENSE.md" }],
        },
        {
          name: "SvelteKit",
          links: [{ label: "MIT", href: "https://github.com/sveltejs/kit/blob/main/LICENSE" }],
        },
        {
          name: "TypeScript",
          links: [
            {
              label: "Apache-2.0",
              href: "https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt",
            },
          ],
        },
        {
          name: "pnpm",
          links: [{ label: "MIT", href: "https://github.com/pnpm/pnpm/blob/main/LICENSE" }],
        },
      ],
    },
  ],
  copyright: "© Gyorgy Ordody, 2026",
};