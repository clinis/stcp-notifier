#!/usr/bin/env node

const program = require('commander');
var request = require('request');
var cheerio = require('cheerio');
const notifier = require('node-notifier');
var blessed = require('blessed');

var stationLines = [];
var infos = [];

// Programm argumments and commands
program
  .version('0.0.2')
  .description('Get the remaining times of the next buses at a bus stop using that bus stop code.')
  .usage('<bus stop code>. Example: stcp IPO5')
  .arguments('<busStopCode>')
  .option('-l, --line <lineNumber>','See only buses of a certain line. Example: 205')
  .action(function (busStopCode) {
     station = busStopCode.toUpperCase();
  });
program.parse(process.argv);

// Create a screen object.
var screen = blessed.screen();

// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

// Create a centered table
var box = blessed.table({
  top: 'center',
  left: 'center',
  width: '50%',
  height: '50%',
  border: {
    type: 'line'
  },
  style: {
    border: {
      fg: '#f0f0f0'
    }
  }
});

// Create a centered text area
var list = blessed.text({
  top: 'center',
  left: 'center',
  width: '50%',
  height: '50%',

  align: 'left'
});

function getTime() {
    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    return hour + ":" + min;
}

function getLinesOfStation (station) {
  var url = 'http://www.stcp.pt/pt/itinerarium/callservice.php?action=srchstoplines&stopname='+station;

  request(url, function(err, resp, body) {
    if (err){
      throw err;
    }

    var json = JSON.parse(body);

    if(json[0] !== undefined){
      for (var x = 0; x < json[0].lines.length; x++) {
        stationLines.push(json[0].lines[x].code);
      }
    }
  });
}

function processTheInfo(parsedInfo){
  if(parsedInfo[3] == null){
    //console.log(parsedInfo[0] + ': ' + parsedInfo[1] + ' ' + parsedInfo[2]);
    notifier.notify({
      title: 'You just missed '+parsedInfo[0],
      message: parsedInfo[0]+' now passing in '+station,
      sound: true,
      wait: false
    });
  }else{
    //console.log(parsedInfo[0] + ': ' + parsedInfo[1] + ' ' + parsedInfo[2] + ' ' + parsedInfo[3]);
    if(parsedInfo[3].match(/\d+/g) <= 10){
      notifier.notify({
        title: parsedInfo[3]+' to '+parsedInfo[0],
        message: 'at '+station,
        sound: true,
        wait: false
      });
    }
  }
}

function req() {
  request(url, function(err, resp, body) {
    if (err){
      throw err;
    }
    infos = [];

    $ = cheerio.load(body);

    var erros = $('.msgBox span').text();

    if ( erros.substring(0,17) == "Nao ha autocarros" ) {         // got no buses warning
      console.log("------ " +getTime()+ " ------");
      console.log("There are no buses on the next 60 minutes.");
    } else if ( erros.substring(0,18) == "Por favor, utilize" ) { // got wrong station code warning
      console.log("Please, enter a valid bus stop code.");
    } else {                                                      // got no warnings
      console.log("------ " +getTime()+ " ------");
      infos.push(["Linha","Destino","Horas","Tempo"]);
      var parsed = $('#smsBusResults .even');
      if (parsed.length > 0) {                                    // if found any time result
        parsed.each(function() {
          parsedInfo = $(this).text().trim().replace(/\s\s+/g, ',').split(',');
          infos.push(parsedInfo);
          processTheInfo(parsedInfo);
        });
        box.setData(infos);
        screen.append(box);
      } else {                                                  // if didn't found any time result
        if (stationLines.indexOf(line) > -1) {
          //console.log("There are no buses on the next 60 minutes");
          list.setText("There are no buses on the next 60 minutes");
        } else {
          //console.log("Line "+line+" doesn't pass on "+station);
          //console.log("Here are the lines that pass on "+station+":");
          //console.log(stationLines);
          list.setText("Line "+line+" doesn't pass on "+station+".\
          Here are the lines that pass on "+station+":\
          "+stationLines.toString() );
          //process.exit();
        }
        screen.append(list);
      }
    }
    screen.render();
  });
}

if(!program.args.length) {  // if no arguments passed
  program.help();           // print help
} else {                    // else, normal program
  var line = (program.line === undefined) ? 0 : program.line;
  var url = 'http://www.stcp.pt/itinerarium/soapclient.php?codigo='+station+'&linha='+line;
  getLinesOfStation(station);

  req();
  setInterval(req, 30000); // 30000ms = 30s
}
