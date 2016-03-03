// parsing da página de uma paragem da STCP
//
// baseado no artigo: http://blog.miguelgrinberg.com/post/easy-web-scraping-with-nodejs
//

var request = require('request');
var cheerio = require('cheerio');
const notifier = require('node-notifier');

var busStation = process.argv[2];//.toUpperCase();
if(busStation == null){
    console.log('example usage: node stcp IPO5');
}

var url = 'http://www.stcp.pt/pt/itinerarium/soapclient.php?codigo='+busStation;


request(url, (function(err, resp, body) {
    if (err)
        throw err;
    $ = cheerio.load(body);
    $('#smsBusResults .even').each(function() {
        parsed = $(this).text().trim().replace(/\s\s+/g, ',').split(',');
        //console.log(parsed[0] + ': ' + parsed[1]);
        //console.log(parsed);

        if(parsed[3] == null){
            console.log(parsed[0] + ': ' + parsed[1] + ' ' + parsed[2] + ' 0');
            notifier.notify({
                title: 'You just missed '+parsed[0],
                message: parsed[0]+' now passing in '+busStation,
                sound: true,
                wait: false
            }, function(error, response) {
                console.log(response);
            });
        }else{
            console.log(parsed[0] + ': ' + parsed[1] + ' ' + parsed[2] + ' ' + parsed[3]);
            if(parsed[3].match(/\d/g) <= 10){
                notifier.notify({
                    title: parsed[3]+' to '+parsed[0],
                    message: 'at '+busStation,
                    sound: true,
                    wait: false
                }, function(error, response) {
                    console.log(response);
                });
            }
        }
    });
}))
