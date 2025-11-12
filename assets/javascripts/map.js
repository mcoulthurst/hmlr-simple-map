
function createMap(target, options) {

  let coords = options.coords || [248050, 53750];
  let zoom = options.zoom || 15;
  let tile_url = options.tile_url || "";
  let layerSettings = options.layers || null;
  let source = new ol.source.OSM();
  let i = 0;

  console.log('create map ' + target, coords, zoom);
  console.log(layerSettings);

  // define the British National Grid projection
  proj4.defs("EPSG:27700", "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs");
  ol.proj.proj4.register(proj4);

  // Create XYZ source for base tiles
  if (tile_url) {
    source = new ol.source.XYZ({
      url: tile_url
    });
  }

  let hoverStyle = new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(0,48,120,0.3)'
    }),
    stroke: new ol.style.Stroke({
      color: 'rgba(0,48,120,1)',
      width: 2
    })
  })

  // loop through layerSettings, create and style each
  // capture the layers for the map
  let layers = [];

  // Create map with OSM tiles, passing in the target element and the coords
  let baseLayer = new ol.layer.Tile({
    source: source
  });

  layers.push(baseLayer);

  if(layerSettings){
    for( i=0; i<layerSettings.length; i++)
    {
      const style = getStyle(layerSettings[i].style);
      console.log(style);
      const vectorSource = new ol.source.Vector();
      
      // create vector layer
      const geometryLayer = new ol.layer.Vector({
        name: ("LAYER_" + (i+1) ),
        source: vectorSource,
        style: style
      });

      layers.push(geometryLayer);
    }
    
    // add custom listener for map event: hmlrMapClickEvent
    document.addEventListener('hmlrCheckBoxEvent', (event) => {
      const message = event.detail.message;
      const id = message.id;
      const isChecked = message.isChecked;

      // get layer sn set visibilty
      const layer = getLayerByName(id);    
      layer.setVisible(isChecked);
    });
  }

  const map = new ol.Map({
    target: target,
    layers: layers,
    view: new ol.View({
      projection: 'EPSG:27700',
      center: coords,
      zoom: zoom
    })
  });

  // store the map ref
  const mapElement = document.getElementById(target);
  mapElement._olMap = map;

  // once the map has been created add the boundaries
  if(layerSettings){
    for( i=0; i<layerSettings.length; i++)
    {
      if (layerSettings[i].path_to_geometry) {
        const index = layerSettings[i].geometry_index || null;
        addBoundary(layerSettings[i].path_to_geometry, i+1, index); // account for the base layer source
        if (layerSettings[i].interactive) {
          addHover(map);
        } 
      }
    }
  }

  // keep this addBoundary within the main createMap function scope
  async function addBoundary(path_to_geometry, layerCount, idx) {
    // get the source to load the polygons into 
    const source = map.getLayers().item(layerCount).getSource();
    const view = map.getView();
    const center = view.getCenter();

    // Function to load polygons from external file
    try {
      const response = await fetch(path_to_geometry);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // add features from GeoJSON
      let geojsonData = await response.json();
      if (idx){
        geojsonData = geojsonData.features[ idx ];
      }
      const features = new ol.format.GeoJSON().readFeatures(geojsonData);

      source.addFeatures(features);

      // if there are coords (not the default 248050, 53750), use those
      if (center && (center[0] !== "248050" && center[1] != "53750")) {
        view.setCenter(center);
      } else {
        // fit view to loaded features
        const extent = source.getExtent();
        // center the view on the new geometry
        // extent.some(coord => isFinite(coord)) tests two corner node coords
        if (extent && extent.some(coord => isFinite(coord))) {
          map.getView().fit(extent, {
            padding: [20, 20, 20, 20],
            maxZoom: 18
          });
          if (zoom !== 15) {
            view.setZoom(zoom);
          }
        }
      }
      //console.log(`Loaded ${features.length} polygons from ${path_to_geometry}`);
    } catch (error) {
      console.error('Error loading polygons:', error);
    } finally {
      //loadingElement.classList.remove('show');
    }
  }

  function getStyle(styleObj) {
    let width = 3;
    let lineDash = null;

    const blue_color = '#003078';
    const green_color = '#00703c';
    const red_color = '#d4351c';
    const hidden_color = '#d4351c00';

    let stroke_color = blue_color;
    let fill_color = stroke_color + '33'; // use RGBA Color Space

    if (styleObj) {
      // check for style sets as a string (blue, red or green)
      if (typeof styleObj === "string") {
        styleObj = styleObj.toUpperCase();

        if (styleObj.indexOf('RED') > -1) {
          stroke_color = red_color;
        } else if (styleObj.indexOf('GREEN') > -1) {
          stroke_color = green_color;
        } else {
          stroke_color = blue_color;
        }
        // check for line style (dashed or dotted)
        if (styleObj.indexOf('DASH') > -1) {
          lineDash = [5, 5];
        } else if (styleObj.indexOf('DOT') > -1) {
          lineDash = [1, 5];
        } else {
          lineDash = null;
        }

        fill_color = stroke_color + '33'; // use RGBA Color Space

        if (styleObj.indexOf('HIDDEN') > -1) {
          stroke_color = hidden_color;
          fill_color = hidden_color;
        }
      } else {
        if (styleObj.fill) {
          if (styleObj.fill.color) {
            fill_color = styleObj.fill.color;
          }
        }
        if (styleObj.stroke) {
          if (styleObj.stroke.color) {
            stroke_color = styleObj.stroke.color;
          }
          if (styleObj.stroke.width) {
            width = styleObj.stroke.width;
          }
          if (styleObj.stroke.lineDash) {
            lineDash = styleObj.stroke.lineDash;
          }
        }
      }
    }

    // set default style if none has been passed in
    let style = new ol.style.Style({
      fill: new ol.style.Fill({
        color: fill_color
      }),
      stroke: new ol.style.Stroke({
        color: stroke_color,
        lineDash: lineDash,
        width: width
      })
    });


    if (styleObj) {
      if (typeof styleObj === "string") {
        if (styleObj.indexOf('HATCHED') > -1) {
          console.log('got hatched');

          var hatched_fill = new ol.style.Fill();
          hatched_fill.setColor(hatch_pattern(stroke_color));
            
          style = new ol.style.Style({
            fill: hatched_fill,
            stroke: new ol.style.Stroke({
              color: stroke_color,
              width: 2,
              lineDash: [5, 5]
            })
          })

        }
      }
    }

    return style
  }

  function addHover(map) {
    // Add interaction for hover effects
    let hoveredFeature = null;
    const mapElement = map.getTargetElement();

    map.on('pointermove', function (evt) {
      const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
        return feature;
      });

      if (feature !== hoveredFeature) {
        // Reset previous hovered feature to default style
        if (hoveredFeature) {
          hoveredFeature.setStyle(null); // Reset to layer default style
        }

        // Set new hovered feature
        if (feature) {
          feature.setStyle(hoverStyle);
          mapElement.style.cursor = 'pointer';
        } else {
          mapElement.style.cursor = '';
        }

        hoveredFeature = feature;
      }
    });

    // Add explicit mouse leave handling for map container
    mapElement.addEventListener('mouseleave', function () {
      if (hoveredFeature) {
        hoveredFeature.setStyle(null); // Reset to layer default style
        hoveredFeature = null;
        mapElement.style.cursor = '';
      }
    });

    // Add click handler for feature info
    map.on('click', function (evt) {
      const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
        return feature;
      });  

      if (feature) {
        // dispatch a custom event
        const mapEvent = new CustomEvent('hmlrMapClickEvent', {
          detail: { message: feature }
        });
        document.dispatchEvent(mapEvent);
      }
    });
  }

  function getLayerByName(name) {
    return map.getLayers().getArray().find(layer => layer.get('name') === name);
  }
}

var hatch_pattern = function (colour) {
  var canvas = document.createElement('canvas');
  var context = canvas.getContext('2d');

  var pixel_ratio = devicePixelRatio;
  var width = 16 * pixel_ratio;
  var height = 16 * pixel_ratio;
  var offset = width * 0.93;

  canvas.width = width;
  canvas.height = height;
  context.strokeStyle = colour;
  context.lineWidth = 1;

  context.beginPath();
  //draw the diagonal line
  context.moveTo(0, 0);
  context.lineTo(width, height);
  //Fill in the top right of the corner so adjacent squares don't look strange
  context.moveTo(width - offset, height);
  context.lineTo(0, offset);
  //Fill in the top right of the corner so adjacent squares don't look strange
  context.moveTo(width, height - offset);
  context.lineTo(offset, 0);
  context.stroke()
  return context.createPattern(canvas, 'repeat');
};


document.addEventListener("DOMContentLoaded", () => {
  console.log('component loaded');
  // get all map class tags
  let maps = document.getElementsByClassName('hmlr-map');
  let options = {};

  // loop thru and assign a target id then get data attributes and call the map function
  for (let i = 0; i < maps.length; i++) {
    let target = 'map' + (i + 1);
    let zoom = maps[i].dataset.zoom;
    let tile_url = maps[i].dataset.tileurl;

    let coords = JSON.parse(maps[i].dataset.coords);
    if (coords.length == 0) {
      coords = null;
    }
    let layers = null;
    if (maps[i].dataset.layers.length > 0) {
      layers = JSON.parse(maps[i].dataset.layers);
    }

    maps[i].setAttribute('id', target);

    options.coords = coords;
    options.zoom = zoom;
    options.tile_url = tile_url;
    options.layers = layers;

    createMap(target, options);

    const checkboxes = document.getElementsByClassName('govuk-checkboxes__input');
    Array.from(checkboxes).forEach(checkbox => {
      checkbox.addEventListener('change', function () {
        const message = {
          id: this.id,
          isChecked: this.checked
        };
        // dispatch a custom event
        const clickEvent = new CustomEvent('hmlrCheckBoxEvent', {
          detail: { message: message }
        });
        document.dispatchEvent(clickEvent);
      });
    });
  }
})