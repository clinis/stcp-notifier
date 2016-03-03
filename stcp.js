// parsing da página de uma paragem da STCP
//
// baseado no artigo: http://blog.miguelgrinberg.com/post/easy-web-scraping-with-nodejs
//

var request = require('request');
var cheerio = require('cheerio');
const notifier = require('node-notifier');

var busStation = process.argv[2];
if(busStation == null){
    console.log('example usage: node stcp IPO5');
}

var url = 'http://www.stcp.pt/pt/itinerarium/soapclient.php?codigo='+busStation;


request(url, (function(err, resp, body) {
    if (err)
        throw err;
    $ = cheerio.load(body);
    $('#smsBusResults .even').each(function() {
        event = $(this).text().trim().replace(/\s\s+/g, ',').split(',');
        //console.log(event[0] + ': ' + event[1]);
        //console.log(event);
        if(event[3] == null){
            console.log(event[0] + ': ' + event[1] + ' ' + event[2] + ' 0');
            notifier.notify({
              title: 'You just missed '+event[0],
              message: event[0]+' now passing in '+busStation,
              sound: true,
              wait: false
            }, function(error, response) {
              console.log(response);
            });
        }else{
            console.log(event[0] + ': ' + event[1] + ' ' + event[2] + ' ' + event[3]);
            if(event[3].match(/\d/g) <= 10){
                notifier.notify({
                  title: event[3]+' to '+event[0],
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
