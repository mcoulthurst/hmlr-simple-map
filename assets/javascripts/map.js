
function createMap(target, coords, zoom, path_to_geometry, styleObj) {
  coords = coords || [248050, 53750];
  zoom = zoom || 15;
  path_to_geometry = path_to_geometry || "";

  console.log('create map ' + target, coords, zoom, path_to_geometry);

  // define the British National Grid projection
  proj4.defs("EPSG:27700", "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs");
  ol.proj.proj4.register(proj4);

  let stroke_color = '#0b0c0c';
  let width = 3;
  let lineDash = null;

  let fill_color = stroke_color + '33'; // use RGBA Color Space
  const blue_color = '#003078';
  const green_color = '#00703c';
  const red_color = '#d4351c';

  const source = new ol.source.Vector();

  if (styleObj) {
    // check for style sets as a string (blue, red or green)
    if (typeof styleObj === "string") {
      styleObj = styleObj.toUpperCase();

      console.log(styleObj);
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
      } else  {
        lineDash = null;
      }


      fill_color = stroke_color + '33'; // use RGBA Color Space
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

  let hoverStyle = new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(0,48,120,0.3)'
    }),
    stroke: new ol.style.Stroke({
      color: 'rgba(0,48,120,1)',
      width: 2
    })
  })

  // create vector layer
  const geometryLayer = new ol.layer.Vector({
    source: source,
    style: style
  });

  // Create map with OSM tiles, passing in the target element and the coords
  let baseLayer = new ol.layer.Tile({
    source: new ol.source.OSM()
  });

  const map = new ol.Map({
    target: target,
    layers: [
      baseLayer,
      geometryLayer
    ],
    view: new ol.View({
      projection: 'EPSG:27700',
      center: coords,
      zoom: zoom
    })
  });

  if (path_to_geometry) {
    addBoundary(path_to_geometry);
    addHover(map);
  }

  // keep this addBoundary within the main createMap function scope
  async function addBoundary(path_to_geometry) {
    // get the source to load the polygons into 
    const source = map.getLayers().item(1).getSource();
    const view = map.getView();
    const center = view.getCenter();

    // Function to load polygons from external file
    try {
      const response = await fetch(path_to_geometry);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // add features from GeoJSON
      const geojsonData = await response.json();
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
            padding: [50, 50, 50, 50],
            maxZoom: 17
          });
        }

      }
      //console.log(`Loaded ${features.length} polygons from ${path_to_geometry}`);

    } catch (error) {
      console.error('Error loading polygons:', error);
    } finally {
      //loadingElement.classList.remove('show');
    }

  }



  function addHover(map) {
    
    // Add interaction for hover effects
    let hoveredFeature = null;
    const mapElement = map.getTargetElement();
    console.log('add hover', mapElement);

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
        console.log(feature.get('INSPIREID') );
        // dispatch a custom event
        const myEvent = new CustomEvent('hmlrMapClickEvent', {
          detail: { INSPIREID: feature.get('INSPIREID') }
        });

        mapElement.dispatchEvent(myEvent);


      }
    });

  }

}



document.addEventListener("DOMContentLoaded", (event) => {
  // get all map class tags
  let maps = document.getElementsByClassName('hmlr-map');

  // loop thru and assign a target id then get data attributes and call the map function
  for (let i = 0; i < maps.length; i++) {
    let target = 'map' + (i + 1);
    let coords = JSON.parse(maps[i].dataset.coords);
    if (coords.length == 0) {
      coords = null;
    }

    let style = null;
    if (maps[i].dataset.style.length > 0) {
      style = JSON.parse(maps[i].dataset.style);
    }

    let zoom = maps[i].dataset.zoom;
    let path_to_geometry = maps[i].dataset.path_to_geometry;
    maps[i].setAttribute('id', target);

    // todo: wrap the params in an options obj
    createMap(target, coords, zoom, path_to_geometry, style);
  }

})