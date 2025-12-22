/**
 * HMLR Map Component
 * OpenLayers-based mapping solution with British National Grid projection support
 */
'use strict';

// ============================================================================
// CONFIGURATION & STATE
// ============================================================================
const CONFIG = {
  PROJECTION: {
    EPSG_27700: 'EPSG:27700',
    DEFINITION:
      '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs',
  },
  COLORS: {
    BLUE: '#003078',
    GREEN: '#00703c',
    RED: '#d4351c',
    YELLOW: '#ffdd00',
    HIDDEN: '#d4351c00',
  },
  DEFAULTS: {
    COORDS: [248050, 53750],
    ZOOM: 15,
    MAX_ZOOM: 18,
    PADDING: [20, 20, 20, 20],
    STROKE_WIDTH: 3,
    HOVER_STROKE_WIDTH: 2,
    OPACITY: '33',
  },
  EVENTS: {
    CHECKBOX: 'hmlrCheckBoxEvent',
    MAP_CLICK: 'hmlrMapClickEvent',
  },
  SELECTORS: {
    MAP_CLASS: 'hmlr-map',
    CHECKBOX_CLASS: 'govuk-checkboxes__input',
    RADIO_CLASS: 'govuk-radios__input',
  },
  UNDO: {
    MAX_STACK_SIZE: 20,
  },
};

const DRAW= "DRAW",
  EDIT= "EDIT",
  REMOVE= "REMOVE",
  NONE= "NONE",
  HOLE= "HOLE",
  HOVER= "HOVER",
  HIGHLIGHT= "HIGHLIGHT",
  SHOW_CHARGE= "SHOW_CHARGE",
  FADE= "FADE"
;

const state = {
  drawSource: null,
  currentInteraction: null,
  hoverInteraction: null,
  currentStyle: NONE,
  isDrawing: false,
  undoStack: [],
};

// ============================================================================
// PROJECTION
// ============================================================================
function initProjection() {
  proj4.defs(CONFIG.PROJECTION.EPSG_27700, CONFIG.PROJECTION.DEFINITION);
  ol.proj.proj4.register(proj4);
}

// ============================================================================
// STYLE HELPERS
// ============================================================================
function createHatchPattern(color) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const ratio = window.devicePixelRatio || 1;
  const size = 16 * ratio;
  canvas.width = size;
  canvas.height = size;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, size);
  ctx.moveTo(size * 0.07, size);
  ctx.lineTo(0, size * 0.93);
  ctx.moveTo(size, size * 0.07);
  ctx.lineTo(size * 0.93, 0);
  ctx.stroke();

  return ctx.createPattern(canvas, 'repeat');
}

function parseStyleString(styleString) {
  const s = styleString.toUpperCase();
  const cfg = {
    strokeColor: CONFIG.COLORS.BLUE,
    fillColor: null,
    lineDash: null,
    isHatched: false,
    isHidden: false,
  };
  if (s.includes('RED')) cfg.strokeColor = CONFIG.COLORS.RED;
  else if (s.includes('GREEN')) cfg.strokeColor = CONFIG.COLORS.GREEN;

  if (s.includes('DASH')) cfg.lineDash = [5, 5];
  else if (s.includes('DOT')) cfg.lineDash = [1, 5];

  if (s.includes('HATCHED')) cfg.isHatched = true;

  if (s.includes('HIDDEN')) {
    cfg.strokeColor = CONFIG.COLORS.HIDDEN;
    cfg.fillColor = CONFIG.COLORS.HIDDEN;
    cfg.isHidden = true;
  }

  if (!cfg.isHidden) cfg.fillColor = cfg.strokeColor + CONFIG.DEFAULTS.OPACITY;
  return cfg;
}

function createStyle(styleConfig) {
  if (!styleConfig) {
    return new ol.style.Style({
      fill: new ol.style.Fill({ color: CONFIG.COLORS.BLUE + CONFIG.DEFAULTS.OPACITY }),
      stroke: new ol.style.Stroke({ color: CONFIG.COLORS.BLUE, width: CONFIG.DEFAULTS.STROKE_WIDTH }),
    });
  }

  if (typeof styleConfig === 'string') {
    const parsed = parseStyleString(styleConfig);
    if (parsed.isHatched) {
      return new ol.style.Style({
        fill: new ol.style.Fill({ color: createHatchPattern(parsed.strokeColor) }),
        stroke: new ol.style.Stroke({
          color: parsed.strokeColor,
          width: CONFIG.DEFAULTS.HOVER_STROKE_WIDTH,
          lineDash: [5, 5],
        }),
      });
    }
    return new ol.style.Style({
      fill: new ol.style.Fill({ color: parsed.fillColor }),
      stroke: new ol.style.Stroke({
        color: parsed.strokeColor,
        width: CONFIG.DEFAULTS.STROKE_WIDTH,
        lineDash: parsed.lineDash,
      }),
    });
  }

  return new ol.style.Style({
    fill: new ol.style.Fill({
      color: styleConfig.fill?.color || (CONFIG.COLORS.BLUE + CONFIG.DEFAULTS.OPACITY),
    }),
    stroke: new ol.style.Stroke({
      color: styleConfig.stroke?.color || CONFIG.COLORS.BLUE,
      width: styleConfig.stroke?.width || CONFIG.DEFAULTS.STROKE_WIDTH,
      lineDash: styleConfig.stroke?.lineDash || null,
    }),
  });
}

function createHoverStyle() {
  return new ol.style.Style({
    fill: new ol.style.Fill({ color: 'rgba(0,48,120,0.3)' }),
    stroke: new ol.style.Stroke({ color: 'rgba(0,48,120,1)', width: 2 }),
  });
}

function createDrawStyles() {
  const makeStyle = (fill, stroke, width = 3, dash = null) => ({
    fill: new ol.style.Fill({ color: fill }),
    stroke: new ol.style.Stroke({ color: stroke, width, lineDash: dash }),
    image: new ol.style.Circle({ radius: 5, fill: new ol.style.Fill({ color: stroke }) }),
  });

  return {
    'DRAW': new ol.style.Style(makeStyle([0, 48, 120, 0.2], CONFIG.COLORS.BLUE, 3, [5, 5])),

    'EDIT': [
      // Main polygon style
      new ol.style.Style(makeStyle([0, 112, 60, 0.2], CONFIG.COLORS.GREEN, 2)),

      // Vertex circles
      new ol.style.Style({
        image: new ol.style.Circle({
          radius: 5,
          fill: new ol.style.Fill({ color: CONFIG.COLORS.GREEN }),
        }),
        geometry: (feature) => {
          const coords = feature.getGeometry().getCoordinates().flat(1);
          return Array.isArray(coords) ? new ol.geom.MultiPoint(coords) : null;
        },
      }),
    ],

    'REMOVE': new ol.style.Style(makeStyle([212, 53, 28, 0.2], CONFIG.COLORS.RED, 2)),
    'NONE': new ol.style.Style(makeStyle([6, 88, 229, 0.1], '#0658e5', 2)),
    'HOVER': createHoverStyle(),
    'HIGHLIGHT': new ol.style.Style({
      fill: new ol.style.Fill({ color: [255, 221, 0, 0.6] }),
      stroke: new ol.style.Stroke({ color: CONFIG.COLORS.BLUE, width: 3 }),
    }),
    'SHOW_CHARGE': new ol.style.Style({
      fill: new ol.style.Fill({ color: [255, 255, 255, 0.25] }),
      stroke: new ol.style.Stroke({ color: '#0658e5', width: 2 }),
    }),
    'FADE': new ol.style.Style({
      fill: new ol.style.Fill({ color: [255, 255, 255, 0] }),
      stroke: new ol.style.Stroke({ color: [255, 255, 255, 0], width: 1 }),
    }),
    'HOLE': new ol.style.Style({
      fill: new ol.style.Fill({
        color: '#0d316f33'
      }),
      stroke: new ol.style.Stroke({
        color: '#0d316f',
        width: 3,
        lineDash: [1, 5]
      })
    }),
  };
}

// ============================================================================
// LAYER HELPERS
// ============================================================================
function createBaseLayer(tileUrl) {
  var baseLayer;

  if (tileUrl.length > 0) {
    
    if (tileUrl.indexOf("api.os.uk")>-1) {
      
      baseLayer = new ol.layer.Tile({
        source: new ol.source.XYZ({
          url: tileUrl,
          projection: 'EPSG:27700',
          tileGrid: new ol.tilegrid.TileGrid({
            origin: [-238375.0, 1376256.0],
            resolutions: [896.0, 448.0, 224.0, 112.0, 56.0, 28.0, 14.0, 7.0, 3.5, 1.75, 0.875, 0.4375, 0.21875, 0.109375],
            matrixIds: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
          })
        })
      })

    } else {
      baseLayer = new ol.layer.Tile({
          source: new ol.source.XYZ({ url: tileUrl })
      });
    }
  } else {
      baseLayer = new ol.layer.Tile({
        source: new ol.source.OSM()
      });
  }

  return baseLayer
}

function createVectorLayers(layerSettings) {
  if (!layerSettings || !Array.isArray(layerSettings)) return [];
  return layerSettings.map(
    (cfg, i) =>
      new ol.layer.Vector({
        name: `LAYER_${i + 1}`,
        source: new ol.source.Vector(),
        style: createStyle(cfg.style),
      }),
  );
}

function createDrawLayer() {
  state.drawSource = new ol.source.Vector();
  return new ol.layer.Vector({ name: 'draw_layer', source: state.drawSource });
}

function getLayerByName(map, name) {
  return map.getLayers().getArray().find((l) => l.get('name') === name);
}

// ============================================================================
// INTERACTION HELPERS
// ============================================================================
function addHoverInteraction(map) {
  let hoveredFeature = null;
  const mapElement = map.getTargetElement();
  const hoverStyle = createHoverStyle();

  map.on('pointermove', (evt) => {
    const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f);
    if (feature !== hoveredFeature) {
      if (hoveredFeature) hoveredFeature.setStyle(null);
      if (feature) {
        feature.setStyle(hoverStyle);
        mapElement.style.cursor = 'pointer';
      } else {
        mapElement.style.cursor = '';
      }
      hoveredFeature = feature;
    }
  });

  mapElement.addEventListener('mouseleave', () => {
    if (hoveredFeature) {
      hoveredFeature.setStyle(null);
      hoveredFeature = null;
      mapElement.style.cursor = '';
    }
  });

  map.on('click', (evt) => {
    const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f);
    if (feature) {
      const mapEvent = new CustomEvent(CONFIG.EVENTS.MAP_CLICK, {
        detail: { message: feature },
      });
      document.dispatchEvent(mapEvent);
    }
  });
}

// ============================================================================
// DRAW & INTERACTION
// ============================================================================
function addDrawInteraction(map, type, drawLayer, drawStyles) {
  map.removeInteraction(state.currentInteraction);
  drawLayer.setStyle(drawStyles[DRAW]);

  const interaction = new ol.interaction.Draw({
    type,
    style: drawStyles[DRAW],
    geometryFunction: type === 'Circle' ? ol.interaction.Draw.createRegularPolygon(30) : undefined,
    
  });

  interaction.on('drawstart', () => {
    state.isDrawing = true;
    storeUndoState();
  });

  interaction.on('drawend', (event) => {
    const newFeature = event.feature;
    
    // Get all existing features
    const existingFeatures = drawLayer.getSource().getFeatures();
   
    if (type ==="Polygon" || type === "Circle") {
      if (existingFeatures.length > 0) {
        combinePolygons([...existingFeatures, newFeature]);
      }else{
        drawLayer.getSource().addFeature(newFeature);
      }
    }else{
        drawLayer.getSource().addFeature(newFeature);
    }

    event.feature.setProperties({ id: Date.now() });
    state.isDrawing = false;
  });

  function combinePolygons(features) {
    const format = new ol.format.GeoJSON();
    const source = drawLayer.getSource();

    // Filter to only include polygon features
    const polygonFeatures = features.filter(f => {
        const geom = f.getGeometry();
        const geomType = geom.getType();
        return geomType === 'Polygon' || geomType === 'MultiPolygon';
    });
    // or not
    const nonPolygonFeatures = features.filter(f => {
        const geom = f.getGeometry();
        const geomType = geom.getType();
        return geomType !== 'Polygon' && geomType !== 'MultiPolygon';
    });
    
    source.clear();
    
    // If we have polygons, combine them
    if (polygonFeatures.length > 0) {
        const featureCollection = {
            type: 'FeatureCollection',
            features: polygonFeatures.map(f => format.writeFeatureObject(f))
        };
        
        const unionResult = turf.union(featureCollection);
        const combinedFeature = format.readFeature(unionResult);
        source.addFeature(combinedFeature);
    }
    
    // Add back all non-polygon features
    nonPolygonFeatures.forEach(f => source.addFeature(f));
    
  }

  state.currentInteraction = interaction;
  map.addInteraction(interaction);
}

function addCutoutInteraction(map, drawLayer, drawStyles) {
  map.removeInteraction(state.currentInteraction);
    
    const interaction = new ol.interaction.Draw({
      source: drawLayer.getSource(),
      type: 'Polygon',
      style: drawStyles[HOLE],
      
      // Condition to only draw when clicking on an existing polygon
      condition: function(event) {
        const features = drawLayer.getSource().getFeaturesAtCoordinate(event.coordinate);
        return features.length > 0 && features[0].getGeometry().getType() === 'Polygon';
      },
      
      geometryFunction: function(coords, geometry) {
        if (!geometry) {
          geometry = new ol.geom.Polygon([]);
        }
        
        // Close the ring by adding the first coordinate at the end
        const closedCoords = coords[0].concat([coords[0][0]]);
        geometry.setCoordinates([closedCoords]);
        
        state.drawing = coords[0].length > 1;
        return geometry;
      }
    });

    interaction.on('drawstart', function(event) {
      storeUndoState();
    });
    
    interaction.on('drawend', function(e) {
      const holeGeometry = e.feature.getGeometry();
      const holeCoords = holeGeometry.getCoordinates()[0];
      
      // Find the polygon feature at the drawn location
      const coordinate = holeCoords[0];
      const features = drawLayer.getSource().getFeaturesAtCoordinate(coordinate);
      
      if (features.length > 0) {
        const targetFeature = features[0];
        const targetGeom = targetFeature.getGeometry();
        
        if (targetGeom.getType() === 'Polygon') {
          // Get the outer ring to check its orientation
          const outerRing = targetGeom.getLinearRing(0);
          const outerArea = outerRing.getArea();
          
          // Create linear ring from hole coordinates
          let linearRing = new ol.geom.LinearRing(holeCoords);
          const holeArea = linearRing.getArea();
          
          // If both have same sign (same winding), reverse the hole
          if ((outerArea > 0 && holeArea > 0) || (outerArea < 0 && holeArea < 0)) {
            const reversedCoords = holeCoords.slice().reverse();
            linearRing = new ol.geom.LinearRing(reversedCoords);
          }
          
          // Append the hole
          targetGeom.appendLinearRing(linearRing);
          
          // Force the feature to redraw by notifying it has changed
          targetFeature.changed();
            
          // Prevent the hole from being added as a separate feature
          setTimeout(() => {
            drawLayer.getSource().removeFeature(e.feature);
          }, 5); 

        }

      }
      e.feature.setProperties({ id: Date.now() });
      state.drawing = false;
    });
    
    state.currentInteraction = interaction;
    map.addInteraction(interaction);
}

function addModifyInteraction(map, drawLayer, drawStyles) {
  map.removeInteraction(state.currentInteraction);
  drawLayer.setStyle(drawStyles[EDIT]);

  const interaction = new ol.interaction.Modify({
    source: drawLayer.getSource(),
    style: drawStyles[EDIT],
  });

  interaction.on('modifystart', storeUndoState);

  state.currentInteraction = interaction;
  map.addInteraction(interaction);
}

function addDeleteInteraction(map, drawLayer) {
  map.removeInteraction(state.currentInteraction);
  drawLayer.setStyle(createDrawStyles()[REMOVE]);

  const interaction = new ol.interaction.Select({ layers: [drawLayer] });
  interaction.getFeatures().on('add', (e) => {
    const id = e.element.getProperties().id;
    removeSelectedFeature(id);
    interaction.getFeatures().clear();
  });

  state.currentInteraction = interaction;
  map.addInteraction(interaction);
}

function removeSelectedFeature(id) {
  storeUndoState();
  const features = state.drawSource.getFeatures();
  const feature = features.find((f) => f.getProperties().id === id);
  if (feature) state.drawSource.removeFeature(feature);
}

function setDrawMode(map, modeType) {
  const drawLayer = getLayerByName(map, 'draw_layer');
  const drawStyles = createDrawStyles();
  
  const modes = {
    'draw-area': () => addDrawInteraction(map, 'Polygon', drawLayer, drawStyles),
    'cutout-area': () => addCutoutInteraction(map, drawLayer, drawStyles),
    'add-circle': () => addDrawInteraction(map, 'Circle', drawLayer, drawStyles),
    'add-point': () => addDrawInteraction(map, 'Point', drawLayer, drawStyles),
    'add-line': () => addDrawInteraction(map, 'LineString', drawLayer, drawStyles),
    'edit-area': () => addModifyInteraction(map, drawLayer, drawStyles),
    'delete-area': () => addDeleteInteraction(map, drawLayer),
  };
  if (modes[modeType]) modes[modeType]();
}

// ============================================================================
// UNDO
// ============================================================================
function storeUndoState() {
  state.undoStack.push(getGeometries());
  if (state.undoStack.length > CONFIG.UNDO.MAX_STACK_SIZE) {
    state.undoStack = state.undoStack.slice(-CONFIG.UNDO.MAX_STACK_SIZE);
  }
  enableUndoButton(true);
}

function undo() {
  if (state.isDrawing && state.currentInteraction?.removeLastPoint) {
    state.currentInteraction.removeLastPoint();
  } else if (state.undoStack.length > 0) {
    putGeometries(state.undoStack.pop());
    enableUndoButton(state.undoStack.length > 0);
  }
}

function enableUndoButton(enable) {
  const btn = document.getElementById('undoBtn');
  if (btn) btn.disabled = !enable;
}

function getGeometries() {
  return new ol.format.GeoJSON().writeFeatures(state.drawSource.getFeatures(), {
    dataProjection: CONFIG.PROJECTION.EPSG_27700,
    featureProjection: CONFIG.PROJECTION.EPSG_27700,
    decimals: 2 // Round to 2 decimal places
  });
}

function putGeometries(geometry) {
  state.drawSource.clear();
  const features = new ol.format.GeoJSON().readFeatures(geometry, {
    dataProjection: CONFIG.PROJECTION.EPSG_27700,
    featureProjection: CONFIG.PROJECTION.EPSG_27700,
  });
  state.drawSource.addFeatures(features);
}

function clearAllDrawings() {
  state.drawSource.clear();
}

// ============================================================================
// MAP CREATION
// ============================================================================
async function loadLayerGeometries(map, layerSettings, coords, zoom) {
  if (!layerSettings || !Array.isArray(layerSettings)) return;

  let hasInteractiveLayer = false;

  for (let i = 0; i < layerSettings.length; i++) {
    const config = layerSettings[i];
    if (config.path_to_geometry) {
      const layer = map.getLayers().item(i + 1); // Base layer at index 0
      const source = layer.getSource();
      const geometryIndex = config.geometry_index ?? null;

      try {
        const response = await fetch(config.path_to_geometry);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        let geojsonData = await response.json();
        if (geometryIndex !== null && geojsonData.features) {
          geojsonData = geojsonData.features[geometryIndex];
        }

        const features = new ol.format.GeoJSON().readFeatures(geojsonData);
        source.addFeatures(features);

        // Fit view only if default coords were used
        if (
          Array.isArray(coords) &&
          coords[0] === CONFIG.DEFAULTS.COORDS[0] &&
          coords[1] === CONFIG.DEFAULTS.COORDS[1]
        ) {
          const extent = source.getExtent();
          if (extent && extent.some((c) => isFinite(c))) {
            map.getView().fit(extent, {
              padding: CONFIG.DEFAULTS.PADDING,
              maxZoom: CONFIG.DEFAULTS.MAX_ZOOM,
            });
            if (zoom !== CONFIG.DEFAULTS.ZOOM) map.getView().setZoom(zoom);
          }
        }
      } catch (error) {
        console.warn(`Failed to load geometry for layer ${i + 1}:`, error);
      }

      if (config.interactive?.toUpperCase() === 'TRUE') {
        hasInteractiveLayer = true;
      }
    }
  }

  if (hasInteractiveLayer) {
    addHoverInteraction(map);
  }
}

async function createMap(target, options = {}) {
  initProjection();

  const coords = options.coords || CONFIG.DEFAULTS.COORDS;
  const zoom = options.zoom || CONFIG.DEFAULTS.ZOOM;

  const layers = [
    createBaseLayer(options.tile_url),
    ...createVectorLayers(options.layers),
    createDrawLayer(),
  ];

  const map = new ol.Map({
    target,
    layers,
    view: new ol.View({
      projection: CONFIG.PROJECTION.EPSG_27700,
      center: coords,
      zoom,
    }),
  });

  // Store map reference on element in order to update map from code on page
  const mapElement = document.getElementById(target);
  if (mapElement) {
    mapElement._olMap = map;
  }

  // Optional controls
  if (options.layerControls) {
    initializeCheckboxes(target);
    setupCheckboxListener(map);
  }

  await loadLayerGeometries(map, options.layers, coords, zoom);
  return map;
}

// ============================================================================
// INITIALIZATION
// ============================================================================
function initializeCheckboxes(target) {
  const checkboxes = document.getElementsByClassName(CONFIG.SELECTORS.CHECKBOX_CLASS);
  Array.from(checkboxes).forEach((checkbox) => {
    checkbox.addEventListener('change', function () {
      const clickEvent = new CustomEvent(CONFIG.EVENTS.CHECKBOX, {
        detail: {
          message: {
            sender: target,
            id: this.id,
            isChecked: this.checked,
          },
        },
      });
      document.dispatchEvent(clickEvent);
    });
  });
}

function setupCheckboxListener(map) {
  document.addEventListener(CONFIG.EVENTS.CHECKBOX, (e) => {
    const { id, isChecked, sender } = e.detail.message;
    if (sender === map.getTarget()) {
      const layer = getLayerByName(map, id);
      if (layer) layer.setVisible(isChecked);
    }
  });
}

function parseMapOptions(el) {
  let coords = null;
  try {
    const data = el.dataset.coords;
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length) coords = parsed;
    }
  } catch (error) {
    console.warn('Invalid coords data:', error);
  }

  return {
    coords,
    zoom: parseInt(el.dataset.zoom) || CONFIG.DEFAULTS.ZOOM,
    layerControls: el.dataset.layer_controls?.toUpperCase() === 'TRUE',
    tile_url: el.dataset.tileurl || '',
    layers: el.dataset.layers ? JSON.parse(el.dataset.layers) : null,
  };
}

function initializeMaps() {
  document.querySelectorAll(`.${CONFIG.SELECTORS.MAP_CLASS}`).forEach((el, i) => {
    const target = `map${i + 1}`;
    el.id = target;
    const options = parseMapOptions(el);
    createMap(target, options).catch((error) =>
      console.warn(`Failed to create map ${target}:`, error),
    );
  });
}

document.addEventListener('DOMContentLoaded', initializeMaps);

// ============================================================================
// EXPORTS
// ============================================================================
/* if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createMap,
    initializeMaps,
    setDrawMode,
    undo,
    clearAllDrawings,
    CONFIG,
  };
} */