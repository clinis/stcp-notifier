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

// Create a top left text area
var reqtimetext = blessed.text({
  top: '0',
  left: '0',

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
    notifier.notify({
      title: 'You just missed '+parsedInfo[0],
      message: parsedInfo[0]+' now passing in '+station,
      sound: true,
      wait: false
    });
  }else{
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
    screen.append(reqtimetext);

    var erros = $('.msgBox span').text();

    if ( erros.substring(0,17) == "Nao ha autocarros" ) {         // got no buses warning
      reqtimetext.setText("Last request: "+getTime());
      reqtimetext.pushLine("There are no buses on the next 60 minutes.");
    } else if ( erros.substring(0,18) == "Por favor, utilize" ) { // got wrong station code warning
      list.setText("Please, enter a valid bus stop code.");
      clearInterval(intervalID);
      reqtimetext.setText("Timmer stopped. You can quit the app now.");
      screen.append(list);
    } else {                                                      // got no warnings
      reqtimetext.setText("Last request: "+getTime());

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
          list.setText("There are no buses on the next 60 minutes");
        } else {
          list.setText("Line "+line+" doesn't pass on "+station+".\n\n Here are the lines that pass on "+station+":\n "+stationLines.toString() );
          clearInterval(intervalID);
          reqtimetext.setText("Timmer stopped. You can quit the app now.");
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
  var line = (program.line === undefined) ? 0 : program.line.toUpperCase();
  var url = 'http://www.stcp.pt/itinerarium/soapclient.php?codigo='+station+'&linha='+line;
  getLinesOfStation(station);

  req();
  var intervalID = setInterval(req, 30000); // 30000ms = 30s
}
