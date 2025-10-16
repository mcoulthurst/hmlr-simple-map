# GDS Prototype kit: Map component

Work in progress: a simple map component.

To run locally, download this repo.

Install the component into your prototype using a file path location, eg

`npm install /Users/projects/HMLR/hmlr-simple-map`

In the prototype html page import the component:
`{% from "../../node_modules/hmlr-simple-map/macros/macro.njk" import hmlrSimpleMap %}`

Reference the map component using 

```
    {{ hmlrSimpleMap({
      alt: "Map of Plymouth",
      caption: "Example 3 map component with custom size and default view",
      coords: "225000, 65000",
      zoom: 16
      height: "400px",
      width: "620px",
      path_to_geometry: "/public/boundary.json"
    }) }}
```

All the properties are optional, with defaults for coordinates, zoom level, height and width.
`path_to_geometry` is used to load in geojson (using BNG coordinates) from within the prototype. The map will be centered on the extent automatically. If co-ordinates are also included, then the map will be centered on these.  