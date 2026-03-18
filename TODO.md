# TODO

x Move nav-bar to its own file so it's reusable across screens if needed
x Extract the bottom tab bar into its own reusable component
o Wire the All, Local, Custom, and Search tabs to real behavior
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
