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
        //console.log('0min ' + parsedInfo[0] + ': ' + parsedInfo[1] + ' ' + parsedInfo[2]);
        notifier.notify({
            title: 'You just missed '+parsedInfo[0],
            message: parsedInfo[0]+' now passing in '+busStation,
            sound: true,
            wait: false
        }, function(error, response) {
            console.log(response);
        });
    }else{
        console.log(parsedInfo[0] + ': ' + parsedInfo[1] + ' ' + parsedInfo[2] + ' ' + parsedInfo[3]);
        //console.log(parsedInfo[3] + ' ' + parsedInfo[0] + ': ' + parsedInfo[1] + ' ' + parsedInfo[2]);
        if(parsedInfo[3].match(/\d+/g) <= 10){
            notifier.notify({
                title: parsedInfo[3]+' to '+parsedInfo[0],
                message: 'at '+busStation,
                sound: true,
                wait: false
            }, function(error, response) {
                console.log(response);
            });
        }
    }
};

function reqst() {
    request(url, function(err, resp, body) {
        if (err)
            throw err;
        $ = cheerio.load(body);
        $('#smsBusResults .even').each(function() {
            parsedInfo = $(this).text().trim().replace(/\s\s+/g, ',').split(',');
            processTheInfo(parsedInfo);
        });
    });
};

reqst();
setInterval(reqst, 30000);
