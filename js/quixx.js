// point value key
var pointValues = {
  '1x': 1,
  '2x': 3,
  '3x': 6,
  '4x': 10,
  '5x': 15,
  '6x': 21,
  '7x': 28,
  '8x': 36,
  '9x': 45,
  '10x': 55,
  '11x': 66,
  '12x': 78
};

// parse url for query params
var url = new URL(window.location.href);
var urlParams = new URLSearchParams(url.search);

// optional preset colors based on url query params
var colorA = null, colorB = null, colorC = null, colorD = null;
if (urlParams.has('wedding')) {
  var colorA = tinycolor('#8E61C8');
  var colorB = tinycolor('#F56600');
  var colorC = tinycolor('#009AE6');
  var colorD = tinycolor('#0BDA51');
}
else {
  var colorA = tinycolor('#F34C62');
  var colorB = tinycolor('#F8B453');
  var colorC = tinycolor('#22D236');
  var colorD = tinycolor('#3D6CC5');
}

var textDarkenStrength = 25;
var numColorA = tinycolor(colorA.toString()).darken(textDarkenStrength);
var numColorB = tinycolor(colorB.toString()).darken(textDarkenStrength);
var numColorC = tinycolor(colorC.toString()).darken(textDarkenStrength);
var numColorD = tinycolor(colorD.toString()).darken(textDarkenStrength);

// cell value storage for each row
var rowAValues = JSON.parse(localStorage.getItem('rowAValues')) || new Array(11).fill(false),
  rowBValues = JSON.parse(localStorage.getItem('rowBValues')) || new Array(11).fill(false),
  rowCValues = JSON.parse(localStorage.getItem('rowCValues')) || new Array(11).fill(false),
  rowDValues = JSON.parse(localStorage.getItem('rowDValues')) || new Array(11).fill(false),
  rowPValues = JSON.parse(localStorage.getItem('rowPValues')) || new Array(4).fill(false);
// the locked status for each row
var lockedA = JSON.parse(localStorage.getItem('lockedA')) || false,
  lockedB = JSON.parse(localStorage.getItem('lockedB')) || false,
  lockedC = JSON.parse(localStorage.getItem('lockedC')) || false,
  lockedD = JSON.parse(localStorage.getItem('lockedD')) || false;

var ouchAudio = new Audio('audio/ouch.mp3');
var eraseAudio = new Audio('audio/erase.wav');
var rejectAudio = new Audio('audio/reject.wav');
var wipeAudio = new Audio('audio/wipe.wav');
var lockAudio = new Audio('audio/lock.wav');
ouchAudio.playbackRate = 1.75;

function resetAudio() {
  ouchAudio.pause();
  eraseAudio.pause();
  lockAudio.pause();
  rejectAudio.pause();
  wipeAudio.pause();
  ouchAudio.currentTime = 0;
  eraseAudio.currentTime = 0;
  lockAudio.currentTime = 0;
  rejectAudio.currentTime = 0;
  wipeAudio.currentTime = 0;
}

// pitch bend web audio api function for cross sounds so they are less annoying
var audioCtx;
var source;
var request;

function getData(url) {
  source = audioCtx.createBufferSource();
  request = new XMLHttpRequest();

  request.open('GET', url, true);

  request.responseType = 'arraybuffer';

  request.onload = function() {
    var audioData = request.response;

    audioCtx.decodeAudioData(audioData, function(buffer) {
        myBuffer = buffer;
        source.buffer = myBuffer;
        source.connect(audioCtx.destination);
        source.loop = false;
      },

      function(e){"Error with decoding audio data" + e.err});
  }

  request.send();
}

function playSample(sample, rate) {
  getData(sample);
  source.playbackRate.value = rate
  source.start(0);
}

// refresh the score sheet and data
function resetSheet() {
  fadeModalContent('resetModal');
  resetAudio();
  wipeAudio.play();
  // cell value storage for each row
  rowAValues = new Array(11).fill(false);
  rowBValues = new Array(11).fill(false);
  rowCValues = new Array(11).fill(false);
  rowDValues = new Array(11).fill(false);
  rowPValues = new Array(4).fill(false);
  // the locked status for each row
  lockedA = false, lockedB = false, lockedC = false, lockedD = false;
  updateSheet();
  setTimeout(function() {
    hideModal('resetModal');
  }, 1000);
}

function saveCurrentState() {
  localStorage.setItem('rowAValues', JSON.stringify(rowAValues));
  localStorage.setItem('rowBValues', JSON.stringify(rowBValues));
  localStorage.setItem('rowCValues', JSON.stringify(rowCValues));
  localStorage.setItem('rowDValues', JSON.stringify(rowDValues));
  localStorage.setItem('rowPValues', JSON.stringify(rowPValues));
  localStorage.setItem('lockedA', JSON.stringify(lockedA));
  localStorage.setItem('lockedB', JSON.stringify(lockedB));
  localStorage.setItem('lockedC', JSON.stringify(lockedC));
  localStorage.setItem('lockedD', JSON.stringify(lockedD));
}

function rowHasCrossesAhead(row, startingNum) {
  var hasCrossesAhead = false;
  // this also checks to see if the starting number is already crossed or not
  for(var i = startingNum - 1; i < row.length; i++) {
    hasCrossesAhead = row[i] || hasCrossesAhead;
  }
  return hasCrossesAhead;
}

function toggleRowLock(row) {
  switch(row) {
    case 'A':
      lockedA = !lockedA;
      break;
    case 'B':
      lockedB = !lockedB;
      break;
    case 'C':
      lockedC = !lockedC;
      break;
    case 'D':
      lockedD = !lockedD;
      break;
    default:
      console.log('ERROR: Could not find a row to check values');
      break;
  }
}

function canBeCrossed(cell) {
  var row = cell[1];
  var num = parseInt(cell.substring(2));
  // if the row is locked this cell cannot be crossed
  switch(row) {
    case 'A':
      if(lockedA && !rowAValues[rowAValues.length - 1]) {
        return false;
      }
      break;
    case 'B':
      if(lockedB && !rowBValues[rowBValues.length - 1]) {
        return false;
      }
      break;
    case 'C':
      if(lockedC && !rowCValues[rowCValues.length - 1]) {
        return false;
      }
      break;
    case 'D':
      if(lockedD && !rowDValues[rowDValues.length - 1]) {
        return false;
      }
      break;
    default:
      console.log('ERROR: Could not find a row to check values');
      break;
  }
  // if player has 4 or leass crosses in this row they are unable to cross off 12
  if(num == 12) {
    var crossCount;
    switch(row) {
      case 'A':
        crossCount = rowAValues.filter(function(value) {
          return value;
        });
        break;
      case 'B':
        crossCount = rowBValues.filter(function(value) {
          return value;
        });
        break;
      case 'C':
        crossCount = rowCValues.filter(function(value) {
          return value;
        });
        break;
      case 'D': 
        crossCount = rowDValues.filter(function(value) {
          return value;
        });
        break;
      default:
        console.log('ERROR: Could not find a row to check values');
        break;
    }
    if(crossCount.length < 5) {
      shakeLockCopy();
      resetAudio();
      rejectAudio.play();
      return false;
    }
  }
  switch(row) {
    case 'A': return !rowHasCrossesAhead(rowAValues, num);
    case 'B': return !rowHasCrossesAhead(rowBValues, num);
    case 'C': return !rowHasCrossesAhead(rowCValues, num);
    case 'D': return !rowHasCrossesAhead(rowDValues, num);
    default:
      console.log('ERROR: Could not find a row to check values');
      return;
  }
}

function crossCellPlayAudio(rowValues, num) {
  resetAudio();
  if (rowValues[num-2]) {
    if (num == 12) {
      startConfetti();
      lockAudio.play();
      setTimeout(function() {
        stopConfetti();
      }, 1000);
    }
    else {
      playSample('audio/cross.wav', 1 + ((Math.random()) * 0.25));
    }
  }
  else {
    eraseAudio.play();
  }
}

function crossCell(cell) {
  var row = cell[1];
  var num = parseInt(cell.substring(2));
  
  switch(row) {
    case 'A':
      rowAValues[num-2] = !rowAValues[num-2];
      crossCellPlayAudio(rowAValues, num);
      break;
    case 'B':
      rowBValues[num-2] = !rowBValues[num-2];
      crossCellPlayAudio(rowBValues, num);
      break;
    case 'C':
      rowCValues[num-2] = !rowCValues[num-2];
      crossCellPlayAudio(rowCValues, num);
      break;
    case 'D':
      rowDValues[num-2] = !rowDValues[num-2];
      crossCellPlayAudio(rowDValues, num);
      break;
    default:
      console.log('ERROR: Could not find a row to check values');
      break;
  }
  jiggleScore('SCORETEXT'+row);
  if(num == 12) {
    toggleRowLock(row);
  }
}

function processClick(cell) {
  // check to see if you are able to cross off this cell
  if(canBeCrossed(cell)) {
    crossCell(cell);
    updateSheet();
    jiggleScore('SCORETEXTTOTAL');
  }
}

function processPenalty(cellNum) {
  rowPValues[cellNum] = !rowPValues[cellNum];
  resetAudio();
  if(rowPValues[cellNum]) {
    ouchAudio.play();
  }
  else {
    eraseAudio.play();
  }
  updateSheet();
  jiggleScore('SCORETEXTP');
}

function updateRowText(rowValues, row) {
  var rowCount = rowValues.filter(function(value) {
    return value;
  });
  var rowTotal = 0;
  if (rowCount.length) {
    var extraLockPoint = rowValues[rowValues.length-1] ? 1 : 0;
    document.getElementById('XTEXT' + row).textContent = rowCount.length + extraLockPoint;
    rowTotal = pointValues[(rowCount.length + extraLockPoint) + 'x'];
    document.getElementById('SCORETEXT' + row).textContent = rowTotal;
  }
  else {
    document.getElementById('XTEXT' + row).textContent = '';
    document.getElementById('SCORETEXT' + row).textContent = '';
  }
  return rowTotal;
}

function updateTextElements() {
  // update row text
  var rowATotal = updateRowText(rowAValues, 'A');
  var rowBTotal = updateRowText(rowBValues, 'B');
  var rowCTotal = updateRowText(rowCValues, 'C');
  var rowDTotal = updateRowText(rowDValues, 'D');

  // update penalty text
  var penaltyCount = rowPValues.filter(function(value) {
    return value;
  });
  if (penaltyCount.length) {
    document.getElementById('XTEXTP').textContent = penaltyCount.length;
    document.getElementById('SCORETEXTP').textContent = penaltyCount.length * 5;
  }
  else {
    document.getElementById('XTEXTP').textContent = '';
    document.getElementById('SCORETEXTP').textContent = '';
  }

  var totalScore = rowATotal + rowBTotal + rowCTotal + rowDTotal - (penaltyCount.length * 5);
  var totalScoreElem = document.getElementById('SCORETEXTTOTAL');
  if (totalScore > 0) {
    totalScoreElem.textContent = totalScore;
  }
  else if (rowATotal == 0 && rowBTotal == 0 && rowCTotal == 0 && rowDTotal == 0) {
    totalScoreElem.textContent = '';
  }
  else {
    totalScoreElem.textContent = 'sad';
  }
}

function updateRow(rowValues, locked, row) {
  rowValues.forEach(function(value, index) {
    var cellX = document.getElementById('X' + row + (index + 2));
    cellX.style.opacity = value ? 1 : 0;
    var cell = document.getElementById('C'+ row + (index + 2));
    if (!value && rowHasCrossesAhead(rowValues, (index + 2))) {
      cell.style.fill = '#000000';
      cell.style.opacity = 1;
      cell.style['mix-blend-mode'] = 'soft-light';
    }
    else {
      if (!value && locked) {
        cell.style.fill = '#000000';
        cell.style.opacity = 1;
        cell.style['mix-blend-mode'] = 'soft-light';
      }
      else {
        cell.style.fill = '#FFFFFF';
        cell.style.opacity = 0.75;
        cell.style['mix-blend-mode'] = 'normal';
      } 
    }
  });
}

function updateLockFill(rowValues, locked, row) {
  if (locked && !rowValues[10]) {
    document.getElementById('C' + row + 'LOCK1').style.fill = '#000000';
    document.getElementById('C' + row + 'LOCK2').style.fill = '#000000';
    document.getElementById('C' + row + 'LOCK1').style.opacity = 1;
    document.getElementById('C' + row + 'LOCK2').style.opacity = 1;
    document.getElementById('C' + row + 'LOCK1').style['mix-blend-mode'] = 'soft-light';
    document.getElementById('C' + row + 'LOCK2').style['mix-blend-mode'] = 'soft-light';
  }
  else {
    document.getElementById('C' + row + 'LOCK1').style.fill = '#FFFFFF';
    document.getElementById('C' + row + 'LOCK2').style.fill = '#FFFFFF';
    document.getElementById('C' + row + 'LOCK1').style.opacity = 0.75;
    document.getElementById('C' + row + 'LOCK2').style.opacity = 0.75;
    document.getElementById('C' + row + 'LOCK1').style['mix-blend-mode'] = 'normal';
    document.getElementById('C' + row + 'LOCK2').style['mix-blend-mode'] = 'normal';
  }
}

function updateSheet() {
  // good place to save considering everything is up to date before updating visuals
  saveCurrentState();

  // update each row
  updateRow(rowAValues, lockedA, 'A');
  updateRow(rowBValues, lockedB, 'B');
  updateRow(rowCValues, lockedC, 'C');
  updateRow(rowDValues, lockedD, 'D');

  // update lock crosses
  var lockACross = document.getElementById('XALOCK');
  lockACross.style.opacity = lockedA && rowAValues[10] ? 1 : 0;
  var lockBCross = document.getElementById('XBLOCK');
  lockBCross.style.opacity = lockedB && rowBValues[10] ? 1 : 0;
  var lockCCross = document.getElementById('XCLOCK');
  lockCCross.style.opacity = lockedC && rowCValues[10] ? 1 : 0;
  var lockDCross = document.getElementById('XDLOCK');
  lockDCross.style.opacity = lockedD && rowDValues[10] ? 1 : 0;

  // update lock fill
  updateLockFill(rowAValues, lockedA, 'A');
  updateLockFill(rowBValues, lockedB, 'B');
  updateLockFill(rowCValues, lockedC, 'C');
  updateLockFill(rowDValues, lockedD, 'D');

  // update penalty crosses
  rowPValues.forEach(function(penalty, index) {
    var penaltyElem = document.getElementById('P'+(index + 1));
    penaltyElem.style.opacity = penalty ? 1 : 0;
  });

  updateTextElements();
}

/* Set the row, number, and title colors */

// ROW A
document.getElementById('ROWA').style.fill = colorA.toString();
document.getElementById('TITLEQ').style.fill = colorA.toString();
document.getElementById('LAUNCHQ').style.fill = colorA.toString();
var numbers = document.getElementsByClassName('NUMBERA');
Array.from(numbers).forEach(function(num) {
  num.style.fill = colorA.toString();
});
document.getElementById('SCORETEXTA').style.fill = numColorA.toString();
document.getElementById('XTEXTA').style.fill = numColorA.toString();
for(var i = 2; i < 13; i++) {
  document.getElementById('XA' + i).style.fill = numColorA.toString();
}
document.getElementById('XALOCK').style.fill = numColorA.toString();
document.getElementById('LOCKCONNECTORA').style.fill = numColorA.toString();

// ROW B
document.getElementById('ROWB').style.fill = colorB.toString();
document.getElementById('TITLEW').style.fill = colorB.toString();
document.getElementById('LAUNCHW').style.fill = colorB.toString();
numbers = document.getElementsByClassName('NUMBERB');
Array.from(numbers).forEach(function(num) {
  num.style.fill = colorB.toString();
});
document.getElementById('SCORETEXTB').style.fill = numColorB.toString();
document.getElementById('XTEXTB').style.fill = numColorB.toString();
document.getElementById('PLUSB').style.fill = numColorB.toString();
for(var i = 2; i < 13; i++) {
  document.getElementById('XB' + i).style.fill = numColorB.toString();
}
document.getElementById('XBLOCK').style.fill = numColorB.toString();
document.getElementById('LOCKCONNECTORB').style.fill = numColorB.toString();

// GREY STUFF
document.getElementById('TITLEI').style.fill = "#bdc5cc";
document.getElementById('LAUNCHI').style.fill = "#bdc5cc";
document.getElementById('SCORETEXTP').style.opacity = 0.6;
document.getElementById('XTEXTP').style.opacity = 0.6;
document.getElementById('MINUSP').style.opacity = 0.6;

// ROW C
document.getElementById('ROWC').style.fill = colorC.toString();
document.getElementById('TITLEX1').style.fill = colorC.toString();
document.getElementById('LAUNCHX1').style.fill = colorC.toString();
numbers = document.getElementsByClassName('NUMBERC');
Array.from(numbers).forEach(function(num) {
  num.style.fill = colorC.toString();
});
document.getElementById('SCORETEXTC').style.fill = numColorC.toString();
document.getElementById('XTEXTC').style.fill = numColorC.toString();
document.getElementById('PLUSC').style.fill = numColorC.toString();
for(var i = 2; i < 13; i++) {
  document.getElementById('XC' + i).style.fill = numColorC.toString();
}
document.getElementById('XCLOCK').style.fill = numColorC.toString();
document.getElementById('LOCKCONNECTORC').style.fill = numColorC.toString();

// ROW D
document.getElementById('ROWD').style.fill = colorD.toString();
document.getElementById('TITLEX2').style.fill = colorD.toString();
document.getElementById('LAUNCHX2').style.fill = colorD.toString();
numbers = document.getElementsByClassName('NUMBERD');
Array.from(numbers).forEach(function(num) {
  num.style.fill = colorD.toString();
});
document.getElementById('SCORETEXTD').style.fill = numColorD.toString();
document.getElementById('XTEXTD').style.fill = numColorD.toString();
document.getElementById('PLUSD').style.fill = numColorD.toString();
for(var i = 2; i < 13; i++) {
  document.getElementById('XD' + i).style.fill = numColorD.toString();
}
document.getElementById('XDLOCK').style.fill = numColorD.toString();
document.getElementById('LOCKCONNECTORD').style.fill = numColorD.toString();

// hide all crosses to start
var crosses = document.getElementById('CROSSES').children;
Array.from(crosses).forEach(function(cross) {
  cross.style.opacity = 0;
});

// erase all text to start
var textElements = document.getElementsByClassName('TEXT');
Array.from(textElements).forEach(function(textElem) {
  textElem.textContent = '';
});

/* Touch Handlers */
var targetCell = null;

targetCell = document.getElementById('CA2');
targetCell.addEventListener('click', function() { processClick('CA2'); });
targetCell = document.getElementById('CA3');
targetCell.addEventListener('click', function() { processClick('CA3'); });
targetCell = document.getElementById('CA4');
targetCell.addEventListener('click', function() { processClick('CA4'); });
targetCell = document.getElementById('CA5');
targetCell.addEventListener('click', function() { processClick('CA5'); });
targetCell = document.getElementById('CA6');
targetCell.addEventListener('click', function() { processClick('CA6'); });
targetCell = document.getElementById('CA7');
targetCell.addEventListener('click', function() { processClick('CA7'); });
targetCell = document.getElementById('CA8');
targetCell.addEventListener('click', function() { processClick('CA8'); });
targetCell = document.getElementById('CA9');
targetCell.addEventListener('click', function() { processClick('CA9'); });
targetCell = document.getElementById('CA10');
targetCell.addEventListener('click', function() { processClick('CA10'); });
targetCell = document.getElementById('CA11');
targetCell.addEventListener('click', function() { processClick('CA11'); });
targetCell = document.getElementById('CA12');
targetCell.addEventListener('click', function() { processClick('CA12'); });

targetCell = document.getElementById('CB2');
targetCell.addEventListener('click', function() { processClick('CB2'); });
targetCell = document.getElementById('CB3');
targetCell.addEventListener('click', function() { processClick('CB3'); });
targetCell = document.getElementById('CB4');
targetCell.addEventListener('click', function() { processClick('CB4'); });
targetCell = document.getElementById('CB5');
targetCell.addEventListener('click', function() { processClick('CB5'); });
targetCell = document.getElementById('CB6');
targetCell.addEventListener('click', function() { processClick('CB6'); });
targetCell = document.getElementById('CB7');
targetCell.addEventListener('click', function() { processClick('CB7'); });
targetCell = document.getElementById('CB8');
targetCell.addEventListener('click', function() { processClick('CB8'); });
targetCell = document.getElementById('CB9');
targetCell.addEventListener('click', function() { processClick('CB9'); });
targetCell = document.getElementById('CB10');
targetCell.addEventListener('click', function() { processClick('CB10'); });
targetCell = document.getElementById('CB11');
targetCell.addEventListener('click', function() { processClick('CB11'); });
targetCell = document.getElementById('CB12');
targetCell.addEventListener('click', function() { processClick('CB12'); });

targetCell = document.getElementById('CC2');
targetCell.addEventListener('click', function() { processClick('CC2'); });
targetCell = document.getElementById('CC3');
targetCell.addEventListener('click', function() { processClick('CC3'); });
targetCell = document.getElementById('CC4');
targetCell.addEventListener('click', function() { processClick('CC4'); });
targetCell = document.getElementById('CC5');
targetCell.addEventListener('click', function() { processClick('CC5'); });
targetCell = document.getElementById('CC6');
targetCell.addEventListener('click', function() { processClick('CC6'); });
targetCell = document.getElementById('CC7');
targetCell.addEventListener('click', function() { processClick('CC7'); });
targetCell = document.getElementById('CC8');
targetCell.addEventListener('click', function() { processClick('CC8'); });
targetCell = document.getElementById('CC9');
targetCell.addEventListener('click', function() { processClick('CC9'); });
targetCell = document.getElementById('CC10');
targetCell.addEventListener('click', function() { processClick('CC10'); });
targetCell = document.getElementById('CC11');
targetCell.addEventListener('click', function() { processClick('CC11'); });
targetCell = document.getElementById('CC12');
targetCell.addEventListener('click', function() { processClick('CC12'); });

targetCell = document.getElementById('CD2');
targetCell.addEventListener('click', function() { processClick('CD2'); });
targetCell = document.getElementById('CD3');
targetCell.addEventListener('click', function() { processClick('CD3'); });
targetCell = document.getElementById('CD4');
targetCell.addEventListener('click', function() { processClick('CD4'); });
targetCell = document.getElementById('CD5');
targetCell.addEventListener('click', function() { processClick('CD5'); });
targetCell = document.getElementById('CD6');
targetCell.addEventListener('click', function() { processClick('CD6'); });
targetCell = document.getElementById('CD7');
targetCell.addEventListener('click', function() { processClick('CD7'); });
targetCell = document.getElementById('CD8');
targetCell.addEventListener('click', function() { processClick('CD8'); });
targetCell = document.getElementById('CD9');
targetCell.addEventListener('click', function() { processClick('CD9'); });
targetCell = document.getElementById('CD10');
targetCell.addEventListener('click', function() { processClick('CD10'); });
targetCell = document.getElementById('CD11');
targetCell.addEventListener('click', function() { processClick('CD11'); });
targetCell = document.getElementById('CD12');
targetCell.addEventListener('click', function() { processClick('CD12'); });

var targetLock = document.getElementById('LAA');
targetLock.addEventListener('click', function() {
  toggleRowLock('A');
  if (!lockedA && rowAValues[rowAValues.length-1]) {
    eraseAudio.play();
    rowAValues[rowAValues.length-1] = false;
  }
  updateSheet();
});
var targetLock = document.getElementById('LAB');
targetLock.addEventListener('click', function() {
  toggleRowLock('B');
  if (!lockedB && rowBValues[rowBValues.length-1]) {
    eraseAudio.play();
    rowBValues[rowBValues.length-1] = false;
  }
  updateSheet();
});
var targetLock = document.getElementById('LAC');
targetLock.addEventListener('click', function() {
  toggleRowLock('C');
  if (!lockedC && rowCValues[rowCValues.length-1]) {
    eraseAudio.play();
    rowCValues[rowCValues.length-1] = false;
  }
  updateSheet();
});
var targetLock = document.getElementById('LAD');
targetLock.addEventListener('click', function() {
  toggleRowLock('D');
  if (!lockedD && rowDValues[rowDValues.length-1]) {
    eraseAudio.play();
    rowDValues[rowDValues.length-1] = false;
  }
  updateSheet();
});

var penaltyCellElements = document.getElementsByClassName('PENALTYCELL');
Array.from(penaltyCellElements).forEach(function(penaltyCellElem, index) {
  penaltyCellElem.addEventListener('click', function() { processPenalty(index); });
});

var resetButton = document.getElementById('RESETBUTTON');
resetButton.addEventListener('click', function() {
  showModal('resetModal');
});

/* Animation Logic */
var modalVisible = false;

document.getElementById('resetModal').addEventListener('animationend', function() {
  document.getElementById('resetModal').classList.remove('animate__animated', 'animate__fadeOutDown', 'animate__fadeInUp', 'animate__faster');
  if(!modalVisible) {
    document.getElementById('resetModal').style.visibility = 'hidden';
  }
});

function showModal(modalId) {
  document.getElementById(modalId).style.visibility = 'visible';
  document.getElementById(modalId).classList.add('animate__animated', 'animate__fadeInUp', 'animate__faster');
  modalVisible = true;
}

function hideModal(modalId) {
  document.getElementById(modalId).classList.add('animate__animated', 'animate__fadeOutDown', 'animate__faster');
  modalVisible = false;
}

function fadeModalContent(modalId) {
  document.getElementById(modalId).getElementsByClassName('modal-contents')[0].classList.add('animate__animated', 'animate__fadeOutDown', 'animate__faster');
  setTimeout(function() {
    document.getElementById(modalId).getElementsByClassName('modal-contents')[0].classList.remove('animate__animated', 'animate__fadeOutDown', 'animate__faster');
  }, 1200);
}

document.getElementById('LOCKCOPY').addEventListener('animationend', function() {
  document.getElementById('LOCKCOPY').classList.remove('animate__animated', 'animate__headShake');
});

function shakeLockCopy() {
  document.getElementById('LOCKCOPY').classList.add('animate__animated', 'animate__headShake');
}

var titleElem = document.getElementById('TITLE');
setInterval(function () {
  titleElem.classList.add('animate__animated', 'animate__tada');
  setTimeout(function() {
    titleElem.classList.remove('animate__animated', 'animate__tada');
  }, 2000);
}, 20000);

function jiggleScore(elemId) {
  var totalElem = document.getElementById(elemId);
  totalElem.classList.remove('animate__animated', 'animate__rubberBand', 'animate__faster');
  totalElem.classList.add('animate__animated', 'animate__rubberBand', 'animate__faster');
  setTimeout(function() {
    totalElem.classList.remove('animate__animated', 'animate__rubberBand', 'animate__faster');
  }, 500);
}

var arrows = document.getElementsByClassName('ROWARROW');
Array.from(arrows).forEach(function(arrow, index) {
  setInterval(function () {
    arrow.classList.add('animate__animated', 'animate__headShake', 'animate__slower', 'animate__delay-' + (index + 1) + 's');
    setTimeout(function() {
      arrow.classList.remove('animate__animated', 'animate__headShake', 'animate__slower', 'animate__delay-' + (index + 1) + 's');
    }, 4000);
  }, 7000);
});

var launchTitleElem = document.getElementById('launchTitle');
setInterval(function () {
  launchTitleElem.classList.add('animate__animated', 'animate__tada');
  setTimeout(function() {
    launchTitleElem.classList.remove('animate__animated', 'animate__tada');
  }, 2000);
}, 5000);

/* Process visuals for loaded data before starting */
updateSheet();

/* Launch in fullscreen mode */
function launchGame() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  }
  document.getElementById('launchModal').classList.add('animate__animated', 'animate__fadeOut', 'animate__faster');
  setTimeout(function() {
    document.getElementById('launchModal').style.display = 'none';
  }, 500);
};
