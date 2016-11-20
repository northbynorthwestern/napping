const _ = require('lodash');
const copyFile = require("json-loader!./../data/copy");
const locationTemplate = require("./../templates/partials/location.hbs");
const googleApiKey = "AIzaSyCCuYYtuG5ZxKT893FxyVLGWQk79egrbi0"

var nbnGeoTools = new NBNGeoTools();
var napLocationData = {};
var currentLocation = { "geometry": {"type": "point", "coordinates": [0,0]}, }

var locationsDOM = document.querySelector('#locations');
var canvasContainerDOM = document.querySelector('.canvas-container')
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
  titleDOM.classList.add('fade-out');
  emojiRain.addDrops(200);

  if (navigator.geolocation) {
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
  data.features = _.map(data.features, processFeatureProperty);
  setTimeout(function() {
    emojiRain.stop();
    locationsDOM.innerHTML = locationTemplate(data);
  }, 1000);
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


function EmojiRain(parentElement) {
  this.dropsForDrawing = [];

  this.drops = 100;
  this.active = false;
  this.emoji = ['1F62A', '1F634', '1F62B', '1F629', '1F6CF', '1F6CC', '1F4A4', '1F4A4'];
  this.totalEmoji = this.emoji.length;
  this.imageTransmogrifier = document.createElement('div');
  this.useTwemoji = false;

  this.canvas = document.createElement('canvas');

  this.context = this.canvas.getContext('2d');
  this.context.fillStyle = 'black';
  this.parentElement = parentElement;
}


EmojiRain.prototype = {
  init: function() {
    this.resizeWindow();
    this.scaleCanvas();

    var self = this;
    window.addEventListener('resize', function() {
      self.resizeWindow();
    }, false);

    if (!this.useTwemoji) {
      this.generateDrops();
    }

    this.parentElement.appendChild(this.canvas);
  },

  start: function() {
    this.resizeWindow();
    this.scaleCanvas();
    this.active = true;
    this.animate();
  },

  stop: function() {
    this.active = false;
    clearTimeout(this.timeout);
    window.cancelAnimationFrame(this.animationFrame);
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  },


  giveMeARandomEmoji: function() {
    var emoji = {};
    emoji.code = this.emoji[Math.floor((Math.random() * this.totalEmoji))];
    emoji.char = this.fromCodePoint(emoji.code);
    // 1 to window size
    emoji.x = Math.floor((Math.random() * this.canvas.width) + 1);
    emoji.y = Math.floor((Math.random() * this.canvas.height) + 1);
    if (this.useTwemoji && this.importedTwemoji) {
      this.imageTransmogrifier.innerHTML = twemoji.parse(emoji.char);
      emoji.img = this.imageTransmogrifier.childNodes[0];
    }
    // I am pulling these numbers out of a hat.
    emoji.speed = Math.floor(Math.random() * 2 + 1);
    emoji.opacity = 1;
    emoji.opacitySpeed = 0.005 * (Math.random() * 2 + 1);
    return emoji;
  },

  generateDrops: function(number) {
    this.dropsForDrawing = [];
    for (var i = 0; i < this.drops; i++) {
      var emoji = this.giveMeARandomEmoji();
      emoji.arrayIndex = i;
      this.dropsForDrawing.push(emoji);
    }
  },

  addDrops: function(number) {
    startLength = this.dropsForDrawing.length
    for (var i = 0; i < number; i++) {
      var emoji = this.giveMeARandomEmoji();
      emoji.arrayIndex = startLength + i;
      this.dropsForDrawing.push(emoji);
    }
  },

  animate: function() {
    var self = this;
    var boundAnimate = _.bind(self.animate, self);
    self.animationFrame = window.requestAnimationFrame(boundAnimate);
    self.context.clearRect(0, 0, self.canvas.width, self.canvas.height);
    for (var i = 0; i < self.dropsForDrawing.length; i++) {
      self.paintEmoji(self.dropsForDrawing[i]);
    }
  },

  paintEmoji: function(emoji) {
    if (emoji.y >= this.canvas.height || emoji.opacity < 0.1) {
      var i = emoji.arrayIndex;
      emoji = this.giveMeARandomEmoji();
      emoji.arrayIndex = i;
      this.dropsForDrawing[i] = emoji;
    }
    else {
      emoji.y += emoji.speed;
      emoji.opacity -= emoji.opacitySpeed;
    }
    this.context.globalAlpha = emoji.opacity;
    var isEven = emoji.arrayIndex % 2;
    if (this.useTwemoji && emoji.img && emoji.img != '') {
      var size = isEven ? 20 : 30;
      this.context.drawImage(emoji.img, emoji.x, emoji.y, size, size);
    } else {
      this.context.font = isEven ? '20px serif' : '30px serif';
      this.context.fillText(emoji.char, emoji.x, emoji.y);
    }
    this.context.restore();
  },

  resizeWindow: function() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  scaleCanvas: function() {
    // Finally query the various pixel ratios.
    var devicePixelRatio = window.devicePixelRatio || 1;
    var backingStoreRatio = this.context.webkitBackingStorePixelRatio ||
                        this.context.mozBackingStorePixelRatio ||
                        this.context.msBackingStorePixelRatio ||
                        this.context.oBackingStorePixelRatio ||
                        this.context.backingStorePixelRatio || 1;
    var ratio = devicePixelRatio / backingStoreRatio;
    // Upscale the canvas if the two ratios don't match.
    if (devicePixelRatio !== backingStoreRatio) {
        var oldWidth = this.canvas.width;
        var oldHeight = this.canvas.height;
        this.canvas.width = oldWidth * ratio;
        this.canvas.height = oldHeight * ratio;
        this.canvas.style.width = oldWidth + 'px';
        this.canvas.style.height = oldHeight + 'px';
        // Now scale the context to counter the fact that we've manually scaled
        // our canvas element.
        this.context.scale(ratio, ratio);
    }
  },

  fromCodePoint: function(codepoint) {
    var code = typeof codepoint === 'string' ?
          parseInt(codepoint, 16) : codepoint;
    if (code < 0x10000) {
      return String.fromCharCode(code);
    }
    code -= 0x10000;
    return String.fromCharCode(
      0xD800 + (code >> 10),
      0xDC00 + (code & 0x3FF)
    );
  }
};

var emojiRain = new EmojiRain(canvasContainerDOM);
emojiRain.init();
emojiRain.start();

