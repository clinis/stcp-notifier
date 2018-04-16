#!/usr/bin/env node

const program = require('commander');
const rp = require("request-promise-native");
const cheerio = require('cheerio');
const notifier = require('node-notifier');
const blessed = require('blessed');
const path = require('path');

// <<<---- TEMPLATE HTML ------>>>>>>> \\
const HTMLOffline = "<div id=\"smsBusHeader\"><div class=\"filtro\"><a href=\"http://www.stcp.pt/smsBusMicroSite/index.html\" target=\"_blank\"><img border=\"0\" src=\"/temas/stcp/imgs/logo-smsbus.jpg\" /></a><form action=\"\" id=\"frmFiltro\"><label for=\"linhasmsbus\">Filtar por linha</label><input type=\"hidden\" name=\"paragem\" value=\"aal1\" /><input type=\"hidden\" name=\"t\" value=\"smsbus\" /><select id=\"linhasmsbus\" name=\"linha\" onchange=\"javascript: frmFiltro.submit();\"><option value=\"0\">---</option><option value=\"3M\">3M </option><option value=\"4M\">4M </option><option value=\"5M\">5M </option></select></form></div><div class=\"clear\"></div></div><table id=\"smsBusResults\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><th>Linha</th><th>Hora Prevista</th><th>Tempo de Espera</th></tr><tr class=\"even\"><td><ul class=\"linhasAssoc\"><li><a target=\"_self\" class=\"linha_5m\" title=\"\" href=\"/pt/viajar/linhas/?linha=5M \">5M </a></li></ul>&nbsp;ERMESINDE(ES</td><td><i>00:58</i></td><td>1min</td></tr><tr class=\"even\"><td><ul class=\"linhasAssoc\"><li><a target=\"_self\" class=\"linha_4m\" title=\"\" href=\"/pt/viajar/linhas/?linha=4M \">4M </a></li></ul>&nbsp;AV. ALIADOS</td><td><i>01:39</i></td><td>42min</td></tr><tr class=\"even\"><td><ul class=\"linhasAssoc\"><li><a target=\"_self\" class=\"linha_3m\" title=\"\" href=\"/pt/viajar/linhas/?linha=3M \">3M </a></li></ul>&nbsp;AV. ALIADOS</td><td><i>01:50</i></td><td>53min</td></tr></table>"
const HTMLAPassar = "<div id=\"smsBusHeader\"><div class=\"filtro\"><a href=\"http://www.stcp.pt/smsBusMicroSite/index.html\" target=\"_blank\"><img border=\"0\" src=\"/temas/stcp/imgs/logo-smsbus.jpg\" /></a><form action=\"\" id=\"frmFiltro\"><label for=\"linhasmsbus\">Filtar por linha</label><input type=\"hidden\" name=\"paragem\" value=\"srpt1\" /><input type=\"hidden\" name=\"t\" value=\"smsbus\" /><select id=\"linhasmsbus\" name=\"linha\" onchange=\"javascript: frmFiltro.submit();\"><option value=\"0\">---</option><option value=\"508\">508 </option><option value=\"602\">602 </option></select></form></div><div class=\"clear\"></div></div><table id=\"smsBusResults\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><th>Linha</th><th>Hora Prevista</th><th>Tempo de Espera</th></tr><tr class=\"even\"><td><ul class=\"linhasAssoc\"><li><a target=\"_self\" class=\"linha_602\" title=\"\" href=\"/pt/viajar/linhas/?linha=602 \">602 </a></li></ul>&nbsp;CC.VIVACCI-F</td><td><i>a passar</i></td><td></td></tr><tr class=\"even\"><td><ul class=\"linhasAssoc\"><li><a target=\"_self\" class=\"linha_508\" title=\"\" href=\"/pt/viajar/linhas/?linha=508 \">508 </a></li></ul>&nbsp;FREIXIEIRO -</td><td><i>00:24</i></td><td>15min</td></tr></table>";

let runStation;

// Programm argumments and commands
// TODO: add option to set the time window to get notifications
program
    .version('0.0.4')
    .description('Get the remaining times of the next buses at a bus stop using that bus stop code.')
    .usage('<bus stop code>. Example: stcp IPO5')
    .arguments('<busStopCode>')
    .option('-l, --line <lineNumber>', 'See only buses of a certain line. Example: 205')
    .action(function (busStopCode) {
        runStation = busStopCode.toUpperCase();
    });
program.parse(process.argv);

// Create a screen object.
let screen = blessed.screen();

// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function (ch, key) {
    return process.exit(0);
});

// Create a centered table
let table = blessed.table({
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
let list = blessed.text({
    top: 'center',
    left: 'center',
    width: '50%',
    height: '50%',

    align: 'left'
});

// Create a top left text area
let reqtimetext = blessed.text({
    top: '0',
    left: '0',

    align: 'left'
});


screen.append(reqtimetext);
screen.append(table);
screen.append(list);


function getTime() {
    let date = new Date();

    let hour = date.getHours();
    hour = (hour < 10 ? '0' : '') + hour;

    let min = date.getMinutes();
    min = (min < 10 ? '0' : '') + min;

    return hour + ':' + min;
}

function print(info) {
    console.log(info.line + ": " + info.hours + " (" + info.time + ")");
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

function processResults(results) {
    let tableText = [["Linha", "Horas", "Tempo"]];

    if (results.warnings.includes('Nao ha autocarros previstos para a paragem')) {
        // console.log("não há autocarros");
        // console.log(results.warnings);
        reqtimetext.pushLine('There are no buses on the next 60 minutes.');

    } else if (results.warnings.includes('Por favor, utilize o codigo SMSBUS')) {
        // console.log("por favor utilize codigo certo");
        // console.log(results.warnings);
        list.setText('Please, enter a valid bus stop code.');
        clearInterval(intervalID);
        reqtimetext.setText('Timmer stopped. You can quit the app now.');
    } else {
        //console.log("update e console.log..........");
        reqtimetext.setText('Last request: ' + getTime());
        for (let l of results.results) {
            tableText.push([l.line, l.hours, l.time]);
            notify(l);
        }
        table.setData(tableText);
        table.setFront();
    }
    screen.render();
}

function req(station, line){
    let options = {
        uri: "http://www.stcp.pt/itinerarium/soapclient.php?codigo=" + station,
        transform: function (body) {
            return cheerio.load(body);
        }
    };

    rp(options)
        .then(function ($) {
            // Process the html

            reqtimetext.setText('Last request: ' + getTime());

            let bodyParsed = [];
            bodyParsed.warnings = [];
            bodyParsed.results = [];

            bodyParsed.warnings = $('.msgBox span').text();

            $('#smsBusResults .even').each(function () {
                bodyParsed.results.push({
                    line: $(this).find('a').text().trim(),
                    //destination: $(this).find('td:first-child').text(),    // TODO: parse destination
                    hours: $(this).find('i').text(),
                    time: $(this).find('td:last-child').text()
                })
            });

            //console.log(bodyParsed);
            processResults(bodyParsed);
        })
        .catch(function (err) {
            // Crawling failed or Cheerio choked...
            console.log("ERROR: ", err);
        });
}


if (!program.args.length) {  // if no arguments passed
    program.help();          // print help
} else {                     // else, normal program
    let runLine = (program.line === undefined) ? 0 : program.line.toUpperCase();    // TODO: add line filter

    //getLinesOfStation(station);    // TODO: add verification that line passes at station

    req(runStation, runLine);
    var intervalID = setInterval(req, 30000, runStation); // 30000ms = 30s
}
