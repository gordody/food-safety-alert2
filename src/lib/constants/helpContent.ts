import type { AboutContent } from "$lib/constants/aboutContent";

export const helpContent: AboutContent = {
  panelLabel: "Help",
  appName: "Using Food Safety Alerts",
  description:
    "Food Safety Alerts lets you browse official recall notices, filter by your location, and open each recall for detailed product and risk information.",
  sections: [
    {
      title: "How to Use the App",
      items: [
        {
          name: "All tab",
          links: [
            {
              label: "Shows the latest nationwide recall feed from openFDA",
              href: "https://open.fda.gov/apis/food/enforcement/",
            },
          ],
        },
        {
          name: "Local tab",
          links: [
            {
              label: "Shows recalls affecting your selected U.S. state",
              href: "https://open.fda.gov/apis/food/enforcement/",
            },
          ],
        },
        {
          name: "Recall details",
          links: [
            {
              label: "Open any recall card to view full product, reason, and distribution details",
              href: "https://open.fda.gov/apis/food/enforcement/",
            },
          ],
        },
      ],
    },
    {
      title: "Alert Classifications",
      description:
        "The classification indicates how severe the potential health impact may be.",
      items: [
        {
          name: "Class I (Critical)",
          links: [
            {
              label: "Reasonable probability of serious adverse health consequences or death",
              href: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
            },
          ],
        },
        {
          name: "Class II (Warning)",
          links: [
            {
              label: "Temporary or medically reversible adverse health consequences are possible",
              href: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
            },
          ],
        },
        {
          name: "Class III (Low risk)",
          links: [
            {
              label: "Not likely to cause adverse health consequences",
              href: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
            },
          ],
        },
      ],
    },
  ],
  copyright: "Need immediate guidance? Contact your local health authority or recall hotline listed in the notice.",
};
