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
  CHECKBOX_CLASS: 'govuk-checkboxes__input'
};

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

/**
 * Setup checkbox event listener for layer visibility
 * @param {ol.Map} map - OpenLayers map instance
 */
function setupCheckboxListener(map) {
  const getLayerByName = (name) => {
    return map.getLayers().getArray().find(layer => layer.get('name') === name);
  };

  document.addEventListener(EVENTS.CHECKBOX, (event) => {
    const { id, isChecked } = event.detail.message;
    const layer = getLayerByName(id);
    
    if (layer) {
      layer.setVisible(isChecked);
    }
  });
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

  const {
    zoom = DEFAULTS.ZOOM,
    tile_url = '',
    layers: layerSettings = null
  } = options;

  console.log('Creating map:', target, coords, zoom);

  // Initialize projection
  initializeProjection();

  // Create layers
  const layers = [createBaseLayer(tile_url)];
  const vectorLayers = createVectorLayers(layerSettings);
  layers.push(...vectorLayers);

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
  if (layerSettings) {
    setupCheckboxListener(map);
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

    const options = {
      coords,
      zoom: parseInt(element.dataset.zoom) || DEFAULTS.ZOOM,
      tile_url: element.dataset.tileurl || '',
      layers: element.dataset.layers ? JSON.parse(element.dataset.layers) : null
    };

    createMap(target, options);
  });
}

/**
 * Initialize checkbox event dispatchers
 */
function initializeCheckboxes() {
  const checkboxes = document.getElementsByClassName(SELECTORS.CHECKBOX_CLASS);

  Array.from(checkboxes).forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const clickEvent = new CustomEvent(EVENTS.CHECKBOX, {
        detail: {
          message: {
            id: this.id,
            isChecked: this.checked
          }
        }
      });
      document.dispatchEvent(clickEvent);
    });
  });
}

// ============================================================================
// DOM READY
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initializeMaps();
  initializeCheckboxes();
});

// ============================================================================
// EXPORTS (if using modules)
// ============================================================================

// Uncomment if using ES6 modules:
// export { createMap, initializeMaps, initializeCheckboxes };