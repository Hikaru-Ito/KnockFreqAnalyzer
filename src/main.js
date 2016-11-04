var _ = require('lodash')
import Meyda from 'meyda'

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext



function main() {
  var RMSGraphElement = document.getElementById("rms_graph")
	var RMSGraphContext = RMSGraphElement.getContext("2d")
  RMSGraphElement.width = 1024
  RMSGraphElement.height = 300
  var MFCCGraphElement = document.getElementById("mfcc_graph")
  var MFCCGraphContext = MFCCGraphElement.getContext("2d")
  MFCCGraphElement.width = 1024
  MFCCGraphElement.height = 300

  var RMS_THRESHOLD = 0.005
  var MFCC_GRAPH_WEIGHT = 2.0

  navigator.getUserMedia(
		{audio : true},
		function(stream) {
			var audioContext = new AudioContext();
			var mediastreamsource = audioContext.createMediaStreamSource(stream);
			var analyser = audioContext.createAnalyser();
			var frequencyData = new Uint8Array(analyser.frequencyBinCount);
			mediastreamsource.connect(analyser);


      // Meyda initialize
      var md = Meyda.createMeydaAnalyzer({
	      audioContext: audioContext,
	      source: mediastreamsource,
	      bufferSize: 512,
	      windowingFunction: 'hamming'
	    })
      var mfccs = []
      var rms = []
      var knocking = false
      var knock = { rms: [], mfcc: [] }
      var knocks = []

      var animation = function(){

        var features = md.get(['rms', 'mfcc'])
        if(features) {
          rms.push(features.rms)
          mfccs.push(features.mfcc)
          if(rms.length > RMSGraphElement.width) rms = []
          if(features.rms > RMS_THRESHOLD && !knocking) {
            knocking = true
          }
          if(features.rms > RMS_THRESHOLD && knocking) {
            knock.rms.push(features.rms)
            knock.mfcc.push(features.mfcc)
          }
          if(features.rms < RMS_THRESHOLD && knocking) {
            let i = knock.rms.indexOf(Math.max(...knock.rms))
            drawKnockMFCC(knock.mfcc[i])
            console.log(`knock.rms.length -> ${knock.rms.length}`)
            console.log(`knock.mfcc.length -> ${knock.mfcc.length}`)
            knocks.push(knock)
            knock.rms = []
            knock.mfcc = []
            knocking = false
          }
        }
        drawRMS(rms)
        requestAnimationFrame(animation)
      }
			animation()
		},
		function(e) {
			console.log(e)
		}
	)

  function drawRMS(rms) {
    RMSGraphContext.clearRect(0, 0, RMSGraphElement.width, RMSGraphElement.height);

    RMSGraphContext.beginPath();
    RMSGraphContext.strokeStyle = "#333333";
    RMSGraphContext.moveTo(0, RMSGraphElement.height / 2 + rms[0] * 1000);
    for(let i in rms) {
      RMSGraphContext.lineTo(i, RMSGraphElement.height / 2 + rms[i] * 1000);
    }
    RMSGraphContext.stroke();
  }

  function drawKnockMFCC(mfcc) {
    MFCCGraphContext.clearRect(0, 0, MFCCGraphElement.width, MFCCGraphElement.height);

    MFCCGraphContext.beginPath();
    MFCCGraphContext.strokeStyle = "#333333";
    MFCCGraphContext.moveTo(0, MFCCGraphElement.height / 2 + mfcc[0] * MFCC_GRAPH_WEIGHT);
    for(let i in mfcc) {
      MFCCGraphContext.lineTo(i*(MFCCGraphElement.width / 28), MFCCGraphElement.height / 2 + mfcc[i] * MFCC_GRAPH_WEIGHT);
    }
    MFCCGraphContext.stroke();
  }
}




/**
 * ヴォリュームフィルタ
 * @return {[type]} [description]
 */
function filterVolume(tunes, ts) {
  return tunes.filter((t) => {
    return t.level > ts
  })
}


window.addEventListener("load", main, false);
