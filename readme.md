# GDS Prototype kit: Map component

## EXPERIMENTAL

Work in progress: a simple map component.

To run locally, download this repo and use `npm pack` to create a local package (`hmlr-simple-map-1.0.0.tgz`).

Copy the component (the newly created TGZ file) into your actual prototype. Install the component into the prototype using a file path location, eg

`npm install hmlr-simple-map-1.0.0.tgz`

In the prototype html page, import the component:
`{% from "hmlrSimpleMap.njk" import hmlrSimpleMap %}`

Reference the map component using 
```
    {{ hmlrSimpleMap({
      alt: "Map of Liskeard",
      caption: "Example map component with custom size. View is set to specific center point and zoom level",
      coords: "225000, 65000",
      zoom: 16,
      height: "400px",
      width: "620px",
      path_to_geometry: "/public/boundary.json",
      style: "RED DASH"
    }) }}
```

All the properties are optional, with defaults for coordinates, zoom level, height and width.
`path_to_geometry` is used to load in geojson (using BNG coordinates) from within the prototype. The map will be centered on the extent automatically. If co-ordinates are also included, then the map will be centered on these. 

The `style` option can be used to set a one of the pre-defined colours (RED, GREEN, BLUE) and line style (DASH, DOT) or a custom style can be used to apply a fill and stroke to the imported geometry, using the OpenLayers styling eg
```
  style: {
    fill: {
      color: "#d4351c33"
    },
    stroke: {
      color: "#d4351c",
      width: 0.5,
      lineDash: [5, 5]
    }
  }
  ```

  where line dash is the line length then the gap length. 

  There is an test [prototype](https://github.com/LandRegistry/llc-map-prototype) showing the installed component, with a working example of the [map page](https://github.com/LandRegistry/llc-map-prototype/blob/4e3851591495befc5da82101700135545b0f0d75/app/views/map-component.html).