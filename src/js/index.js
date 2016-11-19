const _ = require('lodash');
const copyFile = require("json-loader!./../data/copy");
const locationTemplate = require("./../templates/partials/location.hbs");

var nbnGeoTools = new NBNGeoTools();
var napLocationData = {};
var currentLocation = { "geometry": {"type": "point", "coordinates": [0,0]}, }

var locationsDOM = document.querySelector('#locations')

function start() {
  napLocationData = copyToGeoJson(copyFile.naps);
  getLocation();
}

function copyToGeoJson(arr) {
  data = {
    "type": "FeatureCollection",
    "features": []
  }
  for (let loc of arr) {
    data.features.push({
      geometry: {"type": "point", coordinates: [loc.longitude, loc.latitude]},
      properties: _.omit(loc, ['latitude', 'longitude'])
    });
  }
  return data;
}

function getLocation() {
  console.log("getting location...")
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(orderPointsFromCurrentPosition);
  } else {
    x.innerHTML = "Geolocation is not supported by this browser.";
  }
}

function orderPointsFromCurrentPosition(position) {
  currentLocation.geometry.coordinates = [position.coords.longitude, position.coords.latitude]
  napLocationData.features = nbnGeoTools.orderByDistanceFromPoint(currentLocation, napLocationData.features);
  updateDOM(napLocationData);
}

function updateDOM(data) {
  data.features = _.map(data.features, processFeatureProperty)
  locationsDOM.innerHTML = locationTemplate(data);
}

function processFeatureProperty(feature) {
  feature.properties.distanceString = makeDistanceString(feature.properties.distance)
  return feature;
}

function makeDistanceString(dist) {
   if (dist > 0.5) {
    return dist.toFixed(2) + " mi";
  } else {
    return Math.round(dist * 5280.0) + " ft";
  };
}

function NBNGeoTools() {
  this.getDistance = function(point1, point2, units) {
    // https://github.com/Turfjs/turf-distance/blob/master/index.js
    var coordinates1 = point1.geometry.coordinates;
    var coordinates2 = point2.geometry.coordinates;

    var dLat = this._toRad(coordinates2[1] - coordinates1[1]);
    var dLon = this._toRad(coordinates2[0] - coordinates1[0]);
    var lat1 = this._toRad(coordinates1[1]);
    var lat2 = this._toRad(coordinates2[1]);

    var a = Math.pow(Math.sin(dLat/2), 2) + Math.pow(Math.sin(dLon/2), 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var R;
    switch(units) {
      case 'miles':
        R = 3960;
        break;
      case 'kilometers':
      case 'kilometres':
      case undefined:
        R = 6373;
        break;
    }
    var distance = R * c;
    return distance;
  },

  this._toRad = function(degree) { return degree * Math.PI / 180; },

  this.orderByDistanceFromPoint = function(basePoint, points) {
    var newFeatures = [];
    for (var i = 0; i < points.length; i++) {
      var distance = this.getDistance(basePoint, points[i]);
      var augmentedPoint = Object(points[i]);
      augmentedPoint.properties.distance = distance;
      newFeatures.push(augmentedPoint);
    }
    return newFeatures.sort(function(a, b) {
      return a.properties.distance - b.properties.distance;
    });
  }
}

start();
