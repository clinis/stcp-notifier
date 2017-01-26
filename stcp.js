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
  url = 'http://www.stcp.pt/itinerarium/soapclient.php?codigo='+station+'&linha='+program.line;

  request(url, function(err, resp, body) {
    if (err) {
      throw err;
    }

    $ = cheerio.load(body);

    console.log("------ " +getTime()+ " ------");
    $('#smsBusResults .even').each(function() {
      parsedInfo = $(this).text().trim().replace(/\s\s+/g, ',').split(',');
      processTheInfo(parsedInfo);
    });
  });
}

if(!program.args.length) {
  program.help();
} else {
  req();
  setInterval(req, 30000);
}
