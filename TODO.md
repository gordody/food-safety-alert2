# TODO

x Move nav-bar to its own file so it's reusable across screens if needed
x Extract the bottom tab bar into its own reusable component
o Wire the All, Local, Custom, and Search tabs to real behavior
  x All tab
  o Local Tab - filter for Local alerts
    x after the navbar, there is a location bar. 
    x the location bar has a switch for "Auto"
    x By default, auto mode tries to get the user's location and if it succeeds, it displays it in the form of
      a standard U.S. Address up to the city level.
    x if the location bar can't get the user location, auto mode switches off and a "state" dropdown appears
    x the location is saved to the default phone user preferences storage (use the appropriate Tauri Store plugin)
  o Custom tab - filter for custom criteria: location, severity, date range, class, firm, keywords and terms
    o keyword examples: contains undeclared allergen "X", contamination
    o location: detected or manually set
o Create an About page describing all 3rd party api-s and technologies and their licenses
  o FDA, openFDA
  o USDA, FSIS APIs
  o openstreetmap and api
  o tauri
  o svelte, sveltekit
  o typescript
  o pnpm
  o copyright notice: Gyorgy Ordody (c) 2026
o Make the selected tab actually filter the content for All, Local, and Custom
o Add a proper search field/sheet for the Search tab
o Format alerts so the product title is more prominent than the rest
x Move utility functions like `formatDate` to their own folder / file
o Wire each alert item to a dedicated details view route.
o Add location-aware filtering (state/distribution pattern) before rendering.
o Connect the Customize Alerts button to a real filter/preferences screen.
o Detail images
  x MVP: manual override map + placeholder fallback
  x Add one external UPC/GTIN image provider + local cache
  o Add fuzzy matching and confidence scoring
  o Add background refresh + broken-link revalidation
