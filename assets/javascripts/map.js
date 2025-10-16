
function createMap(target, coords, zoom, path_to_geometry) {
  coords = coords || [248050, 53750];
  zoom = zoom || 15;
  path_to_geometry = path_to_geometry || "";
  console.log('create map ' + target, coords, zoom, path_to_geometry);

  // define the British National Grid projection
  proj4.defs("EPSG:27700", "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs");
  ol.proj.proj4.register(proj4);

  const stroke_color = '#0b0c0c';
  const fill_color = stroke_color + '33'; // use RGBA Color Space
  const source = new ol.source.Vector();

  const style = new ol.style.Style({
    fill: new ol.style.Fill({
      color: fill_color
    }),
    stroke: new ol.style.Stroke({
      color: stroke_color,
      width: 3
    })
  });

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
    addBoundary(path_to_geometry, map);
  }

}

async function addBoundary(path_to_geometry, map) {
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
    if (center && (center[0]!=="248050" && center[1] != "53750" )) {
      view.setCenter(center);

    }else{
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
    console.log('Loaded fallback polygons due to file loading error');
  } finally {
    //loadingElement.classList.remove('show');
  }

}

document.addEventListener("DOMContentLoaded", (event) => {
  console.log('ready');
  // get all map class tags
  let maps = document.getElementsByClassName('map');

  // loop thru and assign a target id then get data attributes and call the map function
  for (let i = 0; i < maps.length; i++) {
    let target = 'map' + (i + 1);
    let coords = JSON.parse(maps[i].dataset.coords);
    if (coords.length == 0) {
      coords = null;
    }
    let zoom = maps[i].dataset.zoom;
    let path_to_geometry = maps[i].dataset.path_to_geometry;
    maps[i].setAttribute('id', target);

    createMap(target, coords, zoom, path_to_geometry);
  }

})