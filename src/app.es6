'use strict';

var _ = require('lodash');


navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

Node.prototype.prependChild = function(e){ this.insertBefore(e,this.firstChild); }

var width = 1023;
var height = 256;

var decW = 300;
var decH = 300;

var knocks = []; // Knockの集合

var SAME_REGION = 100; // 同じ種類のノックであると定める周波数領域(Hz)

var Trigger = false; // トリガー発動


// 閾値設定
var TONE_LENGTH = 30; // knock音として認識するための音の長さ
var threshold = 100; // 小さい音を拾わないように


function initialize() {

	var frequencyElement = document.getElementById("frequency");
	var frequencyContext = frequencyElement.getContext("2d");
	var decisionElement = document.getElementById("decision");
	var decisionContext = decisionElement.getContext("2d");
	var kgraphElement = document.getElementById("knocks_graph");
	var kgraphContext = kgraphElement.getContext("2d");
	var commandElement = document.getElementById("command");
	var commandContext = commandElement.getContext("2d");

	var knocks_wrapper_DOM = document.getElementById('knocks');


	frequencyElement.width = width;
	frequencyElement.height = height;

	kgraphElement.width = width;
	kgraphElement.height = height;

	decisionElement.width = decW;
	decisionElement.height = decH;

	commandElement.width = 600;
	commandElement.height = 300;

	function prepareDrawCommend() {
		// Init TriggerKnockDraw
		commandContext.fillStyle = "#ddd";
		for(let i = 0; i < 6; i++){
			commandContext.fillRect(i*80 + i*16, 0, 80, 80);
		}
		commandContext.fillStyle = "#BEC4C8";
		commandContext.fillRect(0, 120, 180, 80);
		commandContext.fillStyle = "#ffffff";
		commandContext.font = "18px sans-serif";
		commandContext.textAlign = "left";
		commandContext.textBaseline = "bottom";
		commandContext.fillText(`トリガー未発動`, 28, 170);
	}
	prepareDrawCommend();

	var triggerTimeout;
	function drowCommand() {

		if(knocks.length <= 6) {
			clearTimeout(triggerTimeout);
			commandContext.clearRect(0, 0, commandElement.width, commandElement.height);
			prepareDrawCommend();
			// TriggerKnock
			let drowLength = knocks.length >= 6 ? 6 : knocks.length;
			for(let i = 0; i < drowLength; i++){
				commandContext.fillStyle = freq2color(knocks[knocks.length - 1 - i].ave_frequency);
				commandContext.fillRect(i*80 + i*16, 0, 80, 80);
			}
			triggerTimeout = setTimeout(function() {
				if(knocks.length < 6) {
					commandContext.clearRect(0, 0, commandElement.width, commandElement.height);
					prepareDrawCommend();
				}
			}, 2000);
		}
		// InputCommand
		if(Trigger) {
			commandContext.fillStyle = "#3B9AD9";
			commandContext.fillRect(0, 120, 180, 80);
			commandContext.fillStyle = "#ffffff";
			commandContext.font = "18px sans-serif";
			commandContext.textAlign = "left";
			commandContext.textBaseline = "bottom";
			commandContext.fillText(`トリガー発動中`, 28, 170);
		}

	}




	function drowDecision(freq) {
		decisionContext.clearRect(0, 0, decW, decH);
		decisionContext.fillStyle = freq2color(freq);
		decisionContext.fillRect(0, 0, decW, decH);

		decisionContext.fillStyle = "#ffffff";
		decisionContext.font = "20px sans-serif";
		decisionContext.textAlign = "center";
		decisionContext.textBaseline = "middle";
		decisionContext.fillText(`${Math.floor(freq)}Hz`, decW / 2, decH / 2);
		drowTones();
	}

	function drowTones() {

		var w = kgraphElement.width;
		var h = kgraphElement.height;
		var barWidth = 10;
		var barHeight;

		kgraphContext.clearRect(0, 0, w, h);
		for(var i in knocks) {
			var freq = knocks[knocks.length-1-i].ave_frequency;
			barHeight = Math.floor(h * freq / 3000);
			kgraphContext.fillStyle = freq2color(freq);
			kgraphContext.fillRect((barWidth+4) * i, h - barHeight, barWidth, barHeight);
			// kgraphContext.fillRect(50, 50, 100, 100);
		}
	}

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

	navigator.getUserMedia(
		{audio : true},
		function(stream) {
			var audioContext = new AudioContext();
			var mediastreamsource = audioContext.createMediaStreamSource(stream);
			var analyser = audioContext.createAnalyser();
			var frequencyData = new Uint8Array(analyser.frequencyBinCount);
			mediastreamsource.connect(analyser);

      var inArea = false;
      var knock = []; // 1ノック (toneの集まり)

      var animation = function(){

        analyser.getByteFrequencyData(frequencyData);

        // 特定周波数の値を設定
        var fsDivN = audioContext.sampleRate / analyser.fftSize;
        var n440Hz = Math.floor(440 / fsDivN); // A
        var n523Hz = Math.floor(523 / fsDivN); // ド
        var n587Hz = Math.floor(587 / fsDivN); // レ
        var n659Hz = Math.floor(659 / fsDivN); // ミ

        // 1音
				var tone = [];

        // 上記で設定された周波数で、かつ、上記の閾値以上の大きさの音が
        // 検出された場合に描画を行う
        frequencyData[0] = 0;
        for (var i = 1, l = frequencyData.length; i < l; i++) {
          if(frequencyData[i] > threshold) {
						// 1音の周波数成分を格納
						// frequencyData[i] = Math.pow(10.0, 5.0 + 0.05 * frequencyData[i]);
						tone.push({
							volume: frequencyData[i],
							frequency: i * fsDivN,
							n: i
						});
          }
        }


				var max_volume = 0;
				var max_frequency, min_frequency, ave_frequency;
				// 1音の成分を抽出
        if(tone.length > 0) {
					max_volume 		= _.maxBy(tone, function(t) { return t.volume; });
					max_frequency = _.maxBy(tone, function(t) { return t.frequency; });
					min_frequency = _.minBy(tone, function(t) { return t.frequency; });



					// ここで魔法の数式を使ってPitchを出す
					// let maxN = max_volume.n;
					// let freqN = maxN;
					// if(maxN > 0 && maxN < 1023) {
					// 	let dL = frequencyData[maxN - 1] / frequencyData[maxN];
					// 	let dR = frequencyData[maxN + 1] / frequencyData[maxN];
					// 	freqN += 0.5 * (dR * dR - dL * dL);
					// }
					// ave_frequency = freqN * fsDivN;


					// console.log(`最高周波数 : ${max_frequency.frequency}`);
					// console.log(`最低周波数 : ${min_frequency.frequency}`);
					// console.log(`max音量周波数 : ${max_volume.frequency}`);
					// console.log(`MagicPitch : ${ave_frequency}`);

					var tn = tone.length, tf = 0;
					for (let t of tone) {
						tf += t.frequency;
					}
					ave_frequency = tf/tn;


        } else {
					max_volume = 0;
					max_frequency = {};
					min_frequency = {};
				}

				// 音が閾値領域に入ったとき
				if(max_volume.volume > threshold) {
					inArea = true;
				}

        if(inArea) {

          // 音が閾値領域から出たとき
          if(tone.length == 0 || max_volume < threshold) {
            inArea = false;

            // 音の長さをチェックする (長い音はknockとしてカウントしない)
            if(knock.length < TONE_LENGTH && knock.length > 0) {
							var max_volume_tone 		= _.maxBy(knock, function(t) { return t.max_volume.volume; });
							var max_frequency_tone  = _.maxBy(knock, function(t) { return t.max_frequency.frequency; });
							var min_frequency_tone  = _.minBy(knock, function(t) { return t.min_frequency.frequency; });

							// 平均値を取る
							var vm = 0, tl = 0;
							for (let k of knock) {
								tl += k.ave_frequency;
							}
							var ave_frequency = tl / knock.length;

							// var ave_frequency = max_volume_tone.max_volume.frequency;




              console.log('Knock!!');
							console.log(`音の長さ : ${knock.length}`);
							console.log(`平均周波数 : ${ave_frequency}Hz`);
							console.log(`最大音量 - 周波数: ${max_volume_tone.max_volume.volume}db - ${max_volume_tone.max_volume.frequency}Hz`);
							console.log(`最大周波数 - 音量: ${max_frequency_tone.max_frequency.frequency}Hz - ${max_frequency_tone.max_frequency.volume}db`);
							console.log(`最小周波数 - 音量: ${min_frequency_tone.min_frequency.frequency}Hz - ${min_frequency_tone.min_frequency.volume}db`);

							knocks.push({
								ave_frequency: ave_frequency,
								knock: knock,
								timestamp: new Date().getTime() // msまで含める
							});

							if(Trigger) {
								commandInput();
							} else {
								checkTrigger();
							}
							drowCommand();
							drowDecision(ave_frequency);



            } else {
							console.log(knock.length);
						}

            // knockの初期化
            knock = [];
          }

          // knockデータの追加
					if(max_volume != 0) {

						knock.push({
								max_volume: max_volume,     	// 1成分
								max_frequency: max_frequency,	// 1成分
								min_frequency: min_frequency,	// 1成分
								ave_frequency: ave_frequency,
								frequencyData: tone	// 1音
						});
					}

        }

        frequencyContext.clearRect(0, 0, width, height);

        frequencyContext.beginPath();
				frequencyContext.strokeStyle = "#FFCC2F";
        frequencyContext.moveTo(0, height - frequencyData[0]);
        for (var i = 1, l = frequencyData.length; i < l; i++) {
          frequencyContext.lineTo(i, height - frequencyData[i]);
        }
        frequencyContext.stroke();

        requestAnimationFrame(animation);
      };

			animation();

		},
		function(e) {
			console.log(e);
		}
	);

	/*
		コマンドを判断するメソッド
	*/
	var commandTimeout;
	function commandInput() {
		let this_knock = knocks[knocks.length - 1].ave_frequency;

		if(Math.abs(Trigger.P1 - this_knock) < SAME_REGION) {
			console.log('---- P1コマンド ----');
			clearTimeout(commandTimeout);
			commandContext.clearRect(200, 100, 400, 300);
			commandContext.fillStyle = freq2color(this_knock);
			commandContext.fillRect(200, 100, 200, 200);
			commandTimeout = setTimeout(function() {
				commandContext.clearRect(200, 100, 400, 300);
			}, 400);

		}
		if(Math.abs(Trigger.P2 - this_knock) < SAME_REGION) {
			console.log('---- P2コマンド ----');
			clearTimeout(commandTimeout);
			commandContext.clearRect(200, 100, 400, 300);
			commandContext.fillStyle = freq2color(this_knock);
			commandContext.fillRect(400, 100, 200, 200);
			commandTimeout = setTimeout(function() {
				commandContext.clearRect(200, 100, 400, 300);
			}, 400);
		}
	}


}



/*
 トリガーを検知するメソッド
*/
function checkTrigger() {


	if(knocks.length <= 1) return; // このメソッドが呼び出されるときは最低でも1つ入っている。前のknockがないときは検知する必要ない

	// 最後のノックと、その一つ前のノックの時間差が2秒以上あれば最後を残してリセット
	if((knocks[knocks.length - 1].timestamp - knocks[knocks.length - 2].timestamp) > 2000) {
		knocks = [knocks[knocks.length - 1]];
		return;
	}

	if(knocks.length == 2) {
		// 2音間の周波数差を計算
		let diff = Math.abs(knocks[1].ave_frequency - knocks[0].ave_frequency);
		if(diff > SAME_REGION) clearKnocks(); // 同領域以上の周波数差があればトリガー失敗
		console.log(`2音間の周波数差 : ${diff}`);
		return;
	}

	if(knocks.length == 3) {
		// 3音間の周波数差を計算
		let maxK = _.maxBy(knocks, function(k) { return k.ave_frequency; });
		let minK = _.minBy(knocks, function(k) { return k.ave_frequency; });
		let diff = maxK.ave_frequency - minK.ave_frequency;
		if(diff > SAME_REGION) clearKnocks();
		console.log(`3音間の周波数差 : ${diff}`);
		return;
	}

	if(knocks.length == 4) {
		// 4音目と1~3音目の周波数帯が違うことを確認
		let k1 = knocks[0].ave_frequency;
		let k2 = knocks[1].ave_frequency;
		let k3 = knocks[2].ave_frequency;
		let k4 = knocks[3].ave_frequency;

		let aveK1_3 = (k1 + k2 + k3) / 3;
		let diff = Math.abs(aveK1_3 - k4);
		console.log(`4音と1~3音の周波数差 : ${diff}`);
		if(diff < SAME_REGION) clearKnocks();
		return;
	}

	if(knocks.length == 5) {
		// 4音目と5音目が同グループであることを確認
		let k4 = knocks[3].ave_frequency;
		let k5 = knocks[4].ave_frequency;
		let diff = Math.abs(k5 - k4);
		if(diff > SAME_REGION) clearKnocks();
		return;
	}

	if(knocks.length == 6) {
		// 5音目と6音目が同グループであることを確認
		let k5 = knocks[4].ave_frequency;
		let k6 = knocks[5].ave_frequency;
		let diff = Math.abs(k6 - k5);
		if(diff > SAME_REGION) {
			clearKnocks();
			return;
		}
	}

	// おめでとう、トリガー発動だ！！
	let k1 = knocks[0].ave_frequency;
	let k2 = knocks[1].ave_frequency;
	let k3 = knocks[2].ave_frequency;
	let k4 = knocks[3].ave_frequency;
	let k5 = knocks[4].ave_frequency;
	let k6 = knocks[5].ave_frequency;

	Trigger = {
		P1: (k1 + k2 + k3) / 3,
		P2: (k4 + k5 + k6) / 3,
		timestamp: new Date().getTime()
	}
	console.log('トリガー発動だぜっ！');

	function clearKnocks() {
		knocks = [];
	}
}



window.addEventListener("load", initialize, false);
