"use strict";

function Sensor() {
    if (this.constructor === Sensor) {
        throw new TypeError("Illegal constructor");
    }
    var eventTarget = document.createDocumentFragment();

    function addEventListener(type, listener, useCapture, wantsUntrusted) {
        return eventTarget.addEventListener(type, listener, useCapture, wantsUntrusted);
    }

    function dispatchEvent(event) {
        var methodName = "on" + event.type;
        if (typeof this[methodName] == "function") {
            this[methodName](event);
        }
        return eventTarget.dispatchEvent(event);
    }

    function removeEventListener(type, listener, useCapture) {
        return eventTarget.removeEventListener(type, listener, useCapture);
    }

    this.addEventListener = addEventListener;
    this.dispatchEvent = dispatchEvent;
    this.removeEventListener = removeEventListener;
    
}

window.SensorReading = window.SensorReading || (function() {
    function SensorReading() {
        
    }
    return SensorReading;
})();

window.SensorReadingEvent = window.SensorReadingEvent || (function() {
    // This is a hack around Chrome throwing when calling Event without the new operator
    function SensorReadingEvent(type, options) {
        var event = new Event(type, options);
        event.reading = options.reading;
        event.constructor = SensorReadingEvent;
        return event;
    }
    //SensorReadingEvent.prototype = Object.create(Event.prototype, {
    //    reading: {
    //        value: null,
    //        writable: true,
    //        configurable: true,
    //        enumerable: true
    //    }
    //});
    //SensorReadingEvent.prototype.constructor = SensorReadingEvent;
    return SensorReadingEvent;
})();

window.GeolocationSensorReading = window.GeolocationSensorReading || (function() {
    function GeolocationSensorReading(dict) {
        this.accuracy         = dict.accuracy;
        this.altitude         = dict.altitude;
        this.altitudeAccuracy = dict.altitudeAccuracy;
        this.heading          = dict.heading;
        this.latitude         = dict.latitude;
        this.longitude        = dict.longitude;
        this.speed            = dict.speed;
        this.timeStamp        = dict.timeStamp;
    }
    GeolocationSensorReading.prototype = Object.create(SensorReading.prototype, {
        // This probably needs to be changed to setters and getters, but can do for now.
        accuracy: {
            value: null,
            writable: true,
            configurable: true,
            enumerable: true
        },
        altitude: {
            value: null,
            writable: true,
            configurable: true,
            enumerable: true
        },
        altitudeAccuracy: {
            value: null,
            writable: true,
            configurable: true,
            enumerable: true
        },
        heading: {
            value: null,
            writable: true,
            configurable: true,
            enumerable: true
        },
        latitude: {
            value: null,
            writable: true,
            configurable: true,
            enumerable: true
        },
        longitude: {
            value: null,
            writable: true,
            configurable: true,
            enumerable: true
        },
        speed: {
            value: null,
            writable: true,
            configurable: true,
            enumerable: true
        }
    });
    GeolocationSensorReading.prototype.constructor = GeolocationSensorReading;
    return GeolocationSensorReading;
})();


window.GeolocationSensor = window.GeolocationSensor || (function () {
    var privateData = new WeakMap();
    function cleanup() {
        var priv = privateData.get(this);
        priv.watchId = null;
        priv.startPromise = null;
        priv.startPromiseReject = null;
        privateData.set(this, priv);
        this.reading = null;
    }
    function GeolocationSensor(options) {
        privateData.set(this, { options: options || {} });
        Sensor.call(this);
    }
    GeolocationSensor.prototype = Object.create(Sensor.prototype);
    GeolocationSensor.prototype.constructor = GeolocationSensor;
    
    GeolocationSensor.prototype.start = function() {
        var priv = privateData.get(this);
        var options = priv.options;
        var self = this;
        if (!priv.startPromise) {
            priv.startPromise = new Promise(function(resolve, reject) {
                priv.startPromiseReject = reject;
                function onreading(position) {
                    var coords = position.coords;
                    var reading = new GeolocationSensorReading({
                        accuracy        : coords.accuracy,
                        altitude        : coords.altitude,
                        altitudeAccuracy: coords.altitudeAccuracy,
                        heading         : coords.heading,
                        latitude        : coords.latitude,
                        longitude       : coords.longitude,
                        speed           : coords.speed,
                        timeStamp       : position.timestamp // watch out for the diff casing, here.
                    });
                    if (privateData.get(self).watchId != null) {
                        self.reading = reading;
                        var event = new SensorReadingEvent("reading", {
                            reading: reading
                        });
                        resolve();
                        self.dispatchEvent(event);
                    }
                }
        
                function onerror(err) {
                    var errEvent = new ErrorEvent("error", {
                        message:  err.message,
                        filename: err.filename,
                        lineno:   err.lineno,
                        colno:    err.colno,
                        error:    err
                    });
                    cleanup.call(this);
                    self.dispatchEvent(errEvent);
                    reject(err);
                }
                
                priv.watchId = navigator.geolocation.watchPosition(onreading, onerror, {
                    enableHighAccuracy: options.accuracy == "high", 
                    maximumAge: 0, 
                    timeout: Infinity
                });
            });
        }
        privateData.set(this, priv);
        return priv.startPromise;
        
        
    };
    
    GeolocationSensor.prototype.stop = function() {
        var watchId = privateData.get(this).watchId;
        if (watchId) {
            navigator.geolocation.clearWatch(watchId);
        }
        privateData.get(this).startPromiseReject(new Error("abort"));
        cleanup.call(this);
    };
    
    return GeolocationSensor;
})();


