var _ = require('lodash')

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext


function main() {

  navigator.getUserMedia(
		{audio : true},
		function(stream) {
			var audioContext = new AudioContext();
			var mediastreamsource = audioContext.createMediaStreamSource(stream);
			var analyser = audioContext.createAnalyser();
			var frequencyData = new Uint8Array(analyser.frequencyBinCount);
			mediastreamsource.connect(analyser);

      var inArea = false
      var knock = [] // 1ノック (toneの集まり)
      var tunes = []
      var threshold = 100

      var animation = function(){

        analyser.getByteFrequencyData(frequencyData)
        var fsDivN = audioContext.sampleRate / analyser.fftSize;
				var tone = [];

        frequencyData[0] = 0;
        for (var i = 1, l = frequencyData.length; i < l; i++) {
          if(frequencyData[i] > threshold) {
						frequencyData[i] = Math.pow(10.0, 5.0 + 0.05 * frequencyData[i])
						tone.push({
							volume: frequencyData[i],
							frequency: i * fsDivN,
							n: i
						});
            tunes.push({
							volume: frequencyData[i],
							frequency: i * fsDivN,
							n: i
						});
          }
				}

        if(tone.length > 0) {
          inArea = true
        }

        if(inArea) {
          if(tone.length == 0) {
            inArea = false
            console.log(`tunes.length -> ${tunes.length}`)
          }
        } else {
          tunes = []
        }

        requestAnimationFrame(animation);
      }
			animation()
		},
		function(e) {
			console.log(e)
		}
	)
}


window.addEventListener("load", main, false)
