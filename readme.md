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
      width: "620px"
    }) }}
```

The coordinates, zoom level, height and width are all optional.