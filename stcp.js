var request = require('request');
var cheerio = require('cheerio');
const notifier = require('node-notifier');

var busStation = process.argv[2];
if(busStation == null){
    console.log('example usage: node stcp IPO5');
    process.exit(1);
} else {
    busStation = busStation.toUpperCase();
}

var url = 'http://www.stcp.pt/pt/itinerarium/soapclient.php?codigo='+busStation;

function processTheInfo(parsedInfo){
    if(parsedInfo[3] == null){
        console.log(parsedInfo[0] + ': ' + parsedInfo[1] + ' ' + parsedInfo[2]);
        notifier.notify({
            title: 'You just missed '+parsedInfo[0],
            message: parsedInfo[0]+' now passing in '+busStation,
            sound: true,
            wait: false
        }, function(error, response) {
          // console.log(response);
        });
    }else{
        console.log(parsedInfo[0] + ': ' + parsedInfo[1] + ' ' + parsedInfo[2] + ' ' + parsedInfo[3]);
        if(parsedInfo[3].match(/\d+/g) <= 10){
            notifier.notify({
                title: parsedInfo[3]+' to '+parsedInfo[0],
                message: 'at '+busStation,
                sound: true,
                wait: false
            }, function(error, response) {
              // console.log(response);
            });
        }
    }
};

function getTime() {
    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    return hour + ":" + min;
}

function reqst() {
    request(url, function(err, resp, body) {
        if (err)
            throw err;
        $ = cheerio.load(body);
        console.log("------ " +getTime()+ " ------");
        $('#smsBusResults .even').each(function() {
            parsedInfo = $(this).text().trim().replace(/\s\s+/g, ',').split(',');
            processTheInfo(parsedInfo);
        });
    });
};

reqst();
setInterval(reqst, 30000);
