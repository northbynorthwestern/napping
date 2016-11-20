const _ = require('lodash');
const copyFile = require("json-loader!./../data/copy");
const locationTemplate = require("./../templates/partials/location.hbs");
const googleApiKey = "AIzaSyCCuYYtuG5ZxKT893FxyVLGWQk79egrbi0"

var nbnGeoTools = new NBNGeoTools();
var napLocationData = {};
var currentLocation = { "geometry": {"type": "point", "coordinates": [0,0]}, }

var locationsDOM = document.querySelector('#locations')
var titleDOM = document.querySelector('#title')
var startButton = document.querySelector('button#start')

startButton.addEventListener('click', start)

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
    titleDOM.innerHTML = "<div class='loader'></div>"
    navigator.geolocation.getCurrentPosition(
      function(position) { orderPointsFromCurrentPosition(position.coords.longitude, position.coords.latitude)},
      function(failure) {
        if(failure.message.indexOf("Only secure origins are allowed") == 0) {
          getLocationWithGoogleApi();
        }
      }
    );
  } else {
    titleDOM.innerHTML = "Geolocation is not supported by this browser.";
  }
}

function getLocationWithGoogleApi() {
  console.log("getting stuff");
  url = "https://www.googleapis.com/geolocation/v1/geolocate?key=" + googleApiKey;
  request = new XMLHttpRequest();
  request.open('POST', url, true);
  request.onload = function() {
    if (request.status >= 200 && request.status < 400) {
      var d = JSON.parse(request.responseText);
      orderPointsFromCurrentPosition(d.location.lng, d.location.lat);
  	}
  };
  request.send();
}

function orderPointsFromCurrentPosition(longitude, latitude) {
  currentLocation.geometry.coordinates = [longitude, latitude]
  napLocationData.features = nbnGeoTools.orderByDistanceFromPoint(currentLocation, napLocationData.features);
  updateDOM(napLocationData);
}

function updateDOM(data) {
  data.features = _.map(data.features, processFeatureProperty)
  locationsDOM.innerHTML = locationTemplate(data);
}

function processFeatureProperty(feature) {
  feature.properties.distanceString = makeDistanceString(feature.properties.distance)
  feature.properties.directionsLink = makeMapLink(feature.geometry.coordinates)
  console.log(feature);
  return feature;
}

function makeDistanceString(dist) {
  if (!dist) { return false; }
  if (dist > 0.5) {
    return dist.toFixed(2) + " mi";
  } else {
    return Math.round(dist * 5280.0) + " ft";
  };
}

function makeMapLink(coords) {
  appleLink = "http://maps.apple.com/?dirflg=w?q=" + coords[0] + "," + coords[1]
  return appleLink
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

// start();
