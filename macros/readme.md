# GDS Prototype kit: Map component

A simple map component.

To run locally, install this package using a file path location, then reference the map component using 

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