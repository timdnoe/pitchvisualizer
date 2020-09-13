	/**
 *  Visualize the frequency spectrum of live audio input
 */
//define ccapture
function CCapture(){
	{

	"use strict";

	var objectTypes = {
	'function': true,
	'object': true
	};

	function checkGlobal(value) {
	    return (value && value.Object === Object) ? value : null;
	  }

	/** Built-in method references without a dependency on `root`. */
	var freeParseFloat = parseFloat,
	  freeParseInt = parseInt;

	/** Detect free variable `exports`. */
	var freeExports = (objectTypes[typeof exports] && exports && !exports.nodeType)
	? exports
	: undefined;

	/** Detect free variable `module`. */
	var freeModule = (objectTypes[typeof module] && module && !module.nodeType)
	? module
	: undefined;

	/** Detect the popular CommonJS extension `module.exports`. */
	var moduleExports = (freeModule && freeModule.exports === freeExports)
	? freeExports
	: undefined;

	/** Detect free variable `global` from Node.js. */
	var freeGlobal = checkGlobal(freeExports && freeModule && typeof global == 'object' && global);

	/** Detect free variable `self`. */
	var freeSelf = checkGlobal(objectTypes[typeof self] && self);

	/** Detect free variable `window`. */
	var freeWindow = checkGlobal(objectTypes[typeof window] && window);

	/** Detect `this` as the global object. */
	var thisGlobal = checkGlobal(objectTypes[typeof this] && this);

	/**
	* Used as a reference to the global object.
	*
	* The `this` value is used if it's the global object to avoid Greasemonkey's
	* restricted `window` object, otherwise the `window` object is used.
	*/
	var root = freeGlobal ||
	((freeWindow !== (thisGlobal && thisGlobal.window)) && freeWindow) ||
	  freeSelf || thisGlobal || Function('return this')();

	if( !('gc' in window ) ) {
		window.gc = function(){}
	}

	if (!HTMLCanvasElement.prototype.toBlob) {
	 Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
	  value: function (callback, type, quality) {

	    var binStr = atob( this.toDataURL(type, quality).split(',')[1] ),
	        len = binStr.length,
	        arr = new Uint8Array(len);

	    for (var i=0; i<len; i++ ) {
	     arr[i] = binStr.charCodeAt(i);
	    }

	    callback( new Blob( [arr], {type: type || 'image/png'} ) );
	  }
	 });
	}

	// @license http://opensource.org/licenses/MIT
	// copyright Paul Irish 2015


	// Date.now() is supported everywhere except IE8. For IE8 we use the Date.now polyfill
	//   github.com/Financial-Times/polyfill-service/blob/master/polyfills/Date.now/polyfill.js
	// as Safari 6 doesn't have support for NavigationTiming, we use a Date.now() timestamp for relative values

	// if you want values similar to what you'd get with real perf.now, place this towards the head of the page
	// but in reality, you're just getting the delta between now() calls, so it's not terribly important where it's placed


	(function(){

	  if ("performance" in window == false) {
	      window.performance = {};
	  }

	  Date.now = (Date.now || function () {  // thanks IE8
		  return new Date().getTime();
	  });

	  if ("now" in window.performance == false){

	    var nowOffset = Date.now();

	    if (performance.timing && performance.timing.navigationStart){
	      nowOffset = performance.timing.navigationStart
	    }

	    window.performance.now = function now(){
	      return Date.now() - nowOffset;
	    }
	  }

	})();


	function pad( n ) {
		return String("0000000" + n).slice(-7);
	}
	// https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Timers

	var g_startTime = window.Date.now();

	function guid() {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
		}
		return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
	}

	function CCFrameEncoder( settings ) {

		var _handlers = {};

		this.settings = settings;

		this.on = function(event, handler) {

			_handlers[event] = handler;

		};

		this.emit = function(event) {

			var handler = _handlers[event];
			if (handler) {

				handler.apply(null, Array.prototype.slice.call(arguments, 1));

			}

		};

		this.filename = settings.name || guid();
		this.extension = '';
		this.mimeType = '';

	}

	CCFrameEncoder.prototype.start = function(){};
	CCFrameEncoder.prototype.stop = function(){};
	CCFrameEncoder.prototype.add = function(){};
	CCFrameEncoder.prototype.save = function(){};
	CCFrameEncoder.prototype.dispose = function(){};
	CCFrameEncoder.prototype.safeToProceed = function(){ return true; };
	CCFrameEncoder.prototype.step = function() { console.log( 'Step not set!' ) }

	function CCTarEncoder( settings ) {

	  CCFrameEncoder.call( this, settings );

	  this.extension = '.tar'
	  this.mimeType = 'application/x-tar'
	  this.fileExtension = '';
	  this.baseFilename = this.filename;

	  this.tape = null
	  this.count = 0;
	  this.part = 1;
	  this.frames = 0;

	}

	CCTarEncoder.prototype = Object.create( CCFrameEncoder.prototype );

	CCTarEncoder.prototype.start = function(){

	  this.dispose();

	};

	CCTarEncoder.prototype.add = function( blob ) {

	  var fileReader = new FileReader();
	  fileReader.onload = function() {
	    this.tape.append( pad( this.count ) + this.fileExtension, new Uint8Array( fileReader.result ) );

	    if( this.settings.autoSaveTime > 0 && ( this.frames / this.settings.framerate ) >= this.settings.autoSaveTime ) {
	      this.save( function( blob ) {
	        this.filename = this.baseFilename + '-part-' + pad( this.part );
	        download( blob, this.filename + this.extension, this.mimeType );
	        var count = this.count;
	        this.dispose();
	        this.count = count+1;
	        this.part++;
	        this.filename = this.baseFilename + '-part-' + pad( this.part );
	        this.frames = 0;
	        this.step();
	      }.bind( this ) )
	    } else {
	      this.count++;
	      this.frames++;
	      this.step();
	    }

	  }.bind( this );
	  fileReader.readAsArrayBuffer(blob);

	}

	CCTarEncoder.prototype.save = function( callback ) {

	  callback( this.tape.save() );

	}

	CCTarEncoder.prototype.dispose = function() {

	  this.tape = new Tar();
	  this.count = 0;

	}

	function CCPNGEncoder( settings ) {

		CCTarEncoder.call( this, settings );

		this.type = 'image/png';
		this.fileExtension = '.png';

	}

	CCPNGEncoder.prototype = Object.create( CCTarEncoder.prototype );

	CCPNGEncoder.prototype.add = function( canvas ) {

		canvas.toBlob( function( blob ) {
			CCTarEncoder.prototype.add.call( this, blob );
		}.bind( this ), this.type )

	}

	function CCJPEGEncoder( settings ) {

		CCTarEncoder.call( this, settings );

		this.type = 'image/jpeg';
		this.fileExtension = '.jpg';
		this.quality = ( settings.quality / 100 ) || .8;

	}

	CCJPEGEncoder.prototype = Object.create( CCTarEncoder.prototype );

	CCJPEGEncoder.prototype.add = function( canvas ) {

		canvas.toBlob( function( blob ) {
			CCTarEncoder.prototype.add.call( this, blob );
		}.bind( this ), this.type, this.quality )

	}

	/*

		WebM Encoder

	*/

	function CCWebMEncoder( settings ) {

		var canvas = document.createElement( 'canvas' );
		if( canvas.toDataURL( 'image/webp' ).substr(5,10) !== 'image/webp' ){
			console.log( "WebP not supported - try another export format" )
		}

		CCFrameEncoder.call( this, settings );

		this.quality = ( settings.quality / 100 ) || .8;

		this.extension = '.webm'
		this.mimeType = 'video/webm'
		this.baseFilename = this.filename;
	  this.framerate = settings.framerate;

		this.frames = 0;
		this.part = 1;

	  this.videoWriter = new WebMWriter({
	    quality: this.quality,
	    fileWriter: null,
	    fd: null,
	    frameRate: this.framerate
	  });

	}

	CCWebMEncoder.prototype = Object.create( CCFrameEncoder.prototype );

	CCWebMEncoder.prototype.start = function( canvas ) {

		this.dispose();

	}

	CCWebMEncoder.prototype.add = function( canvas ) {

	  this.videoWriter.addFrame(canvas);

		if( this.settings.autoSaveTime > 0 && ( this.frames / this.settings.framerate ) >= this.settings.autoSaveTime ) {
			this.save( function( blob ) {
				this.filename = this.baseFilename + '-part-' + pad( this.part );
				download( blob, this.filename + this.extension, this.mimeType );
				this.dispose();
				this.part++;
				this.filename = this.baseFilename + '-part-' + pad( this.part );
				this.step();
			}.bind( this ) )
		} else {
	    this.frames++;
			this.step();
		}

	}

	CCWebMEncoder.prototype.save = function( callback ) {

	  this.videoWriter.complete().then(callback);

	}

	CCWebMEncoder.prototype.dispose = function( canvas ) {

		this.frames = 0;
	  this.videoWriter = new WebMWriter({
	    quality: this.quality,
	    fileWriter: null,
	    fd: null,
	    frameRate: this.framerate
	  });

	}

	function CCFFMpegServerEncoder( settings ) {

		CCFrameEncoder.call( this, settings );

		settings.quality = ( settings.quality / 100 ) || .8;

		this.encoder = new FFMpegServer.Video( settings );
	    this.encoder.on( 'process', function() {
	        this.emit( 'process' )
	    }.bind( this ) );
	    this.encoder.on('finished', function( url, size ) {
	        var cb = this.callback;
	        if ( cb ) {
	            this.callback = undefined;
	            cb( url, size );
	        }
	    }.bind( this ) );
	    this.encoder.on( 'progress', function( progress ) {
	        if ( this.settings.onProgress ) {
	            this.settings.onProgress( progress )
	        }
	    }.bind( this ) );
	    this.encoder.on( 'error', function( data ) {
	        alert(JSON.stringify(data, null, 2));
	    }.bind( this ) );

	}

	CCFFMpegServerEncoder.prototype = Object.create( CCFrameEncoder.prototype );

	CCFFMpegServerEncoder.prototype.start = function() {

		this.encoder.start( this.settings );

	};

	CCFFMpegServerEncoder.prototype.add = function( canvas ) {

		this.encoder.add( canvas );

	}

	CCFFMpegServerEncoder.prototype.save = function( callback ) {

	    this.callback = callback;
	    this.encoder.end();

	}

	CCFFMpegServerEncoder.prototype.safeToProceed = function() {
	    return this.encoder.safeToProceed();
	};

	/*
		HTMLCanvasElement.captureStream()
	*/

	function CCStreamEncoder( settings ) {

		CCFrameEncoder.call( this, settings );

		this.framerate = this.settings.framerate;
		this.type = 'video/webm';
		this.extension = '.webm';
		this.stream = null;
		this.mediaRecorder = null;
		this.chunks = [];

	}

	CCStreamEncoder.prototype = Object.create( CCFrameEncoder.prototype );

	CCStreamEncoder.prototype.add = function( canvas ) {

		if( !this.stream ) {
			this.stream = canvas.captureStream( this.framerate );
			this.mediaRecorder = new MediaRecorder( this.stream );
			this.mediaRecorder.start();

			this.mediaRecorder.ondataavailable = function(e) {
				this.chunks.push(e.data);
			}.bind( this );

		}
		this.step();

	}

	CCStreamEncoder.prototype.save = function( callback ) {

		this.mediaRecorder.onstop = function( e ) {
			var blob = new Blob( this.chunks, { 'type' : 'video/webm' });
			this.chunks = [];
			callback( blob );

		}.bind( this );

		this.mediaRecorder.stop();

	}

	/*function CCGIFEncoder( settings ) {

		CCFrameEncoder.call( this );

		settings.quality = settings.quality || 6;
		this.settings = settings;

		this.encoder = new GIFEncoder();
		this.encoder.setRepeat( 1 );
	  	this.encoder.setDelay( settings.step );
	  	this.encoder.setQuality( 6 );
	  	this.encoder.setTransparent( null );
	  	this.encoder.setSize( 150, 150 );

	  	this.canvas = document.createElement( 'canvas' );
	  	this.ctx = this.canvas.getContext( '2d' );

	}

	CCGIFEncoder.prototype = Object.create( CCFrameEncoder );

	CCGIFEncoder.prototype.start = function() {

		this.encoder.start();

	}

	CCGIFEncoder.prototype.add = function( canvas ) {

		this.canvas.width = canvas.width;
		this.canvas.height = canvas.height;
		this.ctx.drawImage( canvas, 0, 0 );
		this.encoder.addFrame( this.ctx );

		this.encoder.setSize( canvas.width, canvas.height );
		var readBuffer = new Uint8Array(canvas.width * canvas.height * 4);
		var context = canvas.getContext( 'webgl' );
		context.readPixels(0, 0, canvas.width, canvas.height, context.RGBA, context.UNSIGNED_BYTE, readBuffer);
		this.encoder.addFrame( readBuffer, true );

	}

	CCGIFEncoder.prototype.stop = function() {

		this.encoder.finish();

	}

	CCGIFEncoder.prototype.save = function( callback ) {

		var binary_gif = this.encoder.stream().getData();

		var data_url = 'data:image/gif;base64,'+encode64(binary_gif);
		window.location = data_url;
		return;

		var blob = new Blob( [ binary_gif ], { type: "octet/stream" } );
		var url = window.URL.createObjectURL( blob );
		callback( url );

	}*/

	function CCGIFEncoder( settings ) {

		CCFrameEncoder.call( this, settings );

		settings.quality = 31 - ( ( settings.quality * 30 / 100 ) || 10 );
		settings.workers = settings.workers || 4;

		this.extension = '.gif'
		this.mimeType = 'image/gif'

	  	this.canvas = document.createElement( 'canvas' );
	  	this.ctx = this.canvas.getContext( '2d' );
	  	this.sizeSet = false;

	  	this.encoder = new GIF({
			workers: settings.workers,
			quality: settings.quality,
			workerScript: settings.workersPath + 'gif.worker.js'
		} );

	    this.encoder.on( 'progress', function( progress ) {
	        if ( this.settings.onProgress ) {
	            this.settings.onProgress( progress )
	        }
	    }.bind( this ) );

	    this.encoder.on('finished', function( blob ) {
	        var cb = this.callback;
	        if ( cb ) {
	            this.callback = undefined;
	            cb( blob );
	        }
	    }.bind( this ) );

	}

	CCGIFEncoder.prototype = Object.create( CCFrameEncoder.prototype );

	CCGIFEncoder.prototype.add = function( canvas ) {

		if( !this.sizeSet ) {
			this.encoder.setOption( 'width',canvas.width );
			this.encoder.setOption( 'height',canvas.height );
			this.sizeSet = true;
		}

		this.canvas.width = canvas.width;
		this.canvas.height = canvas.height;
		this.ctx.drawImage( canvas, 0, 0 );

		this.encoder.addFrame( this.ctx, { copy: true, delay: this.settings.step } );
		this.step();

		/*this.encoder.setSize( canvas.width, canvas.height );
		var readBuffer = new Uint8Array(canvas.width * canvas.height * 4);
		var context = canvas.getContext( 'webgl' );
		context.readPixels(0, 0, canvas.width, canvas.height, context.RGBA, context.UNSIGNED_BYTE, readBuffer);
		this.encoder.addFrame( readBuffer, true );*/

	}

	CCGIFEncoder.prototype.save = function( callback ) {

	    this.callback = callback;

		this.encoder.render();

	}

	function CCapture( settings ) {

		var _settings = settings || {},
			_date = new Date(),
			_verbose,
			_display,
			_time,
			_startTime,
			_performanceTime,
			_performanceStartTime,
			_step,
	        _encoder,
			_timeouts = [],
			_intervals = [],
			_frameCount = 0,
			_intermediateFrameCount = 0,
			_lastFrame = null,
			_requestAnimationFrameCallbacks = [],
			_capturing = false,
	        _handlers = {};

		_settings.framerate = _settings.framerate || 60;
		_settings.motionBlurFrames = 2 * ( _settings.motionBlurFrames || 1 );
		_verbose = _settings.verbose || false;
		_display = _settings.display || false;
		_settings.step = 1000.0 / _settings.framerate ;
		_settings.timeLimit = _settings.timeLimit || 0;
		_settings.frameLimit = _settings.frameLimit || 0;
		_settings.startTime = _settings.startTime || 0;

		var _timeDisplay = document.createElement( 'div' );
		_timeDisplay.style.position = 'absolute';
		_timeDisplay.style.left = _timeDisplay.style.top = 0
		_timeDisplay.style.backgroundColor = 'black';
		_timeDisplay.style.fontFamily = 'monospace'
		_timeDisplay.style.fontSize = '11px'
		_timeDisplay.style.padding = '5px'
		_timeDisplay.style.color = 'red';
		_timeDisplay.style.zIndex = 100000
		if( _settings.display ) document.body.appendChild( _timeDisplay );

		var canvasMotionBlur = document.createElement( 'canvas' );
		var ctxMotionBlur = canvasMotionBlur.getContext( '2d' );
		var bufferMotionBlur;
		var imageData;

		_log( 'Step is set to ' + _settings.step + 'ms' );

	    var _encoders = {
			gif: CCGIFEncoder,
			webm: CCWebMEncoder,
			ffmpegserver: CCFFMpegServerEncoder,
			png: CCPNGEncoder,
			jpg: CCJPEGEncoder,
			'webm-mediarecorder': CCStreamEncoder
	    };

	    var ctor = _encoders[ _settings.format ];
	    if ( !ctor ) {
			throw "Error: Incorrect or missing format: Valid formats are " + Object.keys(_encoders).join(", ");
	    }
	    _encoder = new ctor( _settings );
	    _encoder.step = _step

		_encoder.on('process', _process);
	    _encoder.on('progress', _progress);

	    if ("performance" in window == false) {
	    	window.performance = {};
	    }

		Date.now = (Date.now || function () {  // thanks IE8
			return new Date().getTime();
		});

		if ("now" in window.performance == false){

			var nowOffset = Date.now();

			if (performance.timing && performance.timing.navigationStart){
				nowOffset = performance.timing.navigationStart
			}

			window.performance.now = function now(){
				return Date.now() - nowOffset;
			}
		}

		var _oldSetTimeout = window.setTimeout,
			_oldSetInterval = window.setInterval,
		    	_oldClearInterval = window.clearInterval,
			_oldClearTimeout = window.clearTimeout,
			_oldRequestAnimationFrame = window.requestAnimationFrame,
			_oldNow = window.Date.now,
			_oldPerformanceNow = window.performance.now,
			_oldGetTime = window.Date.prototype.getTime;
		// Date.prototype._oldGetTime = Date.prototype.getTime;

		var media = [];

		function _init() {

			_log( 'Capturer start' );

			_startTime = window.Date.now();
			_time = _startTime + _settings.startTime;
			_performanceStartTime = window.performance.now();
			_performanceTime = _performanceStartTime + _settings.startTime;

			window.Date.prototype.getTime = function(){
				return _time;
			};
			window.Date.now = function() {
				return _time;
			};

			window.setTimeout = function( callback, time ) {
				var t = {
					callback: callback,
					time: time,
					triggerTime: _time + time
				};
				_timeouts.push( t );
				_log( 'Timeout set to ' + t.time );
	            return t;
			};
			window.clearTimeout = function( id ) {
				for( var j = 0; j < _timeouts.length; j++ ) {
					if( _timeouts[ j ] == id ) {
						_timeouts.splice( j, 1 );
						_log( 'Timeout cleared' );
						continue;
					}
				}
			};
			window.setInterval = function( callback, time ) {
				var t = {
					callback: callback,
					time: time,
					triggerTime: _time + time
				};
				_intervals.push( t );
				_log( 'Interval set to ' + t.time );
				return t;
			};
			window.clearInterval = function( id ) {
				_log( 'clear Interval' );
				return null;
			};
			window.requestAnimationFrame = function( callback ) {
				_requestAnimationFrameCallbacks.push( callback );
			};
			window.performance.now = function(){
				return _performanceTime;
			};

			function hookCurrentTime() { 
				if( !this._hooked ) {
					this._hooked = true;
					this._hookedTime = this.currentTime || 0;
					this.pause();
					media.push( this );
				}
				return this._hookedTime + _settings.startTime;
			};

			try {
				Object.defineProperty( HTMLVideoElement.prototype, 'currentTime', { get: hookCurrentTime } )
				Object.defineProperty( HTMLAudioElement.prototype, 'currentTime', { get: hookCurrentTime } )
			} catch (err) {
				_log(err);
			}

		}

		function _start() {
			_init();
			_encoder.start();
			_capturing = true;
		}

		function _stop() {
			_capturing = false;
			_encoder.stop();
			_destroy();
		}

		function _call( fn, p ) {
			_oldSetTimeout( fn, 0, p );
		}

		function _step() {
			//_oldRequestAnimationFrame( _process );
			_call( _process );
		}

		function _destroy() {
			_log( 'Capturer stop' );
			window.setTimeout = _oldSetTimeout;
			window.setInterval = _oldSetInterval;
			window.clearInterval = _oldClearInterval;
			window.clearTimeout = _oldClearTimeout;
			window.requestAnimationFrame = _oldRequestAnimationFrame;
			window.Date.prototype.getTime = _oldGetTime;
			window.Date.now = _oldNow;
			window.performance.now = _oldPerformanceNow;
		}

		function _updateTime() {
			var seconds = _frameCount / _settings.framerate;
			if( ( _settings.frameLimit && _frameCount >= _settings.frameLimit ) || ( _settings.timeLimit && seconds >= _settings.timeLimit ) ) {
				_stop();
				_save();
			}
			var d = new Date( null );
			d.setSeconds( seconds );
			if( _settings.motionBlurFrames > 2 ) {
				_timeDisplay.textContent = 'CCapture ' + _settings.format + ' | ' + _frameCount + ' frames (' + _intermediateFrameCount + ' inter) | ' +  d.toISOString().substr( 11, 8 );
			} else {
				_timeDisplay.textContent = 'CCapture ' + _settings.format + ' | ' + _frameCount + ' frames | ' +  d.toISOString().substr( 11, 8 );
			}
		}

		function _checkFrame( canvas ) {

			if( canvasMotionBlur.width !== canvas.width || canvasMotionBlur.height !== canvas.height ) {
				canvasMotionBlur.width = canvas.width;
				canvasMotionBlur.height = canvas.height;
				bufferMotionBlur = new Uint16Array( canvasMotionBlur.height * canvasMotionBlur.width * 4 );
				ctxMotionBlur.fillStyle = '#0'
				ctxMotionBlur.fillRect( 0, 0, canvasMotionBlur.width, canvasMotionBlur.height );
			}

		}

		function _blendFrame( canvas ) {

			//_log( 'Intermediate Frame: ' + _intermediateFrameCount );

			ctxMotionBlur.drawImage( canvas, 0, 0 );
			imageData = ctxMotionBlur.getImageData( 0, 0, canvasMotionBlur.width, canvasMotionBlur.height );
			for( var j = 0; j < bufferMotionBlur.length; j+= 4 ) {
				bufferMotionBlur[ j ] += imageData.data[ j ];
				bufferMotionBlur[ j + 1 ] += imageData.data[ j + 1 ];
				bufferMotionBlur[ j + 2 ] += imageData.data[ j + 2 ];
			}
			_intermediateFrameCount++;

		}

		function _saveFrame(){

			var data = imageData.data;
			for( var j = 0; j < bufferMotionBlur.length; j+= 4 ) {
				data[ j ] = bufferMotionBlur[ j ] * 2 / _settings.motionBlurFrames;
				data[ j + 1 ] = bufferMotionBlur[ j + 1 ] * 2 / _settings.motionBlurFrames;
				data[ j + 2 ] = bufferMotionBlur[ j + 2 ] * 2 / _settings.motionBlurFrames;
			}
			ctxMotionBlur.putImageData( imageData, 0, 0 );
			_encoder.add( canvasMotionBlur );
			_frameCount++;
			_intermediateFrameCount = 0;
			_log( 'Full MB Frame! ' + _frameCount + ' ' +  _time );
			for( var j = 0; j < bufferMotionBlur.length; j+= 4 ) {
				bufferMotionBlur[ j ] = 0;
				bufferMotionBlur[ j + 1 ] = 0;
				bufferMotionBlur[ j + 2 ] = 0;
			}
			gc();

		}

		function _capture( canvas ) {

			if( _capturing ) {

				if( _settings.motionBlurFrames > 2 ) {

					_checkFrame( canvas );
					_blendFrame( canvas );

					if( _intermediateFrameCount >= .5 * _settings.motionBlurFrames ) {
						_saveFrame();
					} else {
						_step();
					}

				} else {
					_encoder.add( canvas );
					_frameCount++;
					_log( 'Full Frame! ' + _frameCount );
				}

			}

		}

		function _process() {

			var step = 1000 / _settings.framerate;
			var dt = ( _frameCount + _intermediateFrameCount / _settings.motionBlurFrames ) * step;

			_time = _startTime + dt;
			_performanceTime = _performanceStartTime + dt;

			media.forEach( function( v ) {
				v._hookedTime = dt / 1000;
			} );

			_updateTime();
			_log( 'Frame: ' + _frameCount + ' ' + _intermediateFrameCount );

			for( var j = 0; j < _timeouts.length; j++ ) {
				if( _time >= _timeouts[ j ].triggerTime ) {
					_call( _timeouts[ j ].callback )
					//console.log( 'timeout!' );
					_timeouts.splice( j, 1 );
					continue;
				}
			}

			for( var j = 0; j < _intervals.length; j++ ) {
				if( _time >= _intervals[ j ].triggerTime ) {
					_call( _intervals[ j ].callback );
					_intervals[ j ].triggerTime += _intervals[ j ].time;
					//console.log( 'interval!' );
					continue;
				}
			}

			_requestAnimationFrameCallbacks.forEach( function( cb ) {
	     		_call( cb, _time - g_startTime );
	        } );
	        _requestAnimationFrameCallbacks = [];

		}

		function _save( callback ) {

			if( !callback ) {
				callback = function( blob ) {
					download( blob, _encoder.filename + _encoder.extension, _encoder.mimeType );
					return false;
				}
			}
			_encoder.save( callback );

		}

		function _log( message ) {
			if( _verbose ) console.log( message );
		}

	    function _on( event, handler ) {

	        _handlers[event] = handler;

	    }

	    function _emit( event ) {

	        var handler = _handlers[event];
	        if ( handler ) {

	            handler.apply( null, Array.prototype.slice.call( arguments, 1 ) );

	        }

	    }

	    function _progress( progress ) {

	        _emit( 'progress', progress );

	    }

		return {
			start: _start,
			capture: _capture,
			stop: _stop,
			save: _save,
	        on: _on
		}
	}

	(freeWindow || freeSelf || {}).CCapture = CCapture;

	  // Some AMD build optimizers like r.js check for condition patterns like the following:
	  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
	    // Define as an anonymous module so, through path mapping, it can be
	    // referenced as the "underscore" module.
	    define(function() {
	    	return CCapture;
	    });
	}
	  // Check for `exports` after `define` in case a build optimizer adds an `exports` object.
	  else if (freeExports && freeModule) {
	    // Export for Node.js.
	    if (moduleExports) {
	    	(freeModule.exports = CCapture).CCapture = CCapture;
	    }
	    // Export for CommonJS support.
	    freeExports.CCapture = CCapture;
	}
	else {
	    // Export to the global object.
	    root.CCapture = CCapture;
	}

	};
}
//Video Grab
var vidFramerate = 30;
var capturer = new CCapture( {  format: 'webm',  framerate: vidFramerate,  name: 'noise_visualization',  quality: 100} );


var mic, fft, fftBass;
var fftBands = 16384;
var fftBassBands = 4096;
var width1 = 1680;
var height1 = 1050;
var cutoffLevel = 130;
var midiValues = [];
var midiValuesStore = [];
var midiOn = 0;
var micOnStore = 0;

var spectrumStart = 4800;
var spectrumCutShort = 184 - spectrumStart;
var bassSpectrumEnd = 100;
var bassSpectrumBegin = 10;
var xShiftval = 0;
var xShiftvalBass = bassSpectrumBegin;

  var noteon,
      noteoff,
      outputs = [];
var rects = [];
var rectsBass = [];
var canvas;
var fftBass = false;

var timer = 1;







function keyPressed() {


  //  soundFormats('mp3', 'ogg');
  //     var PA = document.getElementById("PlanetaryAlignment");
  //     soundFile = loadSound(PA);
  // if (soundFile.isPlaying()){
  //   soundFile.pause();
  // } else {
  //   soundFile.loop();
  // }
}

//upload Music File
var file;
function readSingleFile(e) {
file = e.target.files[0];
  if (!file) {
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    var contents = e.target.result;
    // displayContents(contents);
  };
  reader.readAsText(file);
  // console.log(file);
}



// function displayContents(contents) {
//   var element = document.getElementById('file-content');
//   element.textContent = contents;
// }

document.getElementById('file-input')
  .addEventListener('change', readSingleFile, false);


function playSong(){

      var PA = document.getElementById("file-input");
   // var soundFile = loadSound(PA);

      if (soundFile2.isPlaying()){
             soundFile2.pause();
             // micOn = 1;
      } else {
         soundFile2.loop();
         micOn = 0;
      }
	  
   }

var canv = null;
var ctx = null;
var ad1 = null;
var ad2 = null;
var ad3 = null;
var ad4 = null;
var ad5 = null;
var ad6 = null;
var ad7 = null;
var ad8 = null;
var adImages =[];

function setup() {
   // var maxWid = document.getElementById("myRange");
   // console.log("Here");
   // console.log(maxWid.value);

   // Check if the Web MIDI API is supported by the browser

   //canvas
   
   canv=document.getElementById("myCanvas");
   ctx=canv.getContext("2d");

   ad1 = new Image();
   ad2 = new Image();
   ad3 = new Image();
   ad4 = new Image();
   ad5 = new Image();
   ad6 = new Image();
   ad7 = new Image();
   ad8 = new Image();
   ad9 = new Image();

   /*ad1.src = "nutridrop.png"
   ad2.src = "response.png"
   ad3.src = "ethoca.png"
   ad4.src = "kowboykit.png"
   ad5.src = "techcel.png"
   ad6.src = "blac.png"
   ad7.src = "SOLElogoi.png"
   ad8.src = "Cashnetwork.png"
   ad9.src = "SOLElogoi2.png"
   adImages = [ad1, ad2, ad3, ad4, ad5, ad6, ad7, ad8, ad9];*/
   // var ad1 = document.getElementById("response.png");


  //  createCanvas(1680, 1050);  
  // stroke(255);     // Set line drawing color to white
  // frameRate(30);


   //input



   var smoothing = 0.0;
   var smoothingBass = 0.0
  /* for (var i = 0; i < 128; i++){
      midiValues.push(0);
      midiValuesStore.push(0);
   }
   for (var i = 0; i < 1024; i++){
      rects.push(0);
   }*/
   // canvas = createCanvas(width1,height1);
   colorMode(HSB);

   // noStroke();
   // fill(0,255,255);
   mic = new p5.AudioIn();
   // console.log(mic.getSources());
   fft = new p5.FFT(smoothing);
   if (fftBass){
      fftBass = new p5.FFT(smoothingBass);
   }
   if (micOn){
      mic.setSource(1);
      mic.start();
      fft.setInput(mic);
      if (fftBass){
         fftBass.setInput(mic);
      }
   }
   else{
      cutoffLevel = 0;
   }
   
   
 //  capturer.start();
}

var note;
var noteStore;
var noteAvg = [];

var count = 0;
var smoothing = 0.2;
var smoothingStore = 0.2;

/*
// Create a capturer that exports a WebM video
var capturer = new CCapture( { 
  format: 'webm',
  framerate: 24,
} );


*/



function draw() {


  // background(0);

   ctx.clearRect(0, 0, canv.width, canv.height);
   if (backgroundWhite){
      ctx.fillStyle = "#FFFFFF";
   }
   else{
      ctx.fillStyle = "#000000";
   }
   
   
   ctx.fillRect(0, 0, canv.width, canv.height);
   
   // if (timer == 100){
    //80 is roughly 3 seconds while running
   
   // timer = 0;
   // }
   // timer++;

   smoothing = document.getElementById("myRange2").value / 101;
   smoothing = 0.0;
   if (smoothing != smoothingStore){
      // fft = p5.FFT(smoothing);
      fft.smooth(smoothing);
      smoothingStore = smoothing;
   }
   

 
   if (micOnStore != micOn){
      if (micOn){
      mic.setSource(1);
   mic.start();
   fft.setInput(mic);
   if (fftBass){
      fftBass.setInput(mic);
   }
   
   }
   else{
      fft = new p5.FFT(smoothing);
      if (fftBass){
         fftBass = new p5.FFT(smoothingBass);
      }
      cutoffLevel = 0;
   }
   micOnStore = micOn;
   }
   // var stage = new createjs.Stage("demoCanvas");
   colorMode(HSB);
   if (backgroundWhite){
      // background(255);
   }
   else{
      // background(0);
   }
   var spectrum = fft.analyze1(fftBands);
   if (fftBass){
      var spectrumBass = fftBass.analyze1(fftBassBands);
   }
   // console.log(spectrum.length);
   // var energy = fft.getEnergy(16);

   // beginShape();
   
   // ctx.drawImage(ad1,(canv.width - ad1.width) / 2, (canv.height - ad1.height) / 2);

   // vertex(0, height);
   // console.log(spectrum.length);
   
   // for (var i = spectrumStart; i < spectrum.length - spectrumCutShort; i++) {
   for (var i = 0; i < spectrum.length ; i++) {
    // var angle = map(i, 0, spectrum.length, 0, 360);
    // var energy = fft.getEnergy()
    var freq = 10 * Math.pow(1.009,i);
    var freqBass = 10 * Math.pow(1.009,i);
    note = 69 + 12 * log(freq / 440) / log(2);
    
    var amp;
    var ampBass;
    if (spectrum[i] > cutoffLevel){
         amp = spectrum[i];
      }
      else{
         amp = 0;
      }
      if (fftBass){
         if (spectrumBass[i] > cutoffLevel){
            ampBass = spectrumBass[i];
         }
         else{
            ampBass = 0;
         }
      }

    var y = map(amp, 0, 256, height, 0);
    if (fftBass){
      var yBass = map(ampBass, 0, 256, height, 0);
    }
    var rectWidth = int(10 - (note / 12)) / 2;

    // noStroke();
    var fillHue = int(((note + 69 - 2) % 12) * 350 / 12)
    // if (fillHue > 512){
    //   fillHue = 512;
    // }
    // fill(fillHue, amp, y);


    //sparks
    // arc(2 * i - xShiftval, y / 2, amp / 255 * 5, amp / 255 * 5, 0, 6.28);
    // arc(2 * i - xShiftval, height - y / 2, amp / 255 * 5, amp / 255 * 5, 0, 6.28);

    rects[i] = amp;
    rectsBass[i] = ampBass;
    var noteFloat = note;
    note = round(note);
    if (midiOn){
      if (note == noteStore){
         noteAvg.push(amp);
      }
      else{

         var noteSum = 0;
         for (var j = 0; j < noteAvg.length; j++){
            noteSum = noteSum + noteAvg[j];
         }
         amp = noteSum / noteAvg.length;
         midiValues[note] = round(amp / 2);
         noteStore = note;
         for (var k = 0; k < noteAvg.length; k++){
            noteAvg.pop();
         }
         for (var k = 0; k < 11; k++){
            for (var l = 0; l < 12; l++){
                  var m = [];
                  for (var n = 0; n < 12; n++){
                     m[n] = midiValues[k * 12 + n];
                  }
                  // outputs[0].send([0x90, 61, 127]);
            }
         }
      }
   }
    
  }

//note length fixing
var barWidth = 6;
var its = spectrum.length / barWidth;
   // for (var i = 0; i < its; i++){
   //    var max = 0;
   //    for (var j = 0; j < barWidth; j++){
   //       if (spectrum[barWidth * i + j] > max){
   //          max = spectrum[barWidth * i + j];
   //       }
   //    }
   //    for (var j = 0; j < barWidth; j++){
   //       spectrum[barWidth * i + j] = max;
   //    }

   // }



  var line = 0;
  var groups = 0;
  var groupLoc = [];
  var groupEnd = [];
  var widthCount = [];

  var groupsBass = 0;
  var groupLocBass = [];
  var groupEndBass = [];
  var widthCountBass = [];

  var ampCutoff = document.getElementById("myRange3").value;

  //groups above threshold
  var peakType = 1;
  if (peakType == 1){

   //trebles
     while (line < 1024){
      if (rects[line] > ampCutoff){
         groupLoc[groups] = line;
         while(rects[line]){
            line++;
         }
         groups++;
      }
      else{
         line++;
      }
     }

       line = 0;
     for (var i = 0; i < groups; i++){
      while (!rects[line]){
         line++;
      }
      widthCount.push(0);
      while (rects[line]){
         line++;
         widthCount[i]++;
      }
     }
     line = 0;

     //bass
     if (fftBass){
        while (line < 1024){
         if (rectsBass[line] > ampCutoff){
            groupLocBass[groupsBass] = line;
            while(rectsBass[line]){
               line++;
            }
            groupsBass++;
         }
         else{
            line++;
         }
        }

          line = 0;
        for (var i = 0; i < groupsBass; i++){
         while (!rectsBass[line]){
            line++;
         }
         widthCountBass.push(0);
         while (rectsBass[line]){
            line++;
            widthCountBass[i]++;
         }
        }
      }
   }

  //groups by peak
  else if (peakType == 2){
  var rectStore = 0;
  var inclining = true;
  var declining = false;
   while (line < 1024){
      // console.log("z");
      
      if (rects[line] > rectStore){
         if (inclining){
            line++;
            // console.log("a");
         }
         else if (declining){ //trough
            groupLoc[groups] = line;
            groupEnd[groups] = line - 1;
            groups++;
            line++;
            inclining = true;
            declining = false;
            // console.log("b");
         }
         else{
            groupLoc[groups] = line;
            groupEnd[groups] = line - 1;
            groups++;
            line++;
            inclining = true;
            // console.log("c");
         }
      }
      else if(rects[line] < rectStore){
         if (inclining){ //peak
            line++;
            declining = true;
            inclining = false;
            // console.log("d");
         }
         else if (declining){
            line++;
            // console.log("e");
         }
         else{
            line++;
            declining = true;
            // console.log("f");
         }
      }
      else{
         if (inclining){//peak
            line++;
            inclining = false;
            // console.log("g");
         }
         else if (declining){
            groupEnd[groups] = line - 1;
            line++;
            declining = false;
            // console.log("h");
         }
         else{
            line++;
            // console.log("i");
         }
      }
      rectStore = rects[line - 1];
     }

     for (var i = 0; i < groups; i++){
      widthCount[i] = groupEnd[i + 1] - groupLoc[i];
      // console.log(widthCount[i]);
     }
  }


// console.log(groups);

  var minValue = 0;
  var rgbAvg = [0, 0, 0];
  var avgAmp = [];
  for (var i = 0; i < groups; i++){
   avgAmp.push(0);
   for (var j = 0; j < widthCount[i]; j++){
      avgAmp[i] = avgAmp[i] + rects[groupLoc[i] + j];
   }
   avgAmp[i] = avgAmp[i] / widthCount[i];
  }
  var avgTotal = null;
  // for (var i = spectrumStart; i < spectrum.length - spectrumCutShort; i++){
   for (var i = bassSpectrumEnd; i < spectrum.length; i++){
   avgTotal = avgTotal + spectrum[i];
  }
  // avgTotal = avgTotal / (spectrum.length - spectrumStart);
  avgTotal = avgTotal / (spectrum.length);
  // console.log(avgTotal);
  // console.log(avgAmp);
  for (var i = 0; i < groups; i++){
   rgbAvg[0] = 0;
   rgbAvg[1] = 0;
   rgbAvg[2] = 0;
   // avgV.push(0);
   // minValue = rects[groupLoc[i]];
   for (var j = 0; j < widthCount[i]; j++){
      if (groupLoc[i] + j > bassSpectrumEnd / 1.6 && groupLoc[i] + j < spectrum.length){
    var freq = 10 * Math.pow(1.009,groupLoc[i] + j);
    note = 69 + 12 * log(freq / 440) / log(2);
    
    var amp;
    if (spectrum[groupLoc[i] + j] > cutoffLevel){
         amp = spectrum[groupLoc[i] + j];
      }
      else{
         amp = 0;
    }
      var scalingFactor = 20;
      var y = map(Math.pow(2.7,log(amp)), 0, 256, height1, 0);
      // var rectWidth = int(10 - (note / 12)) / 2;
      var h = int(((note + 69 - 2) % 12) * 256 / 12);
      var wid = widthCount[i];
      // var maxWid = 10;
      // var maxWid = 100;
      var maxRg = document.getElementById("myRange");
      var divisor = maxRg.value;
      var maxWid = 100;
      // console.log(maxWid);
      // maxWid.oninput = function() {
      //    output.innerHTML = this.value;
      // }
      if (wid > maxWid){
         wid = maxWid;
      }
      var s = null;
      // if (avgTotal < 10){
      //    avgTotal = 50;
      // }
      if (wid > 0){
         s = 0;
         s = amp - divisor / 100 * (avgAmp[i] * wid / maxWid - 10 / 100 * avgTotal) * (width1 - (groupLoc[i] + j))/width1;
      }
      else{
         s = amp;
      }
      if (s < 0){
         s = 0;
      }
      // console.log(avgTotal);
      // console.log(amp);
      // avgV[i] = avgV + amp / widthCount[i];
      var v = s;
      // if (backgroundWhite){
      //    stroke(h, s, 255);
      //    fill(h, s, 255);
      // }
      // else{
      //    stroke(h, s, v);
      //    fill(h, s, v);
      // }

      var rgb = hsvToRgb(h / 255, s / 255, v / 255);
      var rgbRaw = hsvToRgb(h / 255, amp / 255, v / 255);
      var numHexArray = [];
      var numHexArrayRaw = [];
      var numHex = "#";
      var numHexRaw = "#";
      for (var n = 0; n < 3; n++){
         numHexArray[n] = int(rgb[n]).toString(16);
         numHexArrayRaw[n] = int(rgbRaw[n]).toString(16);
         // console.log(int(rgb[n]));
         // console.log(numHexArray[n]);
         if (numHexArray[n].length < 2){
            numHexArray[n] = "0" + numHexArray[n];
            numHexArrayRaw[n] = "0" + numHexArrayRaw[n];
         }
         numHex = numHex + numHexArray[n];
         numHexRaw = numHexRaw + numHexArrayRaw[n];

      }
      // console.log("hex");
      // console.log(numHex);
      // var alphaLv = 
      
      
      // ctx.fillRect(20,20,150,100);
      // rect(2*(groupLocBass[i] + j) - 0 * bassSpectrumBegin, y  / 2, 2, height - y);
      var rotateOn = true;
      var rots = 3;
      var mult = 2;
      var colAlpha = "rgba( " + rgbRaw[0] + ", " + rgbRaw[1] + ", " + rgbRaw[2] + ", " + s / 255 + ")"; 
      var colAlphaRots = "rgba( " + rgbRaw[0] + ", " + rgbRaw[1] + ", " + rgbRaw[2] + ", " + s / (rots*2*255) * Math.pow(0.5,(avgTotal / 256)) + ")"; 
      var my_gradient = null;
      if (diffractOn){
         my_gradient = ctx.createLinearGradient( 0, ((height1 - y) * mult / -2) / 2 , 0, ((height1 - y) / 2) * mult / 2);
         my_gradient.addColorStop(0,"rgba(0, 0, 0, 0)");
         my_gradient.addColorStop(0.25,colAlphaRots);
         my_gradient.addColorStop(0.75,colAlphaRots);
         my_gradient.addColorStop(1,"rgba(0, 0, 0, 0)");
         ctx.fillStyle = my_gradient;
         for (var r = 1; r < rots; r++){
          ctx.save();
          ctx.translate(2*(groupLoc[i] + j), height1 / 2);
          ctx.rotate(r * Math.PI / rots);
          ctx.fillRect(0, (height1 - y) / -2, mult*2, (height1 - y) * mult);
          ctx.restore();
         }
      }

      my_gradient = ctx.createLinearGradient( 0, y / 2, 0, height1 - y / 2);
      my_gradient.addColorStop(0,"rgba(0, 0, 0, 0)");
      my_gradient.addColorStop(0.25,colAlpha);
      my_gradient.addColorStop(0.75,colAlpha);
      my_gradient.addColorStop(1,"rgba(0, 0, 0, 0)");
      ctx.fillStyle = my_gradient;
    
	//draw 
      ctx.fillRect(2*(groupLoc[i] + j) - 0 * bassSpectrumBegin, y  / 2, 2, height1 - y);
      // console.log(rgb[0]);
      var red = int(rgb[0]);
      var grn = int(rgb[1]);
      var blu = int(rgb[2]);
      var alp = amp / 512;
      ctx.fillStyle = "rgba( " + red + ", " + grn + ", " + blu + ", " + alp + ")"; 
      // stroke(153);
      // // line(p3, p3, p2, p3);

      // var Y_AXIS = 1;
      // var X_AXIS = 2;

      // function setGradient(x, y, w, h, c1, c2, axis) {

      //   noFill();

      //   if (axis == Y_AXIS) {  // Top to bottom gradient
      //     for (var i = y; i <= y+h; i++) {
      //       var inter = map(i, y, y+h, 0, 1);
      //       var c = lerpColor(c1, c2, inter);
      //       stroke(c);
      //       line(x, i, x+w, i);
      //     }
      //   }  
      //   else if (axis == X_AXIS) {  // Left to right gradient
      //     for (var i = x; i <= x+w; i++) {
      //       var inter = map(i, x, x+w, 0, 1);
      //       var c = lerpColor(c1, c2, inter);
      //       stroke(c);
      //       line(i, y, i, y+h);
      //     }
      //   }
      // }

      // var c1 = color(0, 0, 0);
      // var c2 = color(red, grn, blu);
      // setGradient(2*(groupLoc[i] + j), 90, 540, 80, c1, c2, Y_AXIS);
      // var lineWid = 2;
      // line(2*(groupLoc[i] + j), y  / 2, 2*(groupLoc[i] + j), y  / 2 + height1 - y);
      // ctx.fillRect(2*(groupLoc[i] + j) - 0 * bassSpectrumBegin - (lineWid / 2), 0, lineWid, height1);
      // ctx.arc(width1 / 2, height1 / 2, 2*(groupLoc[i] + j) - 0 * bassSpectrumBegin, 0, Math.PI);

      // ctx.arc(2*(groupLoc[i] + j) - 0 * bassSpectrumBegin, y  / 2, 2, 0, Math.PI);
      // ctx.strokeStyle = numHex;
      // ctx.stroke();
      // var radgrad = ctx.createLinearGradient(0,0,0,y);
      // radgrad.addColorStop(0, 'hsv(h,s,v)');
      // radgrad.addColorStop(1, 'hsv(0,0,0');
      // rect(2*2*(groupLoc[i] + j) - xShiftval, y  / 2, 4, height - y);
      // rect(2*(groupLoc[i] + j) - 0 * bassSpectrumBegin, y  / 2, 2, height - y);
      // var rgb = hsvToRgb(h, s, v);
      // console.log(rgbAvg);
      rgbAvg[0] = rgbAvg[0] + rgb[0] / widthCount[i];
      rgbAvg[1] = rgbAvg[1] + rgb[1] / widthCount[i];
      rgbAvg[2] = rgbAvg[2] + rgb[2] / widthCount[i];
	  //capturer.start();
   }
}


   // var hsv = rgbToHsv(rgbAvg[0], rgbAvg[1], rgbAvg[2]);

   // stroke(hsv[0], hsv[1], hsv[2]);
   // var y = map(v, 0, 256, height, 0);
   // rect(2*groupLoc[i], y  / 2, widthCount[i], height - y);
  }


   if (fftBass){
     //bass
     var minValueBass = 0;
     var rgbAvgBass = [0, 0, 0];
     var avgAmpBass = [];
     for (var i = 0; i < groupsBass; i++){
      avgAmpBass.push(0);
      for (var j = 0; j < widthCountBass[i]; j++){
         avgAmpBass[i] = avgAmpBass[i] + rectsBass[groupLocBass[i] + j];
      }
      avgAmpBass[i] = avgAmpBass[i] / widthCountBass[i];
     }
     var avgTotalBass = null;
     // for (var i = spectrumStart; i < spectrum.length - spectrumCutShort; i++){
      for (var i = 0; i < bassSpectrumEnd; i++){
      avgTotalBass = avgTotalBass + spectrumBass[i];
     }
     // avgTotal = avgTotal / (spectrum.length - spectrumStart);
     avgTotalBass = avgTotalBass / (spectrumBass.length);
     // console.log(avgTotal);
     // console.log(avgAmp);
     for (var i = 0; i < groupsBass; i++){
      rgbAvgBass[0] = 0;
      rgbAvgBass[1] = 0;
      rgbAvgBass[2] = 0;
      // avgV.push(0);
      // minValue = rects[groupLoc[i]];
      for (var j = 0; j < widthCountBass[i]; j+=1){
         if(groupLocBass[i] + j > bassSpectrumBegin && groupLocBass[i] + j < 10240){
       var freq = 10 * Math.pow(1.009,groupLocBass[i] + j);
       note = 69 + 12 * log(freq / 440) / log(2);
       
       var ampBass;
       if (spectrumBass[groupLocBass[i] + j] > cutoffLevel){
            ampBass = spectrumBass[groupLocBass[i] + j];
         }
         else{
            ampBass = 0;
       }
         var y = map(Math.pow(2.5,log(ampBass)), 0, 256, height, 0);
         // var rectWidth = int(10 - (note / 12)) / 2;
         var h = int(((note + 69 - 2) % 12) * 400 / 12);
         var wid = widthCountBass[i];
         // var maxWid = 10;
         // var maxWid = 100;
         var maxRg = document.getElementById("myRange");
         var divisor = maxRg.value;
         var maxWid = 100;
         // console.log(maxWid);
         // maxWid.oninput = function() {
         //    output.innerHTML = this.value;
         // }
         if (wid > maxWid){
            wid = maxWid;
         }
         var s = null;
         // if (avgTotal < 10){
         //    avgTotal = 50;
         // }
         if (wid > 0){
            s = ampBass - divisor / 100 * (avgAmpBass[i] * wid / maxWid - 10 / 100 * avgTotalBass);
         }
         else{
            s = ampBass;
         }
         if (s < 0){
            s = 0;
         }
         // avgV[i] = avgV + amp / widthCount[i];
         var v = s;
         if (backgroundWhite){
            stroke(h, s, 255);
            fill(h, s, 255);
         }
         else{
            stroke(h, s, v);
            fill(h, s, v);
         }

         var rgb = hsvToRgb(h / 255, s / 255, v / 255);
         var numHexArray = [];
         var numHex = "#";
         for (var n = 0; n < 3; n++){
            numHexArray[n] = int(rgb[n]).toString(16);
            // console.log(int(rgb[n]));
            // console.log(numHexArray[n]);
            if (numHexArray[n].length < 2){
               numHexArray[n] = "0" + numHexArray[n];
            }
            numHex = numHex + numHexArray[n];

         }
         // console.log("hex");
         // console.log(numHex);
         


         var my_gradient = ctx.createLinearGradient( 0, y / 2 , 0, height - y / 2);
         my_gradient.addColorStop(0,"black");
         my_gradient.addColorStop(0.25,numHex);
         my_gradient.addColorStop(0.75,numHex);
         my_gradient.addColorStop(1,"black");
         ctx.fillStyle = my_gradient;
         // ctx.fillRect(20,20,150,100);


         // rect(2*(groupLocBass[i] + j) - 0 * bassSpectrumBegin, y  / 2, 2, height - y);
         
         ctx.fillRect(2*(groupLocBass[i] + j) - 0 * bassSpectrumBegin, y  / 2, 2, height - y);
         // ctx.rotate(20*Math.PI/180);
         
         rgbAvg[0] = rgbAvg[0] + rgb[0] / widthCount[i];
         rgbAvg[1] = rgbAvg[1] + rgb[1] / widthCount[i];
         rgbAvg[2] = rgbAvg[2] + rgb[2] / widthCount[i];
      }
      }
     }
  }
   // endShape();


//Show Piano
   if (pianoOn){
      fill('rgba(255,255,255, 0.25)');
      stroke('rgba(0,0,0, 0.25)');
      ctx.fillStyle ='rgba(255,255,255, 0.25)';
      var spacingx = 13;
      var yheight = 20;
      var xwidth = spacingx;
      var afterBlack = 0;
      var bkSandwich = 0;
      var keyShift = 24;
      var xShift = -192;
      for (var i = 0 + keyShift; i < 88 + keyShift; i++){
         if (i % 12 == 1 || i % 12 == 3 || i % 12 == 6 || i % 12 == 8 || i % 12 == 10){
            yheight = 60;
            xWidth = spacingx;
            afterBlack = 0;
         }
         else{
            
            if (i % 12 == 2 || i % 12 == 4 || i % 12 == 7 || i % 12 == 9 || i % 12 == 11){
               afterBlack = 1;
               if (i % 12 == 2 || i % 12 == 7 || i % 12 == 9){
                  bkSandwich = 1;
               }
               else{
                  bkSandwich = 0;
               }
            }
            else{
               afterBlack = 0;
            }
            yheight = 90;
            xwidth = spacingx * (1.5 + 0.5 * bkSandwich);
            ctx.fillRect(spacingx*(i - afterBlack * 0.5) + xShift - xShiftval, height1 / 2, xwidth, yheight);
         }
         
      }
      fill('rgba(0,0,0, 0.5)');
      ctx.fillStyle ='rgba(0,0,0, 0.25)';
      for (var i = 0 + keyShift; i < 89 + keyShift; i++){
         if (i % 12 == 1 || i % 12 == 4 || i % 12 == 6 || i % 12 == 9 || i % 12 == 11){
            yheight = 60;
            xWidth = spacingx - .5;
            afterBlack = 0;
            ctx.fillRect(spacingx*(i - afterBlack * 0.5) + xShift - xShiftval, height1 / 2, xWidth, yheight);
         }
         
      }
   }
else{
   if (backgroundWhite){
      // fill(0,0,255);
   }
   else{
      // fill(0,0,0);
   }
   //80 is 3 seconds
   var timeNext = 20 * 80;
   //ADVERTISERS
   // var imageNumber = int(timer / timeNext);

   // ctx.drawImage(adImages[imageNumber],(canv.width - adImages[imageNumber].width) / 2, (canv.height - adImages[imageNumber].height) / 2);
   // timer++;
   // if (timer == timeNext * 8){
   //  timer = 0;
   // }
   //SOLE IN BOTTOM RIGHT CORNER
   var imageNumber = 8
   var mult = 0.7
   //ctx.drawImage(adImages[imageNumber],canv.width * mult, canv.height * (mult - 0.05));
   // console.log(imageNumber);
   
   // rect(0,0,width1,height);
}
}

// var blurFilter = new createjs.BlurFilter(5, 5, 1);

  



function rgbToHsv(r, g, b) {
  r /= 255, g /= 255, b /= 255;

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, v = max;

  var d = max - min;
  s = max == 0 ? 0 : d / max;

  if (max == min) {
    h = 0; // achromatic
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return [ h, s, v ];
}

function hsvToRgb(h, s, v) {
  var r, g, b;

  var i = Math.floor(h * 6);
  var f = h * 6 - i;
  var p = v * (1 - s);
  var q = v * (1 - f * s);
  var t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }

  return [ r * 255, g * 255, b * 255 ];
}
