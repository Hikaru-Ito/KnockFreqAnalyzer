var _ = require('lodash')
import Meyda from 'meyda'
var ml = require('machine_learning')
var brain = require('brain')
import $ from 'jquery'

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext



const TRAIN_0_BUTTON_CODE = 70 // t
const TRAIN_1_BUTTON_CODE = 74
var svm = null // 分類器
var net = null // ニューラルネットワーク
var isTraing = false
var isRec = false // 教師データの録音ステータス
var train_type = 0
var train_data = { type0: [], type1:[] }

// C-SVC classificator
function trainClassificator() {
  updateStatus('SVM学習中')
  let label_type0 = Array.apply(null, Array(train_data.type0.length)).map(function () { return -1 })
  let label_type1 = Array.apply(null, Array(train_data.type1.length)).map(function () { return 1 })
  let label = label_type0.concat(label_type1)
  let data = train_data.type0.concat(train_data.type1)
  svm = new ml.SVM({
      x : data,
      y : label
  })
  let stime = new Date().getTime()
  svm.train({
      C : 1.1,
      tol : 1e-5,
      max_passes : 20,
      alpha_tol : 1e-5,
      kernel : { type: "polynomial", c: 1, d: 5}
      // {type : "polynomial", c : 1, d : 8}
  })
  updateStatus(`SVM学習完了 (${new Date().getTime() - stime}ms)`)
}

function trainNeuralNetwork() {
  if(train_data.type0.length == 0 || train_data.type1.length == 0) return
  net = new brain.NeuralNetwork()
  updateStatus('ニューラルネットワーク学習中')
  var input_data = []
  for(let x of train_data.type0) {
    var data = { input: x, output: [0] }
    input_data.push(data)
  }
  for(let y of train_data.type1) {
    var data = { input: y, output: [1] }
    input_data.push(data)
  }
  let stime = new Date().getTime()
  net.train(input_data)
  updateStatus(`ニューラルネット学習完了 (${new Date().getTime() - stime}ms)`)
}

function predict(mfcc) {
  if(!svm) return
  let stime = new Date().getTime()
  let pd = svm.predict(mfcc)
  let type = pd == -1 ? 'Type 0' : 'Type 1'
  updateStatus(`Predict : ${pd} (${new Date().getTime() - stime}ms)  --->> ${type}`)
}

function predictNetwork(mfcc) {
  if(!net) return
  let stime = new Date().getTime()
  var output = net.run(mfcc)
  let type = output < 0.5 ? 'Type 0' : 'Type 1';
  updateStatus(`Predict : ${output} (${new Date().getTime() - stime}ms)  --->> ${type}`)
}


function main() {
  var RMSGraphElement = document.getElementById("rms_graph")
	var RMSGraphContext = RMSGraphElement.getContext("2d")
  RMSGraphElement.width = 1024
  RMSGraphElement.height = 240
  var MFCCGraphElement = document.getElementById("mfcc_graph")
  var MFCCGraphContext = MFCCGraphElement.getContext("2d")
  MFCCGraphElement.width = 1024
  MFCCGraphElement.height = 240

  var RMS_THRESHOLD = 0.005
  var RMS_GRAPH_WEIGHT = 1000.0
  var MFCC_GRAPH_WEIGHT = 1.0

  navigator.getUserMedia(
		{audio : true},
		function(stream) {
			var audioContext = new AudioContext();
			var mediastreamsource = audioContext.createMediaStreamSource(stream);

      // Meyda initialize
      var md = Meyda.createMeydaAnalyzer({
	      audioContext: audioContext,
	      source: mediastreamsource,
	      bufferSize: 1024,
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

            // MFCCの次元削減
            knock.mfcc[i] = preproMFCC(knock.mfcc[i])

            // MFCCのビジュアライズ
            drawKnockMFCC(knock.mfcc[i])

            // 教師データ生成
            if(isRec) generateTrainData(knock.mfcc[i])

            // 分類器による予測
            let cftype = $('input[name=classifier]:checked').val() === 'svm'
            if(!isRec && cftype) predict(knock.mfcc[i])
            if(!isRec && !cftype) predictNetwork(knock.mfcc[i])

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
    RMSGraphContext.moveTo(0, RMSGraphElement.height / 2 + rms[0] * RMS_GRAPH_WEIGHT);
    for(let i in rms) {
      RMSGraphContext.lineTo(i, RMSGraphElement.height / 2 + rms[i] * RMS_GRAPH_WEIGHT);
    }
    RMSGraphContext.stroke();
  }

  function drawKnockMFCC(mfcc) {
    MFCCGraphContext.clearRect(0, 0, MFCCGraphElement.width, MFCCGraphElement.height);

    MFCCGraphContext.beginPath();
    MFCCGraphContext.strokeStyle = "#f1c40f";
    MFCCGraphContext.moveTo(0, MFCCGraphElement.height / 2 + mfcc[0] * MFCC_GRAPH_WEIGHT);
    for(let i in mfcc) {
      MFCCGraphContext.lineTo(i*(MFCCGraphElement.width / 28), MFCCGraphElement.height / 2 + mfcc[i] * MFCC_GRAPH_WEIGHT);
    }
    MFCCGraphContext.stroke();
  }

  function generateTrainData(data) {
    if(train_type == 0) {
      train_data.type0.push(data)
    }
    if(train_type == 1) {
      train_data.type1.push(data)
    }
  }
}

function preproMFCC(mfcc) {
  mfcc = mfcc.slice(0,10) // 10次元に削減
  console.log(mfcc)
  return mfcc
}

function trainDataToJson() {
  let data = {
    x: train_data.type0,
    y: train_data.type1
  }
  $('#json').val(JSON.stringify(data, null, "    "))
}

function KeyDownFunc(e){
  switch (e.keyCode) {
    case TRAIN_0_BUTTON_CODE:
      train_type = 0
      isRec = true
      $('#console .status').text('Type 0 Recording...')
      break;
    case TRAIN_1_BUTTON_CODE:
      train_type = 1
      isRec = true
      $('#console .status').text('Type 1 Recording...')
      break;
    default:
  }
}
function KeyUpFunc(e){
  switch (e.keyCode) {
    case TRAIN_0_BUTTON_CODE:
      isRec = false
      $('#console .status').text('Finish Recording')
      console.log(train_data)
      printInfo()
      break;
    case TRAIN_1_BUTTON_CODE:
      isRec = false
      $('#console .status').text('Finish Recording')
      console.log(train_data)
      printInfo()
      break;
    default:
  }
}
function updateStatus(message) {
  $('#console .status').text(message)
}
function printInfo() {
  // 教師データ
  $('#console .train_data_type0 span').text(train_data.type0.length)
  $('#console .train_data_type1 span').text(train_data.type1.length)
}

$('#startSVMTraing').on('click', function() {
  trainClassificator()
})
$('#startNNTraing').on('click', function() {
  trainNeuralNetwork()
})
$('#clearTraingData').on('click', function() {
  train_data.type0 = []
  train_data.type1 = []
  printInfo()
})
$('#trainDataToJson').on('click', function() {
  trainDataToJson()
})


window.addEventListener("load", main, false)
window.addEventListener("keydown", KeyDownFunc)
window.addEventListener("keyup", KeyUpFunc)
