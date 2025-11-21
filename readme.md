# HMLR Map Component

A flexible, OpenLayers-based mapping component for the GOV.UK Prototype Kit, with built-in support for British National Grid (BNG) projection and GeoJSON boundary visualization.

## Features

- **British National Grid (EPSG:27700)** projection support
- **GeoJSON boundary** loading and visualization
- **Customizable styling** with preset and custom color schemes
- **Multiple layers** with individual styling and visibility controls
- **Interactive features** with hover effects and click events
- **Flexible sizing** and positioning options
- **Feature selection** from GeoJSON collections

## How to use

### Install the package

First, install the package to your prototype. In terminal run the following command:
   ```
   npm install hmlr-map
   ```


### Import the Component

Set the vlues of the map in your HTML template. (This currently only works as a nunjucks macro):

```njk
{% from "hmlrMap.njk" import hmlrMap %}
```

### Basic Example

```njk
{{ hmlrMap({
  alt: "Map of Plymouth",
  caption: "Example map with default settings"
}) }}
```

## Configuration Options

All parameters are **optional** with defaults provided.

### Basic Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `alt` | String | - | Alternative text for accessibility |
| `caption` | String | - | Caption displayed below the map |
| `coords` | String | `248050, 53750` | Center coordinates in BNG format (Easting, Northing) |
| `zoom` | Number | `15` | Initial zoom level (1-18) |
| `use_draw_tools` | String | `"true"` | Enable drawing tools (requires separate components to set Drawing Mode) |
| `height` | String | `500px` | Map height (any valid CSS value) |
| `width` | String | `100%` | Map width (any valid CSS value) |

### Layer Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `layers` | Array | `null` | Array of layer configuration objects (see Layer Options below) |
| `layer_controls` | String | `"false"` | Enable layer visibility checkboxes (`"true"` or `"false"`) |
| `tile_url` | String | OSM tiles | Custom base map tile URL (e.g., CartoDB, Mapbox) |

### Layer Options

Each layer in the `layers` array can have the following properties:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `path_to_geometry` | String | - | Path to GeoJSON file (required for each layer) |
| `description` | String | Filename | Label for layer control checkbox |
| `geometry_index` | Number | `null` | Select specific feature from collection (0-based index) |
| `interactive` | String | `"false"` | Enable click/hover interactions (`"true"` or `"false"`) |
| `style` | String/Object | `"BLUE"` | Layer styling (see Styling Options below) |

## Styling Options

### Preset String Styles

Combine color and line style keywords (case-insensitive):

**Colors:**
- `"RED"` - GOV.UK red (#d4351c)
- `"GREEN"` - GOV.UK green (#00703c)
- `"BLUE"` - GOV.UK blue (#003078)

**Line Styles:**
- `"DASH"` - Dashed line [5, 5]
- `"DOT"` - Dotted line [1, 5]

**Special Styles:**
- `"HIDDEN"` - Invisible geometry (useful for interactive-only layers)
- `"HATCHED"` - Diagonal line pattern fill (experimental)

**Examples:**
```njk
style: "RED DASH"
style: "GREEN"
style: "BLUE DOT"
style: "green HATCHED"
style: "hidden"
```

### Custom Object Styles

For complete control, use an object with OpenLayers styling properties:

```njk
style: {
  fill: {
    color: "#d4351c33"  // RGBA hex: color + alpha (33 = 20% opacity)
  },
  stroke: {
    color: "#d4351c",
    width: 2,
    lineDash: [4, 4]  // [dash length, gap length]
  }
}
```

**Color Format:** Use RGBA hex format for transparency: `#RRGGBBAA`
- Example: `#d4351c33` = red with 20% opacity (33 hex = 51 decimal = 20%)
- [Hex to Percentage Converter](https://www.jmiron.com/percent-to-hex-converter)

## Examples

### Example 1: Custom size and location

```njk
{{ hmlrMap({
  alt: "Map of Cornwall, showing a field north of Liskeard",
  caption: "Custom size, coordinates and zoom",
  coords: "225000, 65000",
  zoom: 15,
  height: "400px",
  width: "620px"
}) }}
```

### Example 2: Loading external geoJSON

```njk
{{ hmlrMap({
  alt: "Map showing boundary data",
  caption: "Loading external GeoJSON with auto-fit",
  layers: [{
    path_to_geometry: "/public/data/boundary.json"
  }]
}) }}
```

### Example 3: Custom styling

```njk
{{ hmlrMap({
  alt: "Map with custom styled boundary",
  caption: "Custom styling with dashed red line",
  coords: "225000, 65000",
  zoom: 15,
  layers: [{
    path_to_geometry: "/public/data/boundary.json",
    style: {
      fill: {
        color: "#d4351c33"
      },
      stroke: {
        color: "#d4351c",
        width: 2,
        lineDash: [4, 4]
      }
    }
  }]
}) }}
```


### Example 4: Selecting a single feature using geometry_index

```njk
{{ hmlrMap({
  alt: "Single feature selection",
  caption: "Selecting feature 3 from a collection",
  layers: [{
    path_to_geometry: "/public/data/fields.json",
    geometry_index: 3,
    style: "BLUE"
  }],
  width: "100%",
  height: "390px"
}) }}
```

### Example 5: Interactive hidden geometry

```njk
{{ hmlrMap({
  alt: "Interactive map",
  caption: "Hidden geometry with click events",
  zoom: 15.5,
  layers: [{
    path_to_geometry: "/public/data/overlaps.geojson",
    style: "hidden",
    interactive: "true"
  }]
}) }}
```

### Example 6: Multiple layers with custom map tile and layer controls

```njk
{{ hmlrMap({
  alt: "Multi-layer map",
  caption: "Layered boundaries with visibility controls",
  layer_controls: "true",
  layers: [
    {
      path_to_geometry: "/public/data/inspire_data.geojson",
      description: "INSPIRE data",
      interactive: "true",
      style: {
        fill: { color: "#4c2c9222" },
        stroke: { color: "#4c2c9211", width: 0.5 }
      }
    },
    {
      path_to_geometry: "/public/data/layer1.geojson",
      style: {
        fill: { color: "#d4351c01" },
        stroke: { color: "#d4351c", width: 2 }
      }
    },
    {
      path_to_geometry: "/public/data/layer2.geojson",
      description: "Custom description",
      style: {
        fill: { color: "#00703c11" },
        stroke: { color: "#00703c", width: 2 }
      }
    },
    {
      path_to_geometry: "/public/data/layer3.geojson",
      description: "Blue boundary",
      style: "BLUE"
    }
  ],
  zoom: 14.5,
  tile_url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
}) }}
```

### Example 7: Hatched fill 

```njk
{{ hmlrMap({
  alt: "Map with hatched pattern",
  caption: "Experimental canvas hatching",
  layers: [{
    path_to_geometry: "/public/data/layer1.geojson",
    interactive: "true",
    style: "green HATCHED"
  }]
}) }}
```
### Example 8: Drawing tools 

```njk
{{ hmlrMap({
      alt: "HMLR map component",
      caption: "© Crown copyright and database rights 2025 Ordnance Survey AC0000000XXX. Use of this data is subject to Ordnance Survey",
      width: "100%",
      height: "100%",
      use_draw_tools: "true",
      layer_controls: "false",
      layers:[
        {
          description:"Registrations (INSPIRE)",
          interactive: "true",
          style: {
            fill: {
              color: "#4c2c9244"
            },
            stroke: {
              color: "#4c2c9299",
              width: 1
            }
          }
        },
          {
          description:"Postcode",
          style: {
            fill: {
              color: "#d4351c33"
            },
            stroke: {
              color: "#d4351c",
              width: 3,
              lineDash: [10, 6]
            }
          }
        }
      ],
      tile_url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
    }) }}
```

## Interactive Features

### Click Events

When a layer has `interactive: "true"`, clicking on features dispatches a custom event:

```javascript
document.addEventListener('hmlrMapClickEvent', (event) => {
  const feature = event.detail.message;
  console.log('Clicked feature:', feature);
  
  // Access feature properties
  const properties = feature.values_;
  console.log('Feature ID:', properties.INSPIREID);
});
```

### Hover Effects

Interactive layers automatically show:
- Cursor change to pointer
- Highlight styling on hover
- Click handling

## Coordinate System

The component uses **British National Grid (BNG) / EPSG:27700**:

- **Easting:** Horizontal position (typically 0-700000)
- **Northing:** Vertical position (typically 0-1300000)
- **Format:** `"easting, northing"` (e.g., `225000, 65000`)

GeoJSON files must use BNG coordinates. The map automatically centers on loaded geometries if default coordinates are used.

## GeoJSON Format

The component expects standard GeoJSON with BNG coordinates:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[...]]
      },
      "properties": {
        "INSPIREID": 12345,
        "name": "Property Name"
      }
    }
  ]
}
```

## Dependencies

- OpenLayers
- Proj4js
- GOV.UK Frontend (for styling)

## License

This component is experimental and provided as-is for use with the GOV.UK Prototype Kit.

## Support

For issues and questions, refer to the [test prototype](https://github.com/LandRegistry/llc-map-prototype) which includes working examples.

## Version

Current version: 1.0.0 (Experimental)