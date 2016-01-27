// parsing da página de uma paragem da STCP
//
// baseado no artigo: http://blog.miguelgrinberg.com/post/easy-web-scraping-with-nodejs
//

var request = require('request');
var cheerio = require('cheerio');

var url = 'http://www.stcp.pt/pt/itinerarium/soapclient.php?codigo=IPO5';

request(url, (function(err, resp, body) {
    if (err)
        throw err;
    $ = cheerio.load(body);
    $('#smsBusResults .even').each(function() {
        event = $(this).text().trim().replace(/\s\s+/g, ',').split(',');
        //console.log(event[0] + ': ' + event[1]);
        //console.log(event);
        console.log(event[0] + ': ' + event[1] + ' ' + event[2] + ' ' + event[3]);
    });
}))
