#!/usr/bin/env node

const program = require('commander');
const request = require('request');
const cheerio = require('cheerio');
const notifier = require('node-notifier');
const blessed = require('blessed');
const path = require('path');

// <<<---- TEMPLATE HTML ------>>>>>>> \\
const HTMLOffline = "<div id=\"smsBusHeader\"><div class=\"filtro\"><a href=\"http://www.stcp.pt/smsBusMicroSite/index.html\" target=\"_blank\"><img border=\"0\" src=\"/temas/stcp/imgs/logo-smsbus.jpg\" /></a><form action=\"\" id=\"frmFiltro\"><label for=\"linhasmsbus\">Filtar por linha</label><input type=\"hidden\" name=\"paragem\" value=\"aal1\" /><input type=\"hidden\" name=\"t\" value=\"smsbus\" /><select id=\"linhasmsbus\" name=\"linha\" onchange=\"javascript: frmFiltro.submit();\"><option value=\"0\">---</option><option value=\"3M\">3M </option><option value=\"4M\">4M </option><option value=\"5M\">5M </option></select></form></div><div class=\"clear\"></div></div><table id=\"smsBusResults\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><th>Linha</th><th>Hora Prevista</th><th>Tempo de Espera</th></tr><tr class=\"even\"><td><ul class=\"linhasAssoc\"><li><a target=\"_self\" class=\"linha_5m\" title=\"\" href=\"/pt/viajar/linhas/?linha=5M \">5M </a></li></ul>&nbsp;ERMESINDE(ES</td><td><i>00:58</i></td><td>1min</td></tr><tr class=\"even\"><td><ul class=\"linhasAssoc\"><li><a target=\"_self\" class=\"linha_4m\" title=\"\" href=\"/pt/viajar/linhas/?linha=4M \">4M </a></li></ul>&nbsp;AV. ALIADOS</td><td><i>01:39</i></td><td>42min</td></tr><tr class=\"even\"><td><ul class=\"linhasAssoc\"><li><a target=\"_self\" class=\"linha_3m\" title=\"\" href=\"/pt/viajar/linhas/?linha=3M \">3M </a></li></ul>&nbsp;AV. ALIADOS</td><td><i>01:50</i></td><td>53min</td></tr></table>"
const HTMLAPassar = "<div id=\"smsBusHeader\"><div class=\"filtro\"><a href=\"http://www.stcp.pt/smsBusMicroSite/index.html\" target=\"_blank\"><img border=\"0\" src=\"/temas/stcp/imgs/logo-smsbus.jpg\" /></a><form action=\"\" id=\"frmFiltro\"><label for=\"linhasmsbus\">Filtar por linha</label><input type=\"hidden\" name=\"paragem\" value=\"srpt1\" /><input type=\"hidden\" name=\"t\" value=\"smsbus\" /><select id=\"linhasmsbus\" name=\"linha\" onchange=\"javascript: frmFiltro.submit();\"><option value=\"0\">---</option><option value=\"508\">508 </option><option value=\"602\">602 </option></select></form></div><div class=\"clear\"></div></div><table id=\"smsBusResults\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><th>Linha</th><th>Hora Prevista</th><th>Tempo de Espera</th></tr><tr class=\"even\"><td><ul class=\"linhasAssoc\"><li><a target=\"_self\" class=\"linha_602\" title=\"\" href=\"/pt/viajar/linhas/?linha=602 \">602 </a></li></ul>&nbsp;CC.VIVACCI-F</td><td><i>a passar</i></td><td></td></tr><tr class=\"even\"><td><ul class=\"linhasAssoc\"><li><a target=\"_self\" class=\"linha_508\" title=\"\" href=\"/pt/viajar/linhas/?linha=508 \">508 </a></li></ul>&nbsp;FREIXIEIRO -</td><td><i>00:24</i></td><td>15min</td></tr></table>";

var stationLines = [];
var runStation;

// Programm argumments and commands
program
    .version('0.0.3')
    .description('Get the remaining times of the next buses at a bus stop using that bus stop code.')
    .usage('<bus stop code>. Example: stcp IPO5')
    .arguments('<busStopCode>')
    .option('-l, --line <lineNumber>', 'See only buses of a certain line. Example: 205')
    .action(function (busStopCode) {
        runStation = busStopCode.toUpperCase();
    });
program.parse(process.argv);

// // Create a screen object.
// var screen = blessed.screen();
//
// // Quit on Escape, q, or Control-C.
// screen.key(['escape', 'q', 'C-c'], function (ch, key) {
//     return process.exit(0);
// });
//
// // Create a centered table
// var box = blessed.table({
//     top: 'center',
//     left: 'center',
//     width: '50%',
//     height: '50%',
//     border: {
//         type: 'line'
//     },
//     style: {
//         border: {
//             fg: '#f0f0f0'
//         }
//     }
// });
//
// // Create a centered text area
// var list = blessed.text({
//     top: 'center',
//     left: 'center',
//     width: '50%',
//     height: '50%',
//
//     align: 'left'
// });
//
// // Create a top left text area
// var reqtimetext = blessed.text({
//     top: '0',
//     left: '0',
//
//     align: 'left'
// });

function getTime() {
    let date = new Date();

    let hour = date.getHours();
    hour = (hour < 10 ? '0' : '') + hour;

    let min = date.getMinutes();
    min = (min < 10 ? '0' : '') + min;

    return hour + ':' + min;
}

function getLinesOfStation(station) {
    let url = 'http://www.stcp.pt/pt/itinerarium/callservice.php?action=srchstoplines&stopname=' + station;

    request(url, function (err, resp, body) {
        if (err) {
            throw err;
        }

        let json = JSON.parse(body);

        if (json[0] !== undefined) {
            for (let x = 0; x < json[0].lines.length; x++) {
                stationLines.push(json[0].lines[x].code);
            }
        }
    });
}

function processTheInfo(parsedInfo) {
    if (parsedInfo[3] == null) {
        notifier.notify({
            title: 'You just missed ' + parsedInfo[0],
            message: parsedInfo[0] + ' now passing in ' + runStation,
            sound: true,
            wait: false
        });
    } else {
        if (parsedInfo[3].match(/\d+/g) <= 10) {
            notifier.notify({
                title: parsedInfo[3] + ' to ' + parsedInfo[0],
                message: 'at ' + runStation,
                sound: true,
                wait: false
            });
        }
    }
}

function req(station, line) {
    let url = 'http://www.stcp.pt/itinerarium/soapclient.php?codigo=' + station + '&linha=' + line;

    request(url, function (err, resp, body) {
        if (err) {
            throw err;
        }
        infos = [];

        $ = cheerio.load(body);
        screen.append(reqtimetext);

        let erros = $('.msgBox span').text();

        if (erros.substring(0, 17) === 'Nao ha autocarros') {         // got no buses warning
            reqtimetext.setText('Last request: ' + getTime());
            reqtimetext.pushLine('There are no buses on the next 60 minutes.');
        } else if (erros.substring(0, 18) === 'Por favor, utilize') { // got wrong station code warning
            list.setText('Please, enter a valid bus stop code.');
            clearInterval(intervalID);
            reqtimetext.setText('Timmer stopped. You can quit the app now.');
            screen.append(list);
        } else {                                                      // got no warnings
            reqtimetext.setText('Last request: ' + getTime());

            infos.push(['Linha', 'Destino', 'Horas', 'Tempo']);
            var parsed = $('#smsBusResults .even');
            if (parsed.length > 0) {                                    // if found any time result
                parsed.each(function () {
                    parsedInfo = $(this).text().trim().replace(/\s\s+/g, ',').split(',');
                    infos.push(parsedInfo);
                    processTheInfo(parsedInfo);
                });
                box.setData(infos);
                screen.append(box);
            } else {                                                  // if didn't found any time result
                if (stationLines.indexOf(line) > -1) {
                    list.setText('There are no buses on the next 60 minutes');
                } else {
                    list.setText('Line ' + line + ' doesn\'t pass on ' + station + '.\n\n Here are the lines that pass on ' + station + ':\n ' + stationLines.toString());
                    clearInterval(intervalID);
                    reqtimetext.setText('Timmer stopped. You can quit the app now.');
                }
                screen.append(list);
            }
        }
        screen.render();
    });
}

function notify(info) {

    if (info.time === '') {
        notifier.notify({
            title: "You just missed " + info.line,
            message: info.line + " is now passing in " + runStation,
            sound: true,
            icon: path.join(__dirname, 'STCP.png'),
            timeout: 10
        })
    } else if (info.time.match(/\d+/g) <= 10) {
        notifier.notify({
            title: info.time + ' to ' + info.line,
            message: 'at ' + runStation,
            sound: true,
            icon: path.join(__dirname, 'STCP.png'),
            timeout: 5
        })
    }
}


function parseResults(body) {
    let bodyParsed = [];
    bodyParsed.results = [];

    let $ = cheerio.load(body);

    bodyParsed.warnings = $('.msgBox span').text();

    $('#smsBusResults .even').each(function () {
        bodyParsed.results.push({
            line: $(this).find('a').text().trim(),
            //destination: $(this).find('td:first-child').text(),       // TODO: parse destination
            hours: $(this).find('i').text(),
            time: $(this).find('td:last-child').text()
        })
    });

    return bodyParsed;
}

function updateInfos(time, parsed) {

    if (parsed.warnings.includes('Nao ha autocarros previstos para a paragem')) {
        console.log("não há autocarros");
        console.log(parsed.warnings);
    } else if (parsed.warnings.includes('Por favor, utilize o codigo SMSBUS')) {
        console.log("por favor utilize");
        console.log(parsed.warnings);
    } else {
        console.log("update e console.log..........");
        for (let l of parsed.results) {
            console.log(l.line + ": " + l.hours + " (" + l.time + ")");

            notify(l);
        }
    }
}

function req2(station, line) {
    let url = 'http://www.stcp.pt/itinerarium/soapclient.php?codigo=' + station + '&linha=' + line;

    request(url, function (err, resp, body) {
        if (err) {
            throw err;
        }

        let reqTime = getTime();

        updateInfos(reqTime, parseResults(body));
    });
}

if (!program.args.length) {  // if no arguments passed
    program.help();           // print help
} else {                    // else, normal program
    let runLine = (program.line === undefined) ? 0 : program.line.toUpperCase();

    //getLinesOfStation(station);

    req2(runStation, runLine);
    //var intervalID = setInterval(req, 30000); // 30000ms = 30s
}
