/*
  Visualize the frequency spectrum of live audio input. Hooray!
 */
//main values
var mic, fft;
var fftBands = 8192; //must be power of 2
var width1 = 1680; //default value
var height1 = 1050;  //default value
var heightAdjust = 0.85
var widthAdjust = 0.97
var cutoffLevel = 0;
var micOnStore = 0;
var xShiftval = -100;
var rects = [];
var canvas;
var xAdjustedFinal = -206;
var fftPowerAdjustment = 1.009;
var note;
var noteStore;
var noteAvg = [];
var count = 0;
var smoothing = 0.2;
var smoothingStore = 0.2;
var startedUp = false;

//bass values, for improved bass visualization (TO COME)
var fftBass = false;
var fftBass;
var fftBassBands = 4096;
var bassSpectrumEnd = 100;
var bassSpectrumBegin = 10;
var xShiftvalBass = bassSpectrumBegin;
var rectsBass = [];

function setup() {
   
	canv=document.getElementById("myCanvas");
	ctx=canv.getContext("2d");

	ctx.canvas.width  = window.innerWidth;
	ctx.canvas.height = window.innerHeight;

	var smoothing = 0.0;
	var smoothingBass = 0.0
	colorMode(HSB);
	mic = new p5.AudioIn();
	fft = new p5.FFT(smoothing);

	if (fftBass){
		fftBass = new p5.FFT(smoothingBass);
	}  
}

function draw() {
	var drawHeight = window.innerHeight * heightAdjust;
	var drawWidth = window.innerWidth * widthAdjust
	height1 = drawHeight;
	width1 = drawWidth;
	ctx.canvas.width  = drawWidth;
	ctx.canvas.height = drawHeight;
	ctx.clearRect(0, 0, canv.width, canv.height);

	if (backgroundWhite){
		ctx.fillStyle = "#FFFFFF";
	}
	else{
		ctx.fillStyle = "#000000";
	}

	ctx.fillRect(0, 0, canv.width, canv.height);
	smoothing = 0.0;
	if (smoothing != smoothingStore){
		fft.smooth(smoothing);
		smoothingStore = smoothing;
	}

	if (micOnStore != micOn){
		console.log("micOn change")
		if (micOn){

			//for some reason, mic won't load until a song is played.
			//to circumvent, load song, play & pause it upon clicking Mic for first time.
			if (!startedUp){
				soundFile2 = loadSound('https://irp.cdn-website.com/9a9f0c1e/audio/SmallFile.mp3');
				setTimeout(function() {
					soundFile2.play();
					soundFile2.pause();
					startedUp = true
					mic.setSource(1);
					mic.start();
					fft.setInput(mic);
					}, 250);

			}

			else{
				mic.setSource(1);
				mic.start();
				fft.setInput(mic);
			}

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

	colorMode(HSB);
	var spectrum = fft.analyze(fftBands);

	//Convert linear scale to exponential
	//var logIndex = [];
	var logFreqDomain = [];
	for(var i=0; i<spectrum.length; i++) {
		//logIndex.push(Math.round(Math.pow(fftPowerAdjustment, i + 40)));
		//logFreqDomain.push(logIndex[i]>=spectrum.length ? 0 : spectrum[logIndex[i]]);
		var item = Math.round(Math.pow(fftPowerAdjustment, i + 40))
		logFreqDomain.push(item>=spectrum.length ? 0 : spectrum[item]);
	}
	/*var logFreqDomain = [];
	for(var i=0; i<logIndex.length; i++) {
	logFreqDomain.push(logIndex[i]>=spectrum.length ? 0 : spectrum[logIndex[i]]);
	}*/
	spectrum = new Uint8Array(logFreqDomain);

	/*
	if (fftBass){
		var spectrumBass = fftBass.analyze(fftBassBands);
	}
	*/

	for (var i = 0; i < spectrum.length ; i++) {
		var freq = 10 * Math.pow(fftPowerAdjustment,i);
		//var freqBass = 10 * Math.pow(fftPowerAdjustment,i);
		note = 69 + 12 * log(freq / 440) / log(2);
		var amp;
		//var ampBass;
		if (spectrum[i] > cutoffLevel){
			amp = spectrum[i];
		}
		else{
			amp = 0;
		}
		/*
		if (fftBass){
		if (spectrumBass[i] > cutoffLevel){
		ampBass = spectrumBass[i];
		}
		else{
		ampBass = 0;
		}
		}
		*/

		var y = map(amp, 0, 256, height, 0) * drawHeight / 1080;
		/*
		if (fftBass){
		var yBass = map(ampBass, 0, 256, height, 0);
		}
		*/
		var rectWidth = int(10 - (note / 12)) / 2 * drawWidth / 1600;
		var fillHue = int(((note + 69 - 2) % 12) * 350 / 12)
		rects[i] = amp;
		rectsBass[i] = ampBass;
		var noteFloat = note;
		note = round(note);
	}

	//note length fixing
	var barWidth = 6;
	var its = spectrum.length / barWidth;
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
	/*
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
		}*/
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
		}
	}

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
	for (var i = bassSpectrumEnd; i < spectrum.length; i++){
		avgTotal = avgTotal + spectrum[i];
	}
	avgTotal = avgTotal / (spectrum.length);
	for (var i = 0; i < groups; i++){
		rgbAvg[0] = 0;
		rgbAvg[1] = 0;
		rgbAvg[2] = 0;

		for (var j = 0; j < widthCount[i]; j++){
			if (groupLoc[i] + j > bassSpectrumEnd / 1.6 && groupLoc[i] + j < spectrum.length){
				var freq = 10 * Math.pow(fftPowerAdjustment,groupLoc[i] + j);
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
				var h = int(((note + 69 - 2) % 12) * 256 / 12);
				var wid = widthCount[i];
				var maxRg = document.getElementById("myRange");
				var divisor = maxRg.value;
				var maxWid = 100;
				if (wid > maxWid){
					wid = maxWid;
				}
				var s = null;
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
				var v = s;
				var rgb = hsvToRgb(h / 255, s / 255, v / 255);
				var rgbRaw = hsvToRgb(h / 255, amp / 255, v / 255);
				var numHexArray = [];
				var numHexArrayRaw = [];
				var numHex = "#";
				var numHexRaw = "#";
				for (var n = 0; n < 3; n++){
					numHexArray[n] = int(rgb[n]).toString(16);
					numHexArrayRaw[n] = int(rgbRaw[n]).toString(16);
					if (numHexArray[n].length < 2){
						numHexArray[n] = "0" + numHexArray[n];
						numHexArrayRaw[n] = "0" + numHexArrayRaw[n];
					}
					numHex = numHex + numHexArray[n];
					numHexRaw = numHexRaw + numHexArrayRaw[n];
				}
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
				ctx.fillRect((2*(groupLoc[i] + j) + xAdjustedFinal) * drawWidth / 1600, y  / 2, 2, height1 - y);
				var red = int(rgb[0]);
				var grn = int(rgb[1]);
				var blu = int(rgb[2]);
				var alp = amp / 512;
				ctx.fillStyle = `rgba( ${red}, ${grn}, ${blu}, ${alp})`
				rgbAvg[0] = rgbAvg[0] + rgb[0] / widthCount[i];
				rgbAvg[1] = rgbAvg[1] + rgb[1] / widthCount[i];
				rgbAvg[2] = rgbAvg[2] + rgb[2] / widthCount[i];
			}
		}
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
		for (var i = 0; i < bassSpectrumEnd; i++){
			avgTotalBass = avgTotalBass + spectrumBass[i];
		}
		avgTotalBass = avgTotalBass / (spectrumBass.length);
		for (var i = 0; i < groupsBass; i++){
			rgbAvgBass[0] = 0;
			rgbAvgBass[1] = 0;
			rgbAvgBass[2] = 0;
			for (var j = 0; j < widthCountBass[i]; j+=1){
				if(groupLocBass[i] + j > bassSpectrumBegin && groupLocBass[i] + j < 10240){
					var freq = 10 * Math.pow(fftPowerAdjustment,groupLocBass[i] + j);
					note = 69 + 12 * log(freq / 440) / log(2);

					var ampBass;
					if (spectrumBass[groupLocBass[i] + j] > cutoffLevel){
						ampBass = spectrumBass[groupLocBass[i] + j];
					}
					else{
						ampBass = 0;
					}
					var y = map(Math.pow(2.5,log(ampBass)), 0, 256, height, 0);
					var h = int(((note + 69 - 2) % 12) * 400 / 12);
					var wid = widthCountBass[i];
					var maxRg = document.getElementById("myRange");
					var divisor = maxRg.value;
					var maxWid = 100;
					if (wid > maxWid){
						wid = maxWid;
					}
					var s = null;
					if (wid > 0){
						s = ampBass - divisor / 100 * (avgAmpBass[i] * wid / maxWid - 10 / 100 * avgTotalBass);
					}
					else{
						s = ampBass;
					}
					if (s < 0){
						s = 0;
					}
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
						if (numHexArray[n].length < 2){
							numHexArray[n] = "0" + numHexArray[n];
						}
						numHex = numHex + numHexArray[n];

					}

					var my_gradient = ctx.createLinearGradient( 0, y / 2 , 0, height - y / 2);
					my_gradient.addColorStop(0,"black");
					my_gradient.addColorStop(0.25,numHex);
					my_gradient.addColorStop(0.75,numHex);
					my_gradient.addColorStop(1,"black");
					ctx.fillStyle = my_gradient;
					ctx.fillRect(2*(groupLocBass[i] + j) - 0 * bassSpectrumBegin, y  / 2, 2, height - y);

					rgbAvg[0] = rgbAvg[0] + rgb[0] / widthCount[i];
					rgbAvg[1] = rgbAvg[1] + rgb[1] / widthCount[i];
					rgbAvg[2] = rgbAvg[2] + rgb[2] / widthCount[i];
				}
			}
		}
	}

	//Show Piano
	if (pianoOn){
		fill('rgba(255,255,255, 0.25)');
		stroke('rgba(0,0,0, 0.25)');
		ctx.fillStyle ='rgba(255,255,255, 0.25)';
		var xRatio = drawWidth / 1600;
		var yRatio = drawHeight / 1080;
		var spacingx = 13;
		var yheight = 20 * yRatio;
		var xwidth = spacingx;
		var afterBlack = 0;
		var bkSandwich = 0;
		var keyShift = 24;
		var xShift = -204;
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
				ctx.fillRect((spacingx*(i - afterBlack * 0.5) + xShift - xShiftval) * xRatio, height1 / 2, xwidth * xRatio, yheight * yRatio);
			}

		}
		fill('rgba(0,0,0, 0.5)');
		ctx.fillStyle ='rgba(0,0,0, 0.25)';
		for (var i = 0 + keyShift; i < 89 + keyShift; i++){
			if (i % 12 == 1 || i % 12 == 4 || i % 12 == 6 || i % 12 == 9 || i % 12 == 11){
				yheight = 60;
				xWidth = (spacingx - .5);
				afterBlack = 0;
				ctx.fillRect((spacingx*(i - afterBlack * 0.5) + xShift - xShiftval) * xRatio, height1 / 2, xWidth * xRatio, yheight * yRatio);
			}
		}
	}
}

function rgbToHsv(r, g, b) {
	r /= 255, g /= 255, b /= 255;

	var max = Math.max(r, g, b), min = Math.min(r, g, b);
	var h, s, v = max;

	var d = max - min;
	s = max == 0 ? 0 : d / max;

	if (max == min) {
		h = 0; // achromatic
	}
	else {
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
