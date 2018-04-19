#!/usr/bin/env node

const program = require('commander');
const rp = require("request-promise-native");
const cheerio = require('cheerio');
const notifier = require('node-notifier');
const blessed = require('blessed');
const path = require('path');


let runStation;
let runLine;
let runMinETA;

// Programm argumments and commands
program
    .version('0.0.4')
    .description('Tempos de chegada dos próximos autocarros da STCP numa certa paragem através do código SMS BUS dessa paragem.')
    .usage('<código SMS BUS>. Por exemplo: stcp IPO5')
    .arguments('<busStopCode>')
    .option('-l, --line <lineNumber>', 'Filtrar só para uma linha. Por exemplo: 205')
    .option('-t, --eta <minutes>', 'Definir o número de minutos a partir do qual mostra notificações. Pré-definido em 10 minutos.', parseInt)
    .action(function (busStopCode) {
        runStation = busStopCode.toUpperCase();
        runLine = (program.line === undefined) ? 0 : program.line;
        runMinETA = (program.eta === undefined) ? 10 : program.eta;
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

function getLinesOfStation(station) {

    let options = {
        uri: "http://www.stcp.pt/pt/itinerarium/callservice.php?action=srchstoplines&stopname="+station,
        json: true
    };

    return rp(options)
        .then(function (resp) {
            if(resp[0] !== undefined){
                let codes = [];

                for (let x = 0; x < resp[0].lines.length; x++) {
                    codes.push(resp[0].lines[x].code);
                }

                return codes;
            }
        })
        .catch(function (err) {
            // Crawling failed or Cheerio choked...
            throw err;
        });
}

function print(info) {
    console.log(info.line + ": " + info.hours + " (" + info.time + ")");
}

function notify(info) {
    if (info.time === '') {
        notifier.notify({
            title: "Acabaste de perder o " + info.line + "!",
            message: info.line + " está agora a passar em " + runStation,
            sound: true,
            icon: path.join(__dirname, 'STCP.png'),
            timeout: 10
        })
    } else if (info.time.match(/\d+/g) <= runMinETA) {
        notifier.notify({
            title: info.time + ' para o ' + info.line,
            message: 'em ' + runStation,
            sound: true,
            icon: path.join(__dirname, 'STCP.png'),
            timeout: 5
        })
    }
}

function processResults(results) {
    let tableText = [["Linha", "Horas", "Tempo"]];

    if (results.warnings.includes('Nao ha autocarros previstos para a paragem')) {   // got no buses warning
        // console.log("não há autocarros");
        // console.log(results.warnings);
        reqtimetext.pushLine('Nao há resultados para a paragem nos próximos 60 minutos.');

    } else if (results.warnings.includes('Por favor, utilize o codigo SMSBUS')) {   // got wrong station code warning
        // console.log("por favor utilize codigo certo");
        // console.log(results.warnings);
        list.setText('Por favor, insere um código SMS BUS de paragem válido.');
        clearInterval(intervalID);
        reqtimetext.setText('Execução terminada. Podes sair.');
    } else {                                                                       // got no warnings but...
        if (results.results.length > 0){                                              // found time results
            //console.log("update e console.log..........");
            reqtimetext.setText('Última actualização: ' + getTime());
            for (let l of results.results) {
                tableText.push([l.line, l.hours, l.time]);
                notify(l);
            }
            table.setData(tableText);
            table.setFront();
        } else {                                                                      // didn't found any time result
            if (stationLines.indexOf(runLine) > -1) {
                list.setText("Nao há resultados para a paragem nos próximos 60 minutos.");
            } else {
                list.setText("A linha "+runLine+" não passa em "+runStation+".\n\nAs linhas que passam em "+runStation+" são:\n"+stationLines);
                clearInterval(intervalID);
                reqtimetext.setText("Execução terminada. Podes sair.");
            }
        }
    }
    screen.render();
}

function req(station, line){
    let options = {
        uri: "http://www.stcp.pt/itinerarium/soapclient.php?codigo=" + station +'&linha='+ line,
        transform: function (body) {
            return cheerio.load(body);
        }
    };

    rp(options)
        .then(function ($) {
            // Process the html

            reqtimetext.setText('Última actualização: ' + getTime());

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
    var stationLines = [];

    getLinesOfStation(runStation).then((stationlines) => {
        stationLines = stationlines;
    });

    req(runStation, runLine);
    var intervalID = setInterval(req, 30000, runStation, runLine); // 30000ms = 30s
}
