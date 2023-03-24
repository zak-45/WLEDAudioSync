/* 

a:zak45
d:25/01/2023
v:1.0.0

Chataigne Module for  WLED Sound Reactive
Send sound card audio data via UDP.
This script will take Audio data provided by Chataigne and try to map them to WLED values.

The UDP  Multicast  IP is 239.0.0.1, and the default UDP port is 11988.

// From WLED Infos
UDP port can be changed in WLED config pages, for example to have several groups of devices by assigning different UDP ports to each group.
the software sends/receives one packet every 20 milliseconds (approx). An external sender may be slower, but not faster than 20ms = 50fps
//

-------------------------------------- BIN -----------------  
  
  //                                               Range
      fftCalc[0] = (fftAdd(3,4)) /2;        // 60 - 100
      fftCalc[1] = (fftAdd(4,5)) /2;        // 80 - 120
      fftCalc[2] = (fftAdd(5,7)) /3;        // 100 - 160
      fftCalc[3] = (fftAdd(7,9)) /3;        // 140 - 200
      fftCalc[4] = (fftAdd(9,12)) /4;       // 180 - 260
      fftCalc[5] = (fftAdd(12,16)) /5;      // 240 - 340
      fftCalc[6] = (fftAdd(16,21)) /6;      // 320 - 440
      fftCalc[7] = (fftAdd(21,28)) /8;      // 420 - 600
      fftCalc[8] = (fftAdd(28,37)) /10;     // 580 - 760
      fftCalc[9] = (fftAdd(37,48)) /12;     // 740 - 980
      fftCalc[10] = (fftAdd(48,64)) /17;    // 960 - 1300
      fftCalc[11] = (fftAdd(64,84)) /21;    // 1280 - 1700
      fftCalc[12] = (fftAdd(84,111)) /28;   // 1680 - 2240
      fftCalc[13] = (fftAdd(111,147)) /37;  // 2220 - 2960
      fftCalc[14] = (fftAdd(147,194)) /48;  // 2940 - 3900
      fftCalc[15] = (fftAdd(194, 255)) /62; // 3880 - 5120  // avoid the last 5 bins, which are usually inaccurate
  //
  
      fftCalc[ 0] = fftAddAvg(1,2);               // 1    43 - 86   sub-bass
      fftCalc[ 1] = fftAddAvg(2,3);               // 1    86 - 129  bass
      fftCalc[ 2] = fftAddAvg(3,5);               // 2   129 - 216  bass
      fftCalc[ 3] = fftAddAvg(5,7);               // 2   216 - 301  bass + midrange    
  
      fftCalc[ 4] = fftAddAvg(7,10);                // 3   301 - 430  midrange
      fftCalc[ 5] = fftAddAvg(10,13);               // 3   430 - 560  midrange
      fftCalc[ 6] = fftAddAvg(13,19);               // 5   560 - 818  midrange
      fftCalc[ 7] = fftAddAvg(19,26);               // 7   818 - 1120 midrange -- 1Khz should always be the center !
      fftCalc[ 8] = fftAddAvg(26,33);               // 7  1120 - 1421 midrange
      fftCalc[ 9] = fftAddAvg(33,44);               // 9  1421 - 1895 midrange
      fftCalc[10] = fftAddAvg(44,56);               // 12 1895 - 2412 midrange + high mid
      fftCalc[11] = fftAddAvg(56,70);               // 14 2412 - 3015 high mid
      fftCalc[12] = fftAddAvg(70,86);               // 16 3015 - 3704 high mid
      fftCalc[13] = fftAddAvg(86,104);              // 18 3704 - 4479 high mid
      fftCalc[14] = fftAddAvg(104,165) * 0.88f;     // 61 4479 - 7106 high mid + high  -- with slight damping
		// don't use the last bins from 216 to 255. They are usually contaminated by aliasing (aka noise) 
	  fftCalc[15] = fftAddAvg(165,215) * 0.70f;   // 50 7106 - 9259 high             -- with some damping	  
  
  
*/

// sound Card
var SCexist = false;

// os
var OSmodule = null;

// Volume
var wledVol = 0;
// Volume Multiplier
var volMultiplier = 1024;

// Global FFT Multiplier
var fftMultiplier = 254;
// FFT Data
var fftWled = [];
// FFT Max Freq / Magnitude
var fftSoundMaxFreqMagnitude = 0;
var fftSoundMaxFreqIndex = 0;
// FFT Mode
var fftMode = "";
// Frequence table
var freqTable = [];

// samplePeak
var wledPeak = 0;

// Wled Freq/Mag
var wledFreq = 0;
var wledMag = 0;

// UDP
var multicastIP = "239.0.0.1";
var	uDPPort = 11988;
var myIP = "127.0.0.1";

// Init Flag
// to made some logic only once at init
var isInit = true;

// snapshot
var snapshot = false;

//replay 
var replay = false;
var duration = 0;

// UDP Data
var  UDP_AUDIO_SYNC = [];
var  UDP_AUDIO_SYNC_V2 = [];


//We create necessary entries in module.
function init ()
{
	script.log("-- Custom command called init()");	
	
	var UDPexist = root.modules.getItemWithName("WLEDAudioSync");
	var SCtest = root.modules.getItemWithName("Sound Card");
	OSmodule = root.modules.getItemWithName("OS");
	
	if (SCtest.name == "soundCard")
	{	
		script.log("Sound Card present");
		SCexist = true;
		
	} else {
			
		script.log("No Sound Card present");
		var newSCModule = root.modules.addItem("Sound Card");
		if (newSCModule.name != "undefined")
		{
			SCexist = true;
			
		} else {
			
			SCexist = false;
		}
	}

	if (OSmodule.name == "os")
	{
		script.log("Module OS exist");
		
	} else {
			
		OSModule = root.modules.addItem("OS");
			
	}

	local.scripts.wLEDAudioSync.updateRate.setAttribute("readOnly",false);
	root.modules.soundCard.parameters.pitchDetectionMethod.set("YIN");

	var infos = util.getOSInfos(); 
	script.log("Hello "+infos.username);	
	script.log("We run under : "+infos.name);	
	
}

// execution depend on the user response
function messageBoxCallback (id, result)
{
	script.log("Message box callback : "+id+" : "+result); 
	
}

function moduleParameterChanged (param)
{	
	script.log("Param changed : "+param.name);
	
	if (param.name == "volumeMultiplier")
	{
		volMultiplier = local.parameters.volumeMultiplier.get();
		
	} else if (param.name == "frequencyMagnitudeMultiplier"){
		
		fftMultiplier = local.parameters.frequencyMagnitudeMultiplier.get();
		
	} else if (param.name == "remoteHost"){
		
		multicastIP = local.parameters.output.remoteHost.get();
		
	} else if (param.name == "remotePort"){
		
		uDPPort = local.parameters.output.remotePort.get();
		
	} else if  (param.name == "ipAddressToBind"){
		
		myIP = local.parameters.ipAddressToBind.get();
		
	} else if (param.name == "sendTestMessage"){
		
		testMultiCast();
		
	} else if (param.name == "local"){
		
		if (local.parameters.output.local.get() == 1){
			
			multicastIP = "127.0.0.1";
			
		} else {
			
			multicastIP = local.parameters.output.remoteHost.get();
			
		}
		
	} else if (param.name == "takeSnapshot"){
		
		snapshot = true;
	
	}
}

function moduleValueChanged (value) 
{	
	//script.log("Module value changed : "+value.get());
	
}


// update rate (no more than 50fps)
function update ()
{
	// Initialize only once some Params when script run
	if (isInit === true)
	{
		script.log('Initialize');
		script.setUpdateRate(50);
		
		// retreive all IPs
		var ips = util.getIPs();
		root.modules.wLEDAudioSync.parameters.ipAddressToBind.removeOptions();
		
		for( var i=0; i<ips.length; i +=1 ) 
		{ 
			root.modules.wLEDAudioSync.parameters.ipAddressToBind.addOption(ips[i],i);
		}		
		
		multicastIP = local.parameters.output.remoteHost.get();;
		uDPPort = local.parameters.output.remotePort.get();
		myIP = local.parameters.ipAddressToBind.get();
		// Remove read only from rate
		local.scripts.wLEDAudioSync.updateRate.setAttribute("readOnly",false);
		// create FFT : new
		createWLEDFFT(false);
		root.modules.soundCard.parameters.fftAnalysis.enabled.set(1);
		
		isInit = false;
	}
	
	if (SCexist && root.modules.soundCard.values.volume.get()!= 0 && replay === false)
	{
		sendAudio(false);
		
	} else if (replay === true){
		
		if ( duration > 0 )
		{
			sendAudio(true);
			
		} else {

			replay = false;	
			script.setUpdateRate(50);
			util.delayThreadMS(30);
			
			for ( var k = 0; k < 10; k += 1 )
			{
				sendAudio(false);	
			}
		}
	}
}

// send audio data with optional delay
function sendAudio(replay)
{
	// translate audio data to UDP message
	var udpdataV1 = udpAudioSyncV1(replay);
	
	if (replay)
	{
		duration -= 100;
	}
	
	// optional delay
	var mydelay = local.parameters.delay.get();	
	if (replay === false && mydelay > 0)
	{
		util.delayThreadMS(mydelay);		
	}
	
	// v1 message
	if (local.parameters.audioV1.get() == 1)
	{
		local.sendBytesTo (multicastIP,uDPPort,udpdataV1);
	}
	// v2 message	
	if (local.parameters.audioV2.get() == 1)
	{
		var udpdataV2 = udpAudioSyncV2(udpdataV1);
		local.sendBytesTo (multicastIP,uDPPort,udpdataV2);		
	}
}

/* 
Sound Card
*/

// Create 16 FFT analysis entries with default name : adjustable size - custom
function createFFT(size)
{

	removeFFT();
	root.modules.soundCard.parameters.fftAnalysis.minDB.set(-80);
	
	fftMode = "custom";

	if (size > 1)
	{
		size  = 1;
		
	} else if (size == 0) {
		
		size = 0.1;
	}

	for (var i = 0; i < 16; i += 1)
	{
		var bin = root.modules.soundCard.parameters.fftAnalysis.addItem();
		bin.position.set(0.0625 * i);
		bin.size.set(size);
		updateFreqTable(fftMode, i);
	}
}

// Create 16 FFT analysis entries with default name : WLED OLD/NEW -- true/false
function createWLEDFFT(old)
{

	removeFFT();
	root.modules.soundCard.parameters.fftAnalysis.minDB.set(-60);
	
	if (old)
	{
		fftMode = "old";
		
	} else {
		
		fftMode = "new";
	}
	

	for (var i = 0; i < 16; i += 1)
	{
		var bin = root.modules.soundCard.parameters.fftAnalysis.addItem();
		if (i == 0)
		{
			if (old) 
			{
				bin.position.set(0.020);
				bin.size.set(0.030);
				
			} else {
				
				bin.position.set(0.020);
				bin.size.set(0.020);				
			}
			
		} else if (i == 1) {
			
			if (old) 
			{
				bin.position.set(0.030);
				bin.size.set(0.030);
				
			} else {
				
				bin.position.set(0.030);
				bin.size.set(0.020);				
			}
			
		} else if (i == 2) {
			
			if (old) 
			{
				bin.position.set(0.040);
				bin.size.set(0.030);
				
			} else {
				
				bin.position.set(0.045);
				bin.size.set(0.020);				
			}
			
		} else if (i == 3) {
			
			if (old) 
			{
				bin.position.set(0.045);
				bin.size.set(0.030);
				
			} else {
				
				bin.position.set(0.065);
				bin.size.set(0.020);				
			}
			
		} else if (i == 4) {
			
			if (old) 
			{
				bin.position.set(0.060);
				bin.size.set(0.030);
				
			} else {
				
				bin.position.set(0.090);
				bin.size.set(0.020);				
			}
			
		} else if (i == 5) {
			
			if (old) 
			{
				bin.position.set(0.075);
				bin.size.set(0.030);
				
			} else {
				
				bin.position.set(0.110);
				bin.size.set(0.040);				
			}
			
		} else if (i == 6) {
			
			if (old) 
			{
				bin.position.set(0.090);
				bin.size.set(0.040);
				
			} else {
				
				bin.position.set(0.160);
				bin.size.set(0.040);				
			}
			
		} else if (i == 7) {
			
			if (old) 
			{
				bin.position.set(0.120);
				bin.size.set(0.040);
				
			} else {
				
				bin.position.set(0.215);
				bin.size.set(0.050);				
			}
			
		} else if (i == 8) {
			
			if (old) 
			{
				bin.position.set(0.150);
				bin.size.set(0.040);
				
			} else {
				
				bin.position.set(0.265);
				bin.size.set(0.050);				
			}
			
		} else if (i == 9) {
			
			if (old) 
			{
				bin.position.set(0.190);
				bin.size.set(0.040);
				
			} else {
				
				bin.position.set(0.340);
				bin.size.set(0.050);				
			}
			
		} else if (i == 10) {
			
			if (old) 
			{
				bin.position.set(0.245);
				bin.size.set(0.040);
				
			} else {
				
				bin.position.set(0.410);
				bin.size.set(0.050);				
			}
			
		} else if (i == 11) {
			
			if (old) 
			{
				bin.position.set(0.310);
				bin.size.set(0.040);
				
			} else {
				
				bin.position.set(0.490);
				bin.size.set(0.050);				
			}
			
		} else if (i == 12) {
			
			if (old) 
			{
				bin.position.set(0.390);
				bin.size.set(0.060);
				
			} else {
				
				bin.position.set(0.570);
				bin.size.set(0.060);				
			}
			
		} else if (i == 13) {
			
			if (old) 
			{
				bin.position.set(0.480);
				bin.size.set(0.060);
				
			} else {
				
				bin.position.set(0.645);
				bin.size.set(0.070);				
			}
			
		} else if (i == 14) {
			
			if (old) 
			{
				bin.position.set(0.590);
				bin.size.set(0.030);
				
			} else {
				
				bin.position.set(0.830);
				bin.size.set(0.070);				
			}
			
		} else if (i == 15) {
			
			if (old) 
			{
				bin.position.set(0.700);
				bin.size.set(0.050);
				
			} else {
				
				bin.position.set(0.915);
				bin.size.set(0.070);				
			}
		}
		
		updateFreqTable(fftMode, i);
	}
}

// update Frequences Table depend on FFT mode
function updateFreqTable(fftMode, index)
{
	
	if ( index == 0 ) 
	{
		if ( fftMode == "new" )
		{
			freqTable[index] = 86;
			
		} else if ( fftMode == "old" ) {

			freqTable[index] = 100;			
			
		} else if ( fftMode == "custom" ) {

			freqTable[index] = 50;
		
		}
		
	} else if ( index == 1 ) {
		
		if ( fftMode == "new" )
		{
			freqTable[index] = 129;
			
		} else if ( fftMode == "old" ) {

			freqTable[index] = 120;			
			
		} else if ( fftMode == "custom" ) {

			freqTable[index] = 280;
		
		}

	} else if ( index == 2 ) {
		
		if ( fftMode == "new" )
		{
			freqTable[index] = 216;
			
		} else if ( fftMode == "old" ) {

			freqTable[index] = 160;			
			
		} else if ( fftMode == "custom" ) {

			freqTable[index] = 600;
		
		}

	} else if ( index == 3 ) {
		
		if ( fftMode == "new" )
		{
			freqTable[index] = 301;
			
		} else if ( fftMode == "old" ) {

			freqTable[index] = 200;			
			
		} else if ( fftMode == "custom" ) {

			freqTable[index] = 950;
		
		}

	} else if ( index == 4 ) {
		
		if ( fftMode == "new" )
		{
			freqTable[index] = 430;
			
		} else if ( fftMode == "old" ) {

			freqTable[index] = 260;			
			
		} else if ( fftMode == "custom" ) {

			freqTable[index] = 1300;
		
		}

	} else if ( index == 5 ) {
		
		if ( fftMode == "new" )
		{
			freqTable[index] = 560;
			
		} else if ( fftMode == "old" ) {

			freqTable[index] = 340;			
			
		} else if ( fftMode == "custom" ) {

			freqTable[index] = 1700;
		
		}

	} else if ( index == 6 ) {
		
		if ( fftMode == "new" )
		{
			freqTable[index] = 818;
			
		} else if ( fftMode == "old" ) {

			freqTable[index] = 440;			
			
		} else if ( fftMode == "custom" ) {

			freqTable[index] = 2150;
		
		}

	} else if ( index == 7 ) {
		
		if ( fftMode == "new" )
		{
			freqTable[index] = 1120;
			
		} else if ( fftMode == "old" ) {

			freqTable[index] = 600;			
			
		} else if ( fftMode == "custom" ) {

			freqTable[index] = 2600;
		
		}

	} else if ( index == 8 ) {
		
		if ( fftMode == "new" )
		{
			freqTable[index] = 1421;
			
		} else if ( fftMode == "old" ) {

			freqTable[index] = 760;			
			
		} else if ( fftMode == "custom" ) {

			freqTable[index] = 3100;
		
		}

	} else if ( index == 9 ) {
		
		if ( fftMode == "new" )
		{
			freqTable[index] = 1895;
			
		} else if ( fftMode == "old" ) {

			freqTable[index] = 980;			
			
		} else if ( fftMode == "custom" ) {

			freqTable[index] = 3600;
		
		}

	} else if ( index == 10 ) {
		
		if ( fftMode == "new" )
		{
			freqTable[index] = 2412;
			
		} else if ( fftMode == "old" ) {

			freqTable[index] = 1300;			
			
		} else if ( fftMode == "custom" ) {

			freqTable[index] = 4200;
		
		}

	} else if ( index == 11 ) {
		
		if ( fftMode == "new" )
		{
			freqTable[index] = 3015;
			
		} else if ( fftMode == "old" ) {

			freqTable[index] = 1700;			
			
		} else if ( fftMode == "custom" ) {

			freqTable[index] = 4950;
		
		}

	} else if ( index == 12 ) {
		
		if ( fftMode == "new" )
		{
			freqTable[index] = 3704;
			
		} else if ( fftMode == "old" ) {

			freqTable[index] = 2240;			
			
		} else if ( fftMode == "custom" ) {

			freqTable[index] = 5750;
		
		}

	} else if ( index == 13 ) {
		
		if ( fftMode == "new" )
		{
			freqTable[index] = 4479;
			
		} else if ( fftMode == "old" ) {

			freqTable[index] = 2960;			
			
		} else if ( fftMode == "custom" ) {

			freqTable[index] = 6800;
		
		}

	} else if ( index == 14 ) {
		
		if ( fftMode == "new" )
		{
			freqTable[index] = 7106;
			
		} else if ( fftMode == "old" ) {

			freqTable[index] = 3900;			
			
		} else if ( fftMode == "custom" ) {

			freqTable[index] = 8100;
		
		}

	} else if ( index == 15 ) {
		
		if ( fftMode == "new" )
		{
			freqTable[index] = 9259;
			
		} else if ( fftMode == "old" ) {

			freqTable[index] = 5120;			
			
		} else if ( fftMode == "custom" ) {

			freqTable[index] = 10000;
		
		}
	}	
}


// remove all FFT analysis
function removeFFT()
{
	root.modules.soundCard.parameters.fftAnalysis.removeAll();
}

/*

WLED Specifics

*/

// This one should be always executed. If replay is true we take data from file.
function udpAudioSyncV1(replay)
{
/* 
#define UDP_SYNC_HEADER "00001"
struct audioSyncPacket {
  char header[6] = UDP_SYNC_HEADER;
  uint8_t myVals[32];     //  32 Bytes
  int sampleAgc;          //  04 Bytes
  int sampleRaw;          //  04 Bytes
  float sampleAvg;        //  04 Bytes
  bool samplePeak;        //  01 Bytes
  uint8_t fftResult[16];  //  16 Bytes - FFT results, one byte per GEQ channel
  double FFT_Magnitude;   //  08 Bytes
  double FFT_MajorPeak;   //  08 Bytes
};
----------------------------------------------------

  // update samples for effects
  volumeSmth   = fmaxf(receivedPacket->sampleAgc, 0.0f);
  volumeRaw    = volumeSmth;   // V1 format does not have "raw" AGC sample
  // update internal samples
  sampleRaw    = fmaxf(receivedPacket->sampleRaw, 0.0f);
  sampleAvg    = fmaxf(receivedPacket->sampleAvg, 0.0f);;
  sampleAgc    = volumeSmth;
  rawSampleAgc = volumeRaw;
  multAgc      = 1.0f;
  
-----------------------------------------------------

  bool newReading = MSGEQ7.read(MSGEQ7_INTERVAL);
  if (newReading) {
    audioSyncPacket transmitData;

    for (int b = 0; b < 14; b = b + 2) {
      int val = MSGEQ7.get((b / 2));
      val = mapNoise(val);
      Serial.printf("%u ", val);
      transmitData.fftResult[b] = val;
      transmitData.fftResult[(b + 1)] = val;  
    }

------------------------------------------------------

    int v = map(MSGEQ7.getVolume(), 0, MSGEQ7_OUT_MAX, 0, 1023); // TODO: not sure this is right
    transmitData.sampleRaw = v; // Current sample

------------------------------------------------------


*/
	
	// FFT Max Freq / Magnitude
	fftSoundMaxFreqMagnitude = 0;
	fftSoundMaxFreqIndex = 0;

	if (replay === false)	
	{
	
		// sampleRaw 4 Bytes
		wledVol = root.modules.soundCard.values.volume.get()*volMultiplier;
		// samplePeak
		wledPeak = root.modules.soundCard.values.pitchDetection.pitch.get();	
		
		// Calculate FFT Data
		// Freq value
		fftWled[0] = root.modules.soundCard.values.fftEnveloppes.analyzer1Value.get()*fftMultiplier;
		fftWled[1] = root.modules.soundCard.values.fftEnveloppes.analyzer2Value.get()*fftMultiplier;
		fftWled[2] = root.modules.soundCard.values.fftEnveloppes.analyzer3Value.get()*fftMultiplier;	
		fftWled[3] = root.modules.soundCard.values.fftEnveloppes.analyzer4Value.get()*fftMultiplier;
		fftWled[4] = root.modules.soundCard.values.fftEnveloppes.analyzer5Value.get()*fftMultiplier;
		fftWled[5] = root.modules.soundCard.values.fftEnveloppes.analyzer6Value.get()*fftMultiplier;	
		fftWled[6] = root.modules.soundCard.values.fftEnveloppes.analyzer7Value.get()*fftMultiplier;	
		fftWled[7] = root.modules.soundCard.values.fftEnveloppes.analyzer8Value.get()*fftMultiplier;
		fftWled[8] = root.modules.soundCard.values.fftEnveloppes.analyzer9Value.get()*fftMultiplier;
		fftWled[9] = root.modules.soundCard.values.fftEnveloppes.analyzer10Value.get()*fftMultiplier;	
		fftWled[10] = root.modules.soundCard.values.fftEnveloppes.analyzer11Value.get()*fftMultiplier;	
		fftWled[11] = root.modules.soundCard.values.fftEnveloppes.analyzer12Value.get()*fftMultiplier;
		fftWled[12] = root.modules.soundCard.values.fftEnveloppes.analyzer13Value.get()*fftMultiplier;
		fftWled[13] = root.modules.soundCard.values.fftEnveloppes.analyzer14Value.get()*fftMultiplier;	
		fftWled[14] = root.modules.soundCard.values.fftEnveloppes.analyzer15Value.get()*fftMultiplier;	
		fftWled[15] = root.modules.soundCard.values.fftEnveloppes.analyzer16Value.get()*fftMultiplier;
		

		// retreive MaxFreq and Magnitude
		for (i = 0; i < 16; i +=1)
		{
			if (fftSoundMaxFreqMagnitude < fftWled[i])
			{
				fftSoundMaxFreqMagnitude = fftWled[i];				
				fftSoundMaxFreqIndex = freqTable[i];
			}
		}
		
		// FFT Magnitude 8 bytes
		wledMag = fftSoundMaxFreqMagnitude;
		// FFT Max Freq 8 bytes
		wledFreq = fftSoundMaxFreqIndex;
	}
	
	//
	// create UDP data 
	//
	var intArray = createIntArray(util.floatToHexSeq(wledVol,true));
	
	if (wledPeak !=0)
	{
		var samplePeak = 1;
		
	} else {
		
		var samplePeak = 0;
	}

	var fftMagArray = createIntArray(util.doubleToHexSeq(wledMag,true));
	var fftFreqArray = createIntArray(util.doubleToHexSeq(wledFreq,true));
	
	// Header v1
	UDP_AUDIO_SYNC[0] = 48;
	UDP_AUDIO_SYNC[1] = 48;
	UDP_AUDIO_SYNC[2] = 48;
	UDP_AUDIO_SYNC[3] = 48;
	UDP_AUDIO_SYNC[4] = 49;
	UDP_AUDIO_SYNC[5] = 0;
	// uint8_t myVals[32];
	// Used to store a pile of samples because WLED frame rate and WLED sample rate are not synchronized. Frame rate is too low.
	UDP_AUDIO_SYNC[6] = wledVol;
	UDP_AUDIO_SYNC[7] = wledVol;
	UDP_AUDIO_SYNC[8] = wledVol;
	UDP_AUDIO_SYNC[9] = wledVol;
	UDP_AUDIO_SYNC[10] = wledVol;
	UDP_AUDIO_SYNC[11] = wledVol;
	UDP_AUDIO_SYNC[12] = wledVol;
	UDP_AUDIO_SYNC[13] = wledVol;
	UDP_AUDIO_SYNC[14] = wledVol;
	UDP_AUDIO_SYNC[15] = wledVol;
	UDP_AUDIO_SYNC[16] = wledVol;
	UDP_AUDIO_SYNC[17] = wledVol;
	UDP_AUDIO_SYNC[18] = wledVol;
	UDP_AUDIO_SYNC[19] = wledVol;
	UDP_AUDIO_SYNC[20] = wledVol;
	UDP_AUDIO_SYNC[21] = wledVol;
	UDP_AUDIO_SYNC[22] = wledVol;
	UDP_AUDIO_SYNC[23] = wledVol;
	UDP_AUDIO_SYNC[24] = wledVol;
	UDP_AUDIO_SYNC[25] = wledVol;
	UDP_AUDIO_SYNC[26] = wledVol;
	UDP_AUDIO_SYNC[27] = wledVol;
	UDP_AUDIO_SYNC[28] = wledVol;
	UDP_AUDIO_SYNC[29] = wledVol;
	UDP_AUDIO_SYNC[30] = wledVol;
	UDP_AUDIO_SYNC[31] = wledVol;
	UDP_AUDIO_SYNC[32] = wledVol;
	UDP_AUDIO_SYNC[33] = wledVol;
	UDP_AUDIO_SYNC[34] = wledVol;
	UDP_AUDIO_SYNC[35] = wledVol;
	UDP_AUDIO_SYNC[36] = wledVol;
	UDP_AUDIO_SYNC[37] = wledVol;
	// Filler
	UDP_AUDIO_SYNC[38] = 0;
	UDP_AUDIO_SYNC[39] = 0;	
	// int sampleAgc;          //  04 Bytes
 	// volumeSmth   = fmaxf(receivedPacket->sampleSmth, 0.0f);
	UDP_AUDIO_SYNC[40] = intArray[3];
	UDP_AUDIO_SYNC[41] = intArray[2];
	UDP_AUDIO_SYNC[42] = intArray[1];
	UDP_AUDIO_SYNC[43] = intArray[0];
	//  int sampleRaw;          //  04 Bytes
	// fmaxf(receivedPacket->sampleRaw, 0.0f);
	UDP_AUDIO_SYNC[44] = intArray[3];
	UDP_AUDIO_SYNC[45] = intArray[2];
	UDP_AUDIO_SYNC[46] = intArray[1];
	UDP_AUDIO_SYNC[47] = intArray[0];
	// float sampleAvg;        //  04 Bytes
	// volumeSmth   = fmaxf(receivedPacket->sampleSmth, 0.0f);
	UDP_AUDIO_SYNC[48] = intArray[3];
	UDP_AUDIO_SYNC[49] = intArray[2];
	UDP_AUDIO_SYNC[50] = intArray[1];
	UDP_AUDIO_SYNC[51] = intArray[0];
	//   bool samplePeak;        //  01 Bytes
	// Boolean flag for peak. Responding routine must reset this flag
  	UDP_AUDIO_SYNC[52] = samplePeak;
	//   uint8_t fftResult[16];  //  16 Bytes - FFT results, one byte per GEQ channel 
	UDP_AUDIO_SYNC[53] = fftWled[0];
	UDP_AUDIO_SYNC[54] = fftWled[1];
	UDP_AUDIO_SYNC[55] = fftWled[2];
	UDP_AUDIO_SYNC[56] = fftWled[3];
	UDP_AUDIO_SYNC[57] = fftWled[4];
	UDP_AUDIO_SYNC[58] = fftWled[5];
	UDP_AUDIO_SYNC[59] = fftWled[6];
	UDP_AUDIO_SYNC[60] = fftWled[7];
	UDP_AUDIO_SYNC[61] = fftWled[8];
	UDP_AUDIO_SYNC[62] = fftWled[9];
	UDP_AUDIO_SYNC[63] = fftWled[10];
	UDP_AUDIO_SYNC[64] = fftWled[11];
	UDP_AUDIO_SYNC[65] = fftWled[12];
	UDP_AUDIO_SYNC[66] = fftWled[13];
	UDP_AUDIO_SYNC[67] = fftWled[14];
	UDP_AUDIO_SYNC[68] = fftWled[15];
	// Filler
	UDP_AUDIO_SYNC[69] = 0;	
	UDP_AUDIO_SYNC[70] = 0;	
	UDP_AUDIO_SYNC[71] = 0;	
	//   double FFT_Magnitude;   //  08 Bytes
	// float FFT_Magnitude = 0.0f;   // FFT: volume (magnitude) of peak frequency
	// my_magnitude  = fmaxf(receivedPacket->FFT_Magnitude, 0.0f);
	UDP_AUDIO_SYNC[72] = fftMagArray[7];
	UDP_AUDIO_SYNC[73] = fftMagArray[6];
	UDP_AUDIO_SYNC[74] = fftMagArray[5];
	UDP_AUDIO_SYNC[75] = fftMagArray[4];
	UDP_AUDIO_SYNC[76] = fftMagArray[3];
	UDP_AUDIO_SYNC[77] = fftMagArray[2];
	UDP_AUDIO_SYNC[78] = fftMagArray[1];
	UDP_AUDIO_SYNC[79] = fftMagArray[0];
	//  double FFT_MajorPeak;   //  08 Bytes
	// float FFT_MajorPeak = 1.0f;   // FFT: strongest (peak) frequency
	// FFT_MajorPeak = constrain(receivedPacket->FFT_MajorPeak, 1.0f, 11025.0f);  // restrict value to range expected by effects
	UDP_AUDIO_SYNC[80] = fftFreqArray[7];
	UDP_AUDIO_SYNC[81] = fftFreqArray[6];
	UDP_AUDIO_SYNC[82] = fftFreqArray[5];
	UDP_AUDIO_SYNC[83] = fftFreqArray[4];
	UDP_AUDIO_SYNC[84] = fftFreqArray[3];
	UDP_AUDIO_SYNC[85] = fftFreqArray[2];
	UDP_AUDIO_SYNC[86] = fftFreqArray[1];
	UDP_AUDIO_SYNC[87] = fftFreqArray[0];
	
	
	// save audio data to file
	if (snapshot)
	{
		script.log("Take snapshot");
		
		var soundFileName = "Snapshot_" + util.getTimestamp() + ".csv";
		var data = wledVol + ";" + wledPeak + ";" + wledMag + ";" + wledFreq;
		for (i = 0; i < 16; i+=1)
		{
			data = data + ";" + fftWled[i];
		}
		data = data + ";" + fftMode;
		
		// write sound data to file		
		util.writeFile(soundFileName, data, false);		
		util.showMessageBox("Snapshot", "file name : " + soundFileName , "info", "Ok");
		
		snapshot = false;
	}

return UDP_AUDIO_SYNC;
}

// v2 message , new format
function udpAudioSyncV2(udpdataV1)
{
/*
  // new "V2" audiosync struct - 40 bytes - from WLED 0.14xx
  
  struct audioSyncPacket {
  char    header[6];      //  06 Bytes
  float   sampleRaw;      //  04 Bytes  - either "sampleRaw" or "rawSampleAgc" depending on soundAgc setting
  float   sampleSmth;     //  04 Bytes  - either "sampleAvg" or "sampleAgc" depending on soundAgc setting
  uint8_t samplePeak;     //  01 Bytes  - 0 no peak; >=1 peak detected. In future, this will also provide peak Magnitude
  uint8_t reserved1;      //  01 Bytes  - for future extensions - not used yet
  uint8_t fftResult[16];  //  16 Bytes
  float  FFT_Magnitude;   //  04 Bytes
  float  FFT_MajorPeak;   //  04 Bytes
  
*/

	// FFT Magnitude 4 bytes
	var fftMagArray = createIntArray(util.floatToHexSeq(wledMag,true));
	
	// FFT Max Freq 4 bytes
	var fftFreqArray = createIntArray(util.floatToHexSeq(wledFreq,true));	
	
	// Header
	UDP_AUDIO_SYNC_V2[0] = 48;
	UDP_AUDIO_SYNC_V2[1] = 48;
	UDP_AUDIO_SYNC_V2[2] = 48;
	UDP_AUDIO_SYNC_V2[3] = 48;
	UDP_AUDIO_SYNC_V2[4] = 50;
	UDP_AUDIO_SYNC_V2[5] = 0;
	// Filler
	UDP_AUDIO_SYNC_V2[6] = 0;
	UDP_AUDIO_SYNC_V2[7] = 0;
	// sampleRaw
	UDP_AUDIO_SYNC_V2[8] = udpdataV1[44];
	UDP_AUDIO_SYNC_V2[9] = udpdataV1[45];
	UDP_AUDIO_SYNC_V2[10] = udpdataV1[46];
	UDP_AUDIO_SYNC_V2[11] = udpdataV1[47];
	// sampleSmth
	UDP_AUDIO_SYNC_V2[12] = udpdataV1[44];
	UDP_AUDIO_SYNC_V2[13] = udpdataV1[45];
	UDP_AUDIO_SYNC_V2[14] = udpdataV1[46];
	UDP_AUDIO_SYNC_V2[15] = udpdataV1[47];
	// samplePeak
	UDP_AUDIO_SYNC_V2[16] = udpdataV1[52];
	//for future extensions - not used yet
	UDP_AUDIO_SYNC_V2[17] = 0;
	// FFT
	UDP_AUDIO_SYNC_V2[18] = udpdataV1[53];
	UDP_AUDIO_SYNC_V2[19] = udpdataV1[54];
	UDP_AUDIO_SYNC_V2[20] = udpdataV1[55];
	UDP_AUDIO_SYNC_V2[21] = udpdataV1[56];
	UDP_AUDIO_SYNC_V2[22] = udpdataV1[57];
	UDP_AUDIO_SYNC_V2[23] = udpdataV1[58];
	UDP_AUDIO_SYNC_V2[24] = udpdataV1[59];
	UDP_AUDIO_SYNC_V2[25] = udpdataV1[60];
	UDP_AUDIO_SYNC_V2[26] = udpdataV1[61];
	UDP_AUDIO_SYNC_V2[27] = udpdataV1[62];
	UDP_AUDIO_SYNC_V2[28] = udpdataV1[63];
	UDP_AUDIO_SYNC_V2[29] = udpdataV1[64];
	UDP_AUDIO_SYNC_V2[30] = udpdataV1[65];
	UDP_AUDIO_SYNC_V2[31] = udpdataV1[66];
	UDP_AUDIO_SYNC_V2[32] = udpdataV1[67];
	UDP_AUDIO_SYNC_V2[33] = udpdataV1[68];
	// Filler
	UDP_AUDIO_SYNC_V2[34] = 0;
	UDP_AUDIO_SYNC_V2[35] = 0;	
	// FFT_Magnitude
	UDP_AUDIO_SYNC_V2[36] = fftMagArray[3];
	UDP_AUDIO_SYNC_V2[37] = fftMagArray[2];
	UDP_AUDIO_SYNC_V2[38] = fftMagArray[1];
	UDP_AUDIO_SYNC_V2[39] = fftMagArray[0];
	// FFT_MajorPeak
	UDP_AUDIO_SYNC_V2[40] = fftFreqArray[3];
	UDP_AUDIO_SYNC_V2[41] = fftFreqArray[2];
	UDP_AUDIO_SYNC_V2[42] = fftFreqArray[1];
	UDP_AUDIO_SYNC_V2[43] = fftFreqArray[0];

return UDP_AUDIO_SYNC_V2;
}

// Convert Sequence of Hex Char values ( from 00 to FF ) to int Array
function createIntArray(hexSequence)
{
	var intArray = [];
	var j = 0;
	
    for ( i = 0; i < hexSequence.length; i+=2 )
	{
		intArray[j] = util.hexStringToInt(hexSequence.substring(i,i+1) + hexSequence.substring(i+1,i+2));
		j +=1;
    }
	
return intArray;
}	

// Will bind to UDP port on specified IP address and join the MulticastGroup
// On 10/03/2023: Multicast do not work as expected on Chataigne, mainly when more than one network card
function testMultiCast()
{
	myIP = local.parameters.ipAddressToBind.getKey();
	script.log(myIP , multicastIP , uDPPort);
	
	var multiExeCmd = util.readFile("multicast.cmd");
	var multiOptions = " --ip " + myIP + " --group " + multicastIP + " --port " + uDPPort;
	var exeCMD = multiExeCmd + multiOptions;
	script.log('command to run : '+ exeCMD);
	// we execute the cmd 
	var launchresult = root.modules.os.launchCommand(exeCMD, false);
}

// replay audio data from snapshot file
function runReplay(fileName, myduration)
{
	script.setUpdateRate(10);
	duration = myduration;
	
	var soundData = [];
	soundData = util.readFile(fileName).split(";");
	
	wledVol = soundData[0];
	wledPeak = soundData[1];
	wledMag = soundData[2];
	wledFreq = soundData[3];
	
	for ( i = 0; i < 16; i += 1)
	{
		fftWled[i] = soundData[i+4];
	}

	replay = true;
}

// just for some test
function test()
{

	for (var i = 0; i < 16 ; i +=1)
	{
		script.log(freqTable[i]);
	}	
}