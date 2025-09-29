console.log("here now", startPosn);

let center = [227050, 61750];
if (startPosn) {
  center = startPosn;
}
// Define the British National Grid projection
proj4.defs("EPSG:27700", "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs");
ol.proj.proj4.register(proj4);

// Create map with OSM tiles
let baseLayer = new ol.layer.Tile({
  source: new ol.source.OSM()
});


const map = new ol.Map({
  target: 'map',
  layers: [
    baseLayer
  ],
  view: new ol.View({
    projection: 'EPSG:27700',
    center: center,
    zoom: 15
  })
});


const view = map.getView();
const zoom = view.getZoom();

view.animate({
  zoom: 16,
  duration: 100
});

