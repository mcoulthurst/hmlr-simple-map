/**
 * HMLR Map Component
 * OpenLayers-based mapping solution with British National Grid projection support
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const PROJECTION = {
  EPSG_27700: "EPSG:27700",
  DEFINITION: "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs"
};

const COLORS = {
  BLUE: '#003078',
  GREEN: '#00703c',
  RED: '#d4351c',
  HIDDEN: '#d4351c00'
};

const DEFAULTS = {
  COORDS: [248050, 53750],
  ZOOM: 15,
  MAX_ZOOM: 18,
  PADDING: [20, 20, 20, 20],
  STROKE_WIDTH: 3,
  HOVER_STROKE_WIDTH: 2,
  OPACITY: '33' // hex opacity for fills
};

const EVENTS = {
  CHECKBOX: 'hmlrCheckBoxEvent',
  MAP_CLICK: 'hmlrMapClickEvent'
};

const SELECTORS = {
  MAP_CLASS: 'hmlr-map',
  CHECKBOX_CLASS: 'govuk-checkboxes__input',
  RADIO_CLASS: 'govuk-radios__input'
};

let draw_source = null;

// ============================================================================
// PROJECTION INITIALIZATION
// ============================================================================

/**
 * Initialize and register the British National Grid projection
 */
function initializeProjection() {
  proj4.defs(PROJECTION.EPSG_27700, PROJECTION.DEFINITION);
  ol.proj.proj4.register(proj4);
}

// ============================================================================
// STYLE UTILITIES
// ============================================================================

/**
 * Create a hatched pattern fill
 * @param {string} color - The color for the pattern
 * @returns {CanvasPattern} Canvas pattern for hatched fill
 */
function createHatchPattern(color) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const pixelRatio = devicePixelRatio;
  const width = 16 * pixelRatio;
  const height = 16 * pixelRatio;
  const offset = width * 0.93;

  canvas.width = width;
  canvas.height = height;
  context.strokeStyle = color;
  context.lineWidth = 1;

  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(width, height);
  context.moveTo(width - offset, height);
  context.lineTo(0, offset);
  context.moveTo(width, height - offset);
  context.lineTo(offset, 0);
  context.stroke();

  return context.createPattern(canvas, 'repeat');
}

/**
 * Parse string-based style configuration
 * @param {string} styleString - Style configuration string (e.g., "RED-DASHED")
 * @returns {Object} Parsed style properties
 */
function parseStyleString(styleString) {
  const uppercaseStyle = styleString.toUpperCase();
  const config = {
    strokeColor: COLORS.BLUE,
    fillColor: null,
    lineDash: null,
    isHatched: false,
    isHidden: false
  };

  // Parse color
  if (uppercaseStyle.includes('RED')) {
    config.strokeColor = COLORS.RED;
  } else if (uppercaseStyle.includes('GREEN')) {
    config.strokeColor = COLORS.GREEN;
  }

  // Parse line style
  if (uppercaseStyle.includes('DASH')) {
    config.lineDash = [5, 5];
  } else if (uppercaseStyle.includes('DOT')) {
    config.lineDash = [1, 5];
  }

  // Parse special styles
  if (uppercaseStyle.includes('HATCHED')) {
    config.isHatched = true;
  }

  if (uppercaseStyle.includes('HIDDEN')) {
    config.strokeColor = COLORS.HIDDEN;
    config.fillColor = COLORS.HIDDEN;
    config.isHidden = true;
  }

  if (!config.isHidden) {
    config.fillColor = config.strokeColor + DEFAULTS.OPACITY;
  }

  return config;
}

/**
 * Create OpenLayers style from configuration
 * @param {string|Object} styleConfig - Style configuration
 * @returns {ol.style.Style} OpenLayers style object
 */
function createStyle(styleConfig) {
  let strokeColor = COLORS.BLUE;
  let fillColor = strokeColor + DEFAULTS.OPACITY;
  let width = DEFAULTS.STROKE_WIDTH;
  let lineDash = null;
  let isHatched = false;

  if (!styleConfig) {
    return new ol.style.Style({
      fill: new ol.style.Fill({ color: fillColor }),
      stroke: new ol.style.Stroke({ color: strokeColor, width, lineDash })
    });
  }

  // Handle string-based style configuration
  if (typeof styleConfig === 'string') {
    const parsed = parseStyleString(styleConfig);
    strokeColor = parsed.strokeColor;
    fillColor = parsed.fillColor;
    lineDash = parsed.lineDash;
    isHatched = parsed.isHatched;

    if (isHatched) {
      const hatchedFill = new ol.style.Fill();
      hatchedFill.setColor(createHatchPattern(strokeColor));

      return new ol.style.Style({
        fill: hatchedFill,
        stroke: new ol.style.Stroke({
          color: strokeColor,
          width: DEFAULTS.HOVER_STROKE_WIDTH,
          lineDash: [5, 5]
        })
      });
    }
  }
  // Handle object-based style configuration
  else if (typeof styleConfig === 'object') {
    if (styleConfig.fill?.color) {
      fillColor = styleConfig.fill.color;
    }
    if (styleConfig.stroke?.color) {
      strokeColor = styleConfig.stroke.color;
    }
    if (styleConfig.stroke?.width) {
      width = styleConfig.stroke.width;
    }
    if (styleConfig.stroke?.lineDash) {
      lineDash = styleConfig.stroke.lineDash;
    }
  }

  return new ol.style.Style({
    fill: new ol.style.Fill({ color: fillColor }),
    stroke: new ol.style.Stroke({ color: strokeColor, width, lineDash })
  });
}

/**
 * Create hover style
 * @returns {ol.style.Style} Hover style object
 */
function createHoverStyle() {
  return new ol.style.Style({
    fill: new ol.style.Fill({ color: 'rgba(0,48,120,0.3)' }),
    stroke: new ol.style.Stroke({ color: 'rgba(0,48,120,1)', width: 2 })
  });
}

// ============================================================================
// LAYER MANAGEMENT
// ============================================================================

/**
 * Create base tile layer
 * @param {string} tileUrl - Optional custom tile URL
 * @returns {ol.layer.Tile} Base tile layer
 */
function createBaseLayer(tileUrl) {
  const source = tileUrl
    ? new ol.source.XYZ({ url: tileUrl })
    : new ol.source.OSM();

  return new ol.layer.Tile({ source });
}

/**
 * Create vector layers from layer settings
 * @param {Array} layerSettings - Array of layer configuration objects
 * @returns {Array<ol.layer.Vector>} Array of vector layers
 */
function createVectorLayers(layerSettings) {
  if (!layerSettings || !Array.isArray(layerSettings)) {
    return [];
  }

  return layerSettings.map((config, index) => {
    const style = createStyle(config.style);
    const vectorSource = new ol.source.Vector();

    return new ol.layer.Vector({
      name: `LAYER_${index + 1}`,
      source: vectorSource,
      style
    });
  });
}

// ============================================================================
// GEOMETRY LOADING
// ============================================================================

/**
 * Load boundary geometry from external file
 * @param {string} path - Path to GeoJSON file
 * @param {ol.source.Vector} source - Vector source to add features to
 * @param {number|null} geometryIndex - Optional specific geometry index
 * @returns {Promise<Array>} Promise resolving to loaded features
 */
async function loadBoundaryGeometry(path, source, geometryIndex = null) {
  try {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let geojsonData = await response.json();

    if (geometryIndex !== null && geojsonData.features) {
      geojsonData = geojsonData.features[geometryIndex];
    }

    const features = new ol.format.GeoJSON().readFeatures(geojsonData);
    source.addFeatures(features);

    return features;
  } catch (error) {
    console.error(`Error loading geometry from ${path}:`, error);
    throw error;
  }
}

/**
 * Check if coordinates are default values
 * @param {Array<number>} coords - Coordinates to check
 * @returns {boolean} True if coordinates are default
 */
function areDefaultCoords(coords) {
  return coords[0] === DEFAULTS.COORDS[0] && coords[1] === DEFAULTS.COORDS[1];
}

/**
 * Fit map view to layer extent
 * @param {ol.Map} map - OpenLayers map instance
 * @param {ol.source.Vector} source - Vector source with features
 * @param {number} zoom - Desired zoom level
 */
function fitViewToExtent(map, source, zoom) {
  const extent = source.getExtent();

  if (extent && extent.some(coord => isFinite(coord))) {
    map.getView().fit(extent, {
      padding: DEFAULTS.PADDING,
      maxZoom: DEFAULTS.MAX_ZOOM
    });

    if (zoom !== DEFAULTS.ZOOM) {
      map.getView().setZoom(zoom);
    }
  }
}

// ============================================================================
// INTERACTION HANDLERS
// ============================================================================

/**
 * Add hover interaction to map
 * @param {ol.Map} map - OpenLayers map instance
 */
function addHoverInteraction(map) {
  let hoveredFeature = null;
  const mapElement = map.getTargetElement();
  const hoverStyle = createHoverStyle();

  // Pointer move handler
  map.on('pointermove', (evt) => {
    const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f);

    if (feature !== hoveredFeature) {
      if (hoveredFeature) {
        hoveredFeature.setStyle(null);
      }

      if (feature) {
        feature.setStyle(hoverStyle);
        mapElement.style.cursor = 'pointer';
      } else {
        mapElement.style.cursor = '';
      }

      hoveredFeature = feature;
    }
  });

  // Mouse leave handler
  mapElement.addEventListener('mouseleave', () => {
    if (hoveredFeature) {
      hoveredFeature.setStyle(null);
      hoveredFeature = null;
      mapElement.style.cursor = '';
    }
  });

  // Click handler
  map.on('click', (evt) => {
    const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f);

    if (feature) {
      const mapEvent = new CustomEvent(EVENTS.MAP_CLICK, {
        detail: { message: feature }
      });
      document.dispatchEvent(mapEvent);
    }
  });
}

const getLayerByName = (map, name) => {
  return map.getLayers().getArray().find(layer => layer.get('name') === name);
};

/**
 * Setup checkbox event listener for layer visibility
 * @param {ol.Map} map - OpenLayers map instance
 */
function setupCheckboxListener(map) {
  document.addEventListener(EVENTS.CHECKBOX, (event) => {
    const { id, isChecked, sender } = event.detail.message;
    const  thisMap = map.getTarget();
    const layer = getLayerByName(map, id);

    if (layer && sender == thisMap) {
      console.log(thisMap, event.detail.message.sender);
      layer.setVisible(isChecked);
    }
  });
}

///------------------------- DRAW

var hover_interaction = null;
var current_interaction = null;

var add_colour = '#003078';
var edit_colour = '#00703c';
var delete_colour = '#d4351c';

var add_fill = [0, 48, 120, 0.2];
var edit_fill = [0, 112, 60, 0.2];
var delete_fill = [212, 53, 28, 0.2];
draw_layer_styles = {
  /*ol, hatch_pattern*/
  // Draw Interactions
  DRAW: 0,
  // Edit Interactions
  EDIT: 1,
  // Remove Interactions
  REMOVE: 2,
  // No Interactions Toggled
  NONE: 3,
  // Draw hole interaction
  HOLE: 4,
  // Hover
  HOVER: 5,
  // highlight charges
  HIGHLIGHT: 6,
  // Find charges
  SHOW_CHARGE: 7,
  // Fade back other charges when highlighting 
  FADE: 8,
  // Associated Feature Styles for mode
  style: {

    // DRAW | add
    0: new ol.style.Style({
      fill: new ol.style.Fill({
        color: add_fill
      }),
      stroke: new ol.style.Stroke({
        color: add_colour,
        width: 3,
        lineDash: [5, 5]
      }),
      image: new ol.style.Circle({
        radius: 5,
        fill: new ol.style.Fill({
          color: add_colour
        })
      })
    }),
    // EDIT
    1: [new ol.style.Style({
      fill: new ol.style.Fill({
        color: edit_fill
      }),
      stroke: new ol.style.Stroke({
        color: edit_colour,
        width: 2
      }),
      image: new ol.style.Circle({
        radius: 5,
        fill: new ol.style.Fill({
          color: edit_colour
        })
      })
    }),
    new ol.style.Style({ // second style for the dots on the edge
      image: new ol.style.Circle({
        radius: 5,
        fill: new ol.style.Fill({
          color: edit_colour
        })
      }),
      geometry: function (feature) { // creating a custom geometry to draw points on
        var coordinates = feature.getGeometry().getCoordinates().flat(1);
        if (Array.isArray(coordinates)) {
          return new ol.geom.MultiPoint(coordinates);
        }
      }
    })],
    // delete | remove
    2: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: delete_colour,
        width: 2
      }),
      fill: new ol.style.Fill({
        color: delete_fill
      }),
      image: new ol.style.Circle({
        radius: 5,
        fill: new ol.style.Fill({
          color: delete_colour
        })
      })
    }),
    // NONE
    3: new ol.style.Style({
      fill: new ol.style.Fill({
        color: [6, 88, 229, 0.1]
      }),
      stroke: new ol.style.Stroke({
        color: '#0658e5',
        width: 2,
      }),
      image: new ol.style.Circle({
        radius: 5,
        fill: new ol.style.Fill({
          color: '#0658e5'
        })
      })
    }),
    // HOLE
    4: new ol.style.Style({
      fill: new ol.style.Fill({
        color: add_fill
      }),
      stroke: new ol.style.Stroke({
        color: add_colour,
        width: 3,
        lineDash: [1, 5]
      }),
      image: new ol.style.Circle({
        radius: 5,
        fill: new ol.style.Fill({
          color: add_colour
        })
      }),
    }),
    // HOVER
    5: new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(0,48,120,0.3)'
      }),
      stroke: new ol.style.Stroke({
        color: 'rgba(0,48,120,1)',
        width: 2
      }),
      radius: 5
    }),
    // HIGHLIGHT
    6: new ol.style.Style({
      fill: new ol.style.Fill({
        color: [255, 221, 0, 0.6]
      }),
      stroke: new ol.style.Stroke({
        color: '#003078',
        width: 3
      }),
      radius: 5
    }),
    // SHOW_CHARGE
    7: new ol.style.Style({
      fill: new ol.style.Fill({
        color: [255, 255, 255, 0.25]
      }),
      stroke: new ol.style.Stroke({
        color: '#0658e5',
        width: 2
      }),
      radius: 5
    }),
    // FADE
    8: new ol.style.Style({
      fill: new ol.style.Fill({
        color: [255, 255, 255, 0]
      }),
      stroke: new ol.style.Stroke({
        color: [255, 255, 255, 0],
        width: 1
      }),
      radius: 5
    })
  }
}



// Add Draw Interactions
add_draw_interaction = function (map, type) {

  console.log('add interaction', type);
  const draw_layer = getLayerByName(map, "draw_layer");
  const features = draw_layer.getSource().getFeatures();
  const draw_features = new ol.Collection(features);

  console.log(draw_layer);
  console.log(draw_layer.getSource());
  console.log(draw_layer.getSource().getFeatures());

  // Remove the previous interaction
  map.removeInteraction(current_interaction);
  // remove the toggle of the draw control button as this is handled by the new radio buttons
  // Toggle the draw control as needed
  //var toggled_on = toggle_button(button);

  //if (toggled_on) {
  toggle_draw_layer_style(draw_layer, draw_layer_styles.DRAW);

  if (type == "Circle") {
    current_interaction = new ol.interaction.Draw({
      features: draw_features,
      type: type,
      style: draw_layer_styles.style[draw_layer_styles.DRAW],
      geometryFunction: ol.interaction.Draw.createRegularPolygon(30)
    });

  } else {

    current_interaction = new ol.interaction.Draw({
      features: draw_features,
      type: type,
      style: draw_layer_styles.style[draw_layer_styles.DRAW],
      geometryFunction: function (coords, geometry) {
        /* Callback to set drawing to false if all point removed and prevent
        calls to removeLastPoint when there's no points left to undo */
        if (type === "LineString") {
          if (!geometry) {
            geometry = new ol.geom.LineString([]);
          }
          geometry.setCoordinates(coords);
          MAP_UNDO.drawing = coords.length > 1;
        } else if (type === "Point") {
          if (!geometry) {
            geometry = new ol.geom.Point([]);
          }
          geometry.setCoordinates(coords);
        } else if (type === "Polygon") {
          if (!geometry) {
            geometry = new ol.geom.Polygon([]);
          }
          geometry.setCoordinates([coords[0].concat([coords[0][0]])]);
          MAP_UNDO.drawing = coords[0].length > 1;
        }

        return geometry;
      }
    });
  }

  current_interaction.on('drawend', function (event) {
    const feature = event.feature;
    console.log("__________ENDS___________")
    console.log(feature)

    const draw_layer = getLayerByName(map, "draw_layer");
    console.log(draw_layer);
    const source = draw_layer.getSource();
    source.addFeature(feature);
    // Or add to a specific source
    //source.addFeature(feature);
    event.feature.setProperties({
      'id': Date.now()
    });
  });

  current_interaction.on('drawstart', function (event) {
    MAP_UNDO.store_state();
  });

  current_interaction.on('drawend', function (event) {
    MAP_UNDO.drawing = false;
  });

  map.addInteraction(current_interaction);
  /* if (vectorControls.snap_to_enabled) {
      map.addInteraction(snap_to_interaction)
  } */
  //}
};
// Remove Drawn Feature
remove_selected_feature = function(id) {
    MAP_UNDO.store_state();
    var features = draw_source.getFeatures();
    var feature = features.filter(feature => feature.getProperties().id == id);
    draw_source.removeFeature(feature[0])
};

/**
 * Set drawing mode based on radio controls elsewhere on page
 * @param {ol.Map} map - OpenLayers map instance
 */
function setMode(map, modeType) {
  map.removeInteraction(hover_interaction);
  const draw_layer = getLayerByName(map, "draw_layer");
  console.log(modeType);

  switch (modeType) {
    case 'draw-area':
      map.removeInteraction(current_interaction);
      //MASTER_MAP_VECTOR_LAYER.enable();
      toggle_draw_layer_style(draw_layer, draw_layer_styles.DRAW);
      add_draw_interaction(map, "Polygon");
      return;

    case 'add-circle':
      map.removeInteraction(current_interaction);
      //MASTER_MAP_VECTOR_LAYER.enable();
      toggle_draw_layer_style(draw_layer, draw_layer_styles.DRAW);
      add_draw_interaction(map, "Circle");
      return;

    case 'add-point':

      map.removeInteraction(current_interaction);
      //MASTER_MAP_VECTOR_LAYER.enable();
      toggle_draw_layer_style(draw_layer, draw_layer_styles.DRAW);

      add_draw_interaction(map, "Point");
      return;

    case 'add-line':
      map.removeInteraction(current_interaction);
      //MASTER_MAP_VECTOR_LAYER.enable();
      toggle_draw_layer_style(draw_layer, draw_layer_styles.DRAW);
      add_draw_interaction(map, "LineString");
      return;

    case 'select-area':
      //$('.center').removeClass('govuk-visually-hidden');
      map.removeInteraction(current_interaction);
      //MASTER_MAP_VECTOR_LAYER.enable();
      toggle_draw_layer_style(draw_layer, draw_layer_styles.DRAW);
      current_interaction = new ol.interaction.Select({
        layers: [MASTER_MAP_VECTOR_LAYER.layer],
        style: draw_layer_styles.style[draw_layer_styles.DRAW]
      });

      // ADD hover functionality
      hover_interaction = new ol.interaction.Select({
        condition: ol.events.condition.pointerMove,
        style: draw_layer_styles.style[draw_layer_styles.HOVER]
      });
      map.addInteraction(hover_interaction);

      current_interaction.getFeatures().on('add', function (event) {
        MAP_UNDO.store_state();
        feature = event.target.item(0).clone();
        if (feature) {
          geometry = feature.getGeometry();
          //Convert multi polygons to features
          if (geometry instanceof ol.geom.MultiPolygon) {
            geometry.getPolygons().forEach(function (geometry) {
              addGeometryToMap(geometry)
            })
          }
          else {
            addGeometryToMap(geometry)
          }
        }
      });

      vectorControls.copy_enabled = true;
      map.addInteraction(current_interaction);
      return;

    case 'edit-area':
      const features = draw_layer.getSource().getFeatures();
      const draw_features = new ol.Collection(features);
      map.removeInteraction(current_interaction);
      toggle_draw_layer_style(draw_layer, draw_layer_styles.EDIT);
      //toggle_draw_layer_style => MAP_CONFIG.draw_layer.setStyle(pattern);
      current_interaction = new ol.interaction.Modify({
        features: draw_features,
        style: draw_layer_styles.style[draw_layer_styles.EDIT]
      });

      map.addInteraction(current_interaction);
      //$("#" + editButtonId).trigger("edit:toggled");
      /* if (vectorControls.snap_to_enabled) {
        map.addInteraction(snap_to_interaction)
      } */

      current_interaction.on('modifystart', function (event) {
        MAP_UNDO.store_state();
      });

      return;

    case 'delete-area':
      //const draw_source = draw_layer.getSource();
      //$('.center').removeClass('govuk-visually-hidden');
      map.removeInteraction(current_interaction);

      toggle_draw_layer_style(draw_layer, draw_layer_styles.REMOVE);

      current_interaction = new ol.interaction.Select({
        layers: [draw_layer]
      });

      current_interaction.getFeatures().on('add', function (event) {
        console.log(event);
        var feature_id = event.element.getProperties().id;
        console.log(event.element.getProperties());
        console.log(feature_id);
        

        remove_selected_feature(feature_id);
        current_interaction.getFeatures().clear();
      });

      map.addInteraction(current_interaction)
      return;


  }

};


function toggle_draw_layer_style(draw_layer, style) {
  console.log("current_style", style);
  // style is one of 4: DRAW, EDIT, REMOVE and NONE
  current_style = style;
  let pattern = draw_layer_styles.style[style];
  draw_layer.setStyle(pattern);
}












// ============================================================================
// MAP CREATION
// ============================================================================

/**
 * Create and initialize map instance
 * @param {string} target - Target element ID
 * @param {Object} options - Map configuration options
 * @param {Array<number>} options.coords - Initial center coordinates
 * @param {number} options.zoom - Initial zoom level
 * @param {string} options.tile_url - Custom tile URL
 * @param {Array} options.layers - Layer configuration
 * @returns {ol.Map} OpenLayers map instance
 */
async function createMap(target, options = {}) {
  // Handle coords: use defaults if not provided, null, or empty array
  let coords = options.coords;
  if (!coords || (Array.isArray(coords) && coords.length === 0)) {
    coords = DEFAULTS.COORDS;
  }
console.log(options.useDrawTools);

  const {
    zoom = DEFAULTS.ZOOM,
    tile_url = '',
    layers: layerSettings = null,
    useDrawTools,
    layerControls
  } = options;

  console.log('Creating map:', target, coords, zoom);
  console.log('useDrawTools:', useDrawTools);
  console.log('layerControls:', layerControls);

  // Initialize projection
  initializeProjection();

  // Create layers
  const layers = [createBaseLayer(tile_url)];
  const vectorLayers = createVectorLayers(layerSettings);
  layers.push(...vectorLayers);

  // create draw layer
  //create a container for drawn features
  const draw_features = new ol.Collection();
  draw_source = new ol.source.Vector({
    features: draw_features
  });
  const draw_layer = new ol.layer.Vector({
    name: "draw_layer",
    source: draw_source,
    //style: draw_layer_styles.style[draw_layer_styles.EDIT],
    //zIndex: 9
  });
  layers.push(draw_layer);
  console.log(layers);


  // Create map
  const map = new ol.Map({
    target,
    layers,
    view: new ol.View({
      projection: PROJECTION.EPSG_27700,
      center: coords,
      zoom
    })
  });

  // Store map reference on element
  const mapElement = document.getElementById(target);
  if (mapElement) {
    mapElement._olMap = map;
  }

  // Setup checkbox listener if layers exist
  if (layerControls) {
    // set up cutom events
    initializeCheckboxes(target);
    // and custom listeners
    setupCheckboxListener(map);
  }

  console.log('draw?', useDrawTools);
  
  // Setup checkbox listener if layers exist
  if (useDrawTools) {
    initializeDrawTools();
  }


  // Load geometries and setup interactions
  if (layerSettings && Array.isArray(layerSettings)) {
    let hasInteractiveLayer = false;

    for (let i = 0; i < layerSettings.length; i++) {
      const config = layerSettings[i];

      if (config.path_to_geometry) {
        const layerIndex = i + 1; // Account for base layer
        const layer = map.getLayers().item(layerIndex);
        const source = layer.getSource();
        const geometryIndex = config.geometry_index ?? null;

        try {
          await loadBoundaryGeometry(config.path_to_geometry, source, geometryIndex);

          // Fit view if using default coordinates
          if (areDefaultCoords(coords)) {
            fitViewToExtent(map, source, zoom);
          }
        } catch (error) {
          console.error(`Failed to load geometry for layer ${layerIndex}:`, error);
        }

        if (config.interactive) {
          hasInteractiveLayer = true;
        }
      }
    }

    // Add hover interaction if any layer is interactive
    if (hasInteractiveLayer) {
      addHoverInteraction(map);
    }
  }

  return map;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize all maps on the page
 */
function initializeMaps() {
  const mapElements = document.getElementsByClassName(SELECTORS.MAP_CLASS);

  Array.from(mapElements).forEach((element, index) => {
    const target = `map${index + 1}`;
    element.setAttribute('id', target);

    // Parse coords - handle null, empty array, or invalid JSON
    let coords = null;
    try {
      const coordsData = element.dataset.coords;
      if (coordsData) {
        const parsed = JSON.parse(coordsData);
        // Only use parsed coords if it's a non-empty array
        if (Array.isArray(parsed) && parsed.length > 0) {
          coords = parsed;
        }
      }
    } catch (error) {
      console.warn(`Invalid coords data for ${target}:`, error);
    }

    let useDrawTools = false;
    if (element.dataset.use_draw_tools.toUpperCase() == "TRUE"){
      useDrawTools = true;
    }
    let layerControls = false;
    if (element.dataset.layer_controls.toUpperCase() == "TRUE"){
      layerControls = true;
    }

    const options = {
      coords,
      zoom: parseInt(element.dataset.zoom) || DEFAULTS.ZOOM,
      useDrawTools: useDrawTools,
      layerControls: layerControls,
      tile_url: element.dataset.tileurl || '',
      layers: element.dataset.layers ? JSON.parse(element.dataset.layers) : null
    };

    createMap(target, options);
  });
}

/**
 * Initialize checkbox event dispatchers
 */
function initializeCheckboxes(target) {
  const checkboxes = document.getElementsByClassName(SELECTORS.CHECKBOX_CLASS);


  Array.from(checkboxes).forEach(checkbox => {
    checkbox.addEventListener('change', function () {
      const clickEvent = new CustomEvent(EVENTS.CHECKBOX, {
        detail: {
          message: {
            sender: target,
            id: this.id,
            isChecked: this.checked
          }
        }
      });
      document.dispatchEvent(clickEvent);
    });
  });
}

/**
 * Initialize drawing tool event dispatchers
 */
function initializeDrawTools() {
  //const radioButtons = document.getElementsByClassName(SELECTORS.RADIO_CLASS);
  const radioButtons = document.querySelectorAll('input[type="radio"].govuk-radios__input');

  radioButtons.forEach(radio => {
    radio.addEventListener('change', (e) => {
      console.log('Selected value:', e.target.value);
      /* console.log('Selected radio name:', e.target.name);
      console.log('Selected radio id:', e.target.id); */
      const retrievedMap = document.getElementById('map1')._olMap;
      // Add your custom logic here
      setMode(retrievedMap, e.target.value);
    });
  });

  document.getElementById('clearAllBtn').addEventListener('click', function() {
    draw_source.clear();
  });
  document.getElementById('undoBtn').addEventListener('click', function() {
     MAP_UNDO.undo();
  });
}

// ============================================================================
// UNDO
// ============================================================================

/*global MAP_CONTROLS MAP_CONFIG document ol draw_layer_styles*/

var MAP_UNDO = {};

MAP_UNDO.undo_stack = [];
MAP_UNDO.drawing = false;

MAP_UNDO.store_state = function() {
    MAP_UNDO.undo_stack.push(MAP_UNDO.get_geometries());
    // Limit growth of undo stack [AC3]
    if(MAP_UNDO.undo_stack.length > 10) {
        MAP_UNDO.undo_stack = MAP_UNDO.undo_stack.slice(MAP_UNDO.undo_stack.length - 10)
    }
    MAP_UNDO.enable_undo_button(true);
};

MAP_UNDO.undo = function() {
    if(MAP_UNDO.drawing) {
        MAP_UNDO.openlayers_undo();
    } else {
        MAP_UNDO.remove_undo();
    }
};

MAP_UNDO.openlayers_undo = function() {
    current_interaction.removeLastPoint();
};

MAP_UNDO.remove_undo = function() {

    if(MAP_UNDO.undo_stack.length > 0) {
        MAP_UNDO.put_geometries(MAP_UNDO.undo_stack.pop());
    }
    
    MAP_UNDO.enable_undo_button(MAP_UNDO.undo_stack.length > 0);
    //removeActiveControl();
};

MAP_UNDO.enable_undo_button = function(enable) {
    document.getElementById('undoBtn').disabled = !enable;
};

MAP_UNDO.get_geometries = function() {
    var geojson = new ol.format.GeoJSON();
    var features = draw_source.getFeatures();

    var options = {
        dataProjection: 'EPSG:27700',
        featureProjection: 'EPSG:27700'
    }

    var features_json = geojson.writeFeatures(features, options);
    return features_json;
};

MAP_UNDO.put_geometries = function(geometry) {
    var options = {
        dataProjection: 'EPSG:27700',
        featureProjection: 'EPSG:27700'
    };

    draw_source.clear();
    var features = new ol.format.GeoJSON().readFeatures(geometry, options);

    draw_source.addFeatures(features);
};




// ============================================================================
// DOM READY
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initializeMaps();
});

// ============================================================================
// EXPORTS (if using modules)
// ============================================================================

// Uncomment if using ES6 modules:
// export { createMap, initializeMaps, initializeCheckboxes };