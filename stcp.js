#!/usr/bin/env node

const program = require('commander');
var request = require('request');
var cheerio = require('cheerio');
const notifier = require('node-notifier');

program
  .version('0.0.2')
  .description('Get the remaining times of the next buses at a bus stop using that bus stop code.')
  .usage('<bus stop code>')
  .arguments('<busStopCode>')
  .option('-l, --line <lineNumber>','See only buses of a certain line. Example: 205')
  .action(function (busStopCode) {
     station = busStopCode.toUpperCase();
  });
program.parse(process.argv);


function getTime() {
    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    return hour + ":" + min;
}

function processTheInfo(parsedInfo){
  if(parsedInfo[3] == null){
    console.log(parsedInfo[0] + ': ' + parsedInfo[1] + ' ' + parsedInfo[2]);
    notifier.notify({
      title: 'You just missed '+parsedInfo[0],
      message: parsedInfo[0]+' now passing in '+station,
      sound: true,
      wait: false
    });
  }else{
    console.log(parsedInfo[0] + ': ' + parsedInfo[1] + ' ' + parsedInfo[2] + ' ' + parsedInfo[3]);
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

    $ = cheerio.load(body);

    var erros = $('.msgBox span').text();

    if ( erros.substring(0,17) == "Nao ha autocarros" ) {
      console.log("------ " +getTime()+ " ------");
      console.log("There are no buses on the next 60 minutes.");
    } else if ( erros.substring(0,18) == "Por favor, utilize" ) {
      console.log("Please, enter a valid bus stop code.");
      process.exit()
    } else {
      console.log("------ " +getTime()+ " ------");

      var parsed = $('#smsBusResults .even');
      if (parsed.length > 0) {
        parsed.each(function() {
          parsedInfo = $(this).text().trim().replace(/\s\s+/g, ',').split(',');
          processTheInfo(parsedInfo);
        });
      } else {
        getLinesOfStation(station);
      }
    }
  });
}

function getLinesOfStation (station) {
  var stationLines = [];
  var url = 'http://www.stcp.pt/pt/itinerarium/callservice.php?action=srchstoplines&stopname='+station;

  request(url, function(err, resp, body) {
    if (err){
      throw err;
    }

    var json = JSON.parse(body);

    for (var x = 0; x < json[0].lines.length; x++) {
      stationLines.push(json[0].lines[x].code);
    }

    if (stationLines.indexOf(line) > -1) {
      console.log("There are no buses on the next 60 minutes");
    } else {
      console.log("Line "+line+" doesn't pass on "+station);
      console.log("Here are the lines that pass on "+station+":");
      console.log(stationLines);
      process.exit();
    }
  });
}

if(!program.args.length) {
  program.help();
} else {
  var line = (program.line === undefined) ? 0 : program.line;
  var url = 'http://www.stcp.pt/itinerarium/soapclient.php?codigo='+station+'&linha='+line;
  req();
  setInterval(req, 30000); // 30000
}
