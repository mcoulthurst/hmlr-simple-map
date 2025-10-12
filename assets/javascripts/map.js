console.log("here now");



function createMap(target, coords) {
  console.log('create map ' + target, coords);

  let center = [227050, 61750];

  if (coords.length < 0) {
    coords = center;
  }

  // Define the British National Grid projection
  proj4.defs("EPSG:27700", "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs");
  ol.proj.proj4.register(proj4);

  // Create map with OSM tiles, passing in the target element and the coords
  let baseLayer = new ol.layer.Tile({
    source: new ol.source.OSM()
  });

  const map = new ol.Map({
    target: target,
    layers: [
      baseLayer
    ],
    view: new ol.View({
      projection: 'EPSG:27700',
      center: coords,
      zoom: 15
    })
  });

  const view = map.getView();
  const zoom = view.getZoom();
  view.animate({
    zoom: 16,
    duration: 100
  });

}

document.addEventListener("DOMContentLoaded", (event) => {
  console.log('ready');
  //get all map class tags
  let maps = document.getElementsByClassName('map');

  for (let i = 0; i < maps.length; i++) {
    let target = 'map' + (i + 1);
    let coords = JSON.parse(maps[i].dataset.coords);
    maps[i].setAttribute('id', target);
    createMap(target, coords);
  }


})