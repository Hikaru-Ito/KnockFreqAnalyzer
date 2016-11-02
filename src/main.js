var _ = require('lodash')

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext


function main() {
  var graphElement = document.getElementById("graph")
	var graphContext = graphElement.getContext("2d")
  graphElement.width = 1024
  graphElement.height = 600

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
        var fsDivN = audioContext.sampleRate / analyser.fftSize
				var tone = []

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
            /**
             * tunesを正規化
             *
             * levelが低い成分については、除外する
             */
            // 全toneで最も強いものを抽出
            var max = _.maxBy(tunes, function(t) { return t.volume })

            // maxを1として、全toneの割合を出す
            var re_tones = []
            for(let t of tunes) {
              var ton = {
                frequency: t.frequency,
                level: t.volume / max.volume
              }
              re_tones.push(ton)
            }

            // 低レベルのものは除外する
            re_tones = filterVolume(re_tones, 0.3)

            // 同周波数のものを統合する
            // re_tones = integrationFreq(re_tones)

            // グラフで描画する
            var barWidth = 1
            graphContext.clearRect(0, 0, graphElement.width, graphElement.height)
            var bb = []
            for(let r of re_tones){
              var i = Math.floor(r.frequency / fsDivN)
              if(!bb[i]) {
                bb[i] = r.level
              } else {
                bb[i] += r.level
              }
              var barHeight = graphElement.height * bb[i] * 0.1
              graphContext.fillStyle = "#FEA829"
              graphContext.fillRect(i, graphElement.height-barHeight, barWidth, barHeight)
            }

            console.log(`re_tunes.length -> ${re_tones.length}`)

            tunes = []
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



// // 同周波成分を合算する
// function integrationFreq(tones) {
//   var res = []
//   for(let t of tones) {
//     let i = Math.floor(r.frequency / fsDivN)
//     if(!t[i]) {
//       t[i] = t.level
//     } else {
//       t[i] += t.level
//     }
//   }
//   for(let r,i of res) {
//
//   }
//   return res
// }

/**
 * ヴォリュームフィルタ
 * @return {[type]} [description]
 */
function filterVolume(tunes, ts) {
  return tunes.filter((t) => {
    return t.level > ts
  })
}



/**
 * 周波数から色に変換する
 * @param  {[type]} freq [description]
 * @return {[type]}      [description]
 */
function freq2color(freq) {
  var f = Math.floor(freq / 200);
  var color = "#2B2B2B";
  switch (f){
    case 0:
      color = "#3A4E7F";
      break;
    case 1:
      color = "#5167A0";
      break;
    case 2:
      color = "#23A086";
      break;
    case 3:
      color = "#2ABC9D";
      break;
    case 4:
      color = "#BF3A31";
      break;
    case 5:
      color = "#E64E42";
      break;
    case 6:
      color = "#FEA829";
      break;
  }
  return color;
}

window.addEventListener("load", main, false)
