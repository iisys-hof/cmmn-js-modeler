'use strict';

// URL config:
var CAMUNDA_REST_URL = 'https://broton.sc-hub.de/engine-rest',
    REST_GET_PROCESS_DEFS = '/case-definition?latestVersion=true',
    REST_DEPLOY_CREATE = '/deployment/create';

// more config:
var DEPLOYMENT_SOURCE = 'case application';

// URL Parameters:
var PARAM_CASE_ID = 'caseId';

// requires:

var newDiagramXML = require('../resources/newDiagram.cmmn');
var $ = require('jquery');

var Modeler = require('cmmn-js/lib/Modeler');
//    camundaModdleDescriptor = require('camunda-cmmn-moddle/resources/camunda');

var container = $('#js-drop-zone'),
    canvas,
    renderer,
    currentProcessId,
    currentProcessKey,

    currentProcessName;


// Properties Panel:
var propertiesPanelModule = require('cmmn-js-properties-panel'),
    propertiesProviderModule = require('cmmn-js-properties-panel/lib/provider/cmmn'),
    moddleDescriptor = require('cmmn-moddle');


function init() {
    var caseId = getURLParameter(PARAM_CASE_ID);

    initEditMode();

    if(caseId) {
        console.log('caseId: '+caseId);
        getCaseXmlById(caseId);
    } else {
        console.log('no caseId');
    }
}

function initEditMode() {
    canvas = $('#js-canvas').empty();

    renderer = new Modeler({
        container: canvas,
        keyboard: {bindTo: document},
        additionalModules: [
            propertiesPanelModule,
            propertiesProviderModule
        ],
        moddleExtensions: {camunda: moddleDescriptor},
        propertiesPanel: {
            parent: '#js-properties-panel'
        }
    });
}

function createNewDiagram() {
    openDiagram(newDiagramXML);
}

function openDiagram(xml, caseId) {
    if(caseId)
        currentProcessId = caseId;
    else {
        currentProcessId = null;
        currentProcessKey = null;
    }

    renderer.importXML(xml, function (err) {

        if (err) {
            container
                .removeClass('with-diagram')
                .addClass('with-error');

            container.find('.error pre').text(err.message);

            console.error(err);
        } else {
            container
                .removeClass('with-error')
                .addClass('with-diagram');
        }
    });
}

function saveSVG(done) {
    renderer.saveSVG(done);
}

function saveDiagram(done) {

    renderer.saveXML({format: true}, function (err, xml) {
        done(err, xml);
    });
}


/*
 *  Sends an HTTP request with the given method (GET, POST, ...) to the
 *  given URL, executing the given callback on receiving a response.
 *  If a payload object is given, it will be sent as JSON.
 *  In case of an error the "error" property is set on the response,
 *  containing a message.
 */
function sendRequest(method, url, callback, payload, formData) {
    var xhr = new XMLHttpRequest();

    xhr.open(method, url, true);
    //xhr.responseType = 'json';

    xhr.onreadystatechange = function() {
        if(xhr.readyState == 4) {
          if(xhr.status == 200)  {
            callback(JSON.parse(xhr.response));
          } else {
            console.log('Camunda tab:\n'
            + 'Error ' + xhr.status + ': ' + xhr.statusText);

            var message = new Object();
            message.error = 'Error ' + xhr.status + ': ' + xhr.statusText;
            callback(message);
          }
        }
    }

    if(payload) {
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(payload));
    } else if(formData) {
        xhr.send(formData);
    } else {
        xhr.send();
    }
}

/* Camunda Calls: */

function getCaseDefinitions() {
    var camundaBox = getDialogBox();
    camundaBox.innerHTML = '<div class="table-div">'
            + '<div class="table-vertical-middle">'
                + '<span class="fa fa-spinner fa-spin"></span>'
            + '</div>'
        + '</div>';
    camundaBox = null;

    var url = CAMUNDA_REST_URL + REST_GET_PROCESS_DEFS;
    sendRequest('GET', url, showCaseDefinitions);
}

function showCaseDefinitions(data) {
    var liElement, name,
        html = $('<ul>');

    if(data && data.length && data.length > 0) {
        console.log(data);
        for(var i=0, j=data.length; i < j; i++) {
            if(data[i].name)
                name = data[i].name;
            else if(data[i].key)
                name = data[i].key + ' ('+data[i].resource+')';

            liElement = $('<li>').text(name);
            liElement.click([data[i].id, data[i].key], getCaseXml);

            html.append(liElement);
        }
    } else {
        liElement = $('<li>').text('Sorry. No case definitions to show.');
        html.append(liElement);
    }

    
    $('#camunda-bpmns').empty()
        .append($('<p>').text('Choose a Case to edit:'))
        .append(html);
}

function getCaseXmlById(id) {
    var arr = {
        data: [ id, '' ]
    };
    getCaseXml(arr);
}

function getCaseXml(event) {
    var id = event.data[0],
        key = event.data[1],
        url = CAMUNDA_REST_URL + '/case-definition/'+ id + '/xml';

    currentProcessKey = key;

    sendRequest('GET', url, useCaseXml);
}

function useCaseXml(data) {
    showOverlay(false);

    if(data && data.cmmnXml)
        openDiagram(data.cmmnXml, data.id);
    else
        console.log('Error!');
}

// deploy:

function deployCurrentBPMNAction(event) {
    event.preventDefault();
    if(event.data)
        currentProcessName = $(event.data).val();
    else if(currentProcessId)
        currentProcessName = currentProcessId;

    // get xml:
    saveDiagram(function (err, xml) {
        if(err)
            console.log(err);
        deployCurrentBPMN(err ? null : xml);
    });
}
function saveNewVersionOfCurrentBPMN(event) {
    event.preventDefault();
    if(getProcessName() !== currentProcessKey) {
        showErrorBox(getDialogBox(), '<strong>Do not change the process id</strong>'
            +'<br />when saving a new version of a workflow.<br /><br />'
            +'If you want to deploy a completely new workflow instead, please use the deploy button.');
    } else {
        currentProcessName = currentProcessKey;

        // get xml:
        saveDiagram(function (err, xml) {
            deployCurrentBPMN(err ? null : xml);
        });
    }
}
function deployCurrentBPMN(xml) {
    if(xml && xml!==null) {
        var url = CAMUNDA_REST_URL + REST_DEPLOY_CREATE,
            theForm = $('#camunda-deploy-form');

        /*
        theForm.attr('action', url);
        theForm.append(
            $('<input>')
                .attr('name', 'deployment-name')
                .val(currentProcessName)
        );
        */

        var blob = new Blob([xml], {type: 'application/octet-stream'}),
            pseudoFile = new File([xml], currentProcessName+'.cmmn', {type: 'text/xml'}),
            formData = new FormData();
        formData.append('deployment-name', currentProcessName);
        formData.append('deployment-source', DEPLOYMENT_SOURCE);
        formData.append('data', pseudoFile);

        sendRequest('POST', url, deployCurrentBPMNCallback, null, formData);

    } else {
         $('#camunda-bpmns').empty().append(
            $('<div>').addClass('table-div').append(
                $('<div>').addClass('table-vertical-middle  error-box')
                        .text('Error: Could not get XML.')
            )
        );
    }
}

function deployCurrentBPMNCallback(data) {
    console.log(data);
    if(data && data.name) {
        showSuccessBox(getDialogBox(), 'Successfully deployed process <strong>'+ data.name+'</strong>.');
    } else {
        showErrorBox(getDialogBox(), 'Error: Could not deploy process.');
    }
    
}


/* helper */

function getDialogBox() {
    return showOverlay(true);
}
function showOverlay(isVisible) {
    if(isVisible) {
        $('#overlay').css('display', 'block')
            .append(
                $('<div>').addClass('close').append(
                    $('<span>').addClass('fa fa-times-circle')
                        .click(function (e) {
                            e.stopPropagation();
                            e.preventDefault();
                            showOverlay(false);
                        })
                )
            );

        return $('#camunda-bpmns').empty().css('display', 'block');
    } else {
        $('#overlay').css('display', 'none');
        $('#camunda-bpmns').empty().css('display', 'none');
    }
}

function showErrorBox(overlayBox, html) {
    $(overlayBox).empty().append(
        $('<div>').addClass('table-div').append(
            $('<div>').addClass('table-vertical-middle error-box')
                    .html( html )
        )
    );
}

function showSuccessBox(overlayBox, html) {
     $(overlayBox).empty().append(
        $('<div>').addClass('table-div').append(
            $('<div>').addClass('table-vertical-middle success-box')
                    .html( html )
        )
    );
}

function getProcessName() {
    var root = renderer.get('canvas').getRootElement();
    if(root.id)
        return root.id;
    else
        return '';
}

/* url parameters: */

function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
}



/* file drop */

function registerFileDrop(container, callback) {

    function handleFileSelect(e) {
        e.stopPropagation();
        e.preventDefault();

        var files = e.dataTransfer.files;

        var file = files[0];

        var reader = new FileReader();

        reader.onload = function (e) {

            var xml = e.target.result;

            callback(xml);
        };

        reader.readAsText(file);
    }

    function handleDragOver(e) {
        e.stopPropagation();
        e.preventDefault();

        e.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    }

    container.get(0).addEventListener('dragover', handleDragOver, false);
    container.get(0).addEventListener('drop', handleFileSelect, false);
}


////// file drag / drop ///////////////////////

// check file api availability
if (!window.FileList || !window.FileReader) {
    window.alert(
        'Looks like you use an older browser that does not support drag and drop. ' +
        'Try using Chrome, Firefox or the Internet Explorer > 10.');
} else {
    registerFileDrop(container, openDiagram);
}

// bootstrap diagram functions

$(document).on('ready', function () {
    $('#js-create-diagram').click(function (e) {
        e.stopPropagation();
        e.preventDefault();

        createNewDiagram();
    });

     $('#js-create-diagram-btn').click(function (e) {
        e.stopPropagation();
        e.preventDefault();

        createNewDiagram();
    });

     $('#js-bpmn-from-camunda').click(function (e) {
        e.stopPropagation();
        e.preventDefault();

        showOverlay(true);
        getCaseDefinitions();
    });
     $('#js-bpmn-from-camunda-btn').click(function (e) {
        e.stopPropagation();
        e.preventDefault();

        showOverlay(true);
        getCaseDefinitions();
    });

    $('#js-open-file-dir').click(function (e) {
        e.stopPropagation();
        e.preventDefault();

        var input = $('#file-dir-input');
        input.trigger('click');
    });
    $('#js-open-file-dir-btn').click(function (e) {
        e.stopPropagation();
        e.preventDefault();

        var input = $('#file-dir-input');
        input.trigger('click');
    });


    $("#file-dir-input").change(function() {
        var file, reader, xml,
            files = this.files;

        if(files && files.length > 0) {
            file = files[0];
            reader = new FileReader();
            reader.onload = function (e) {
                xml = e.target.result;
                openDiagram(xml);
            };
            reader.readAsText(file);
        }
    });

    // Export:

    $('#js-bpmn-to-camunda-btn').click(function(e) {
        e.stopPropagation();
        e.preventDefault();

        var box = getDialogBox(),
            key = getProcessName(),
            nameInput;

        if(!key) key = '';

        $(box).append(
                $('<div>')
                .css('display', 'table').css('width', '100%').css('height', '100%').css('text-align', 'center')
                .append(
                    $('<div>')
                    .css('display', 'table-cell').css('vertical-align', 'middle')
                    .append(
                        $('<label>').text('Case Defintion Key / Deploy Name'),
                        nameInput = $('<input>').attr('value', key),
                        $('<br />'),
                        $('<a href>')
                            .click(nameInput, deployCurrentBPMNAction)
                            .attr('title', 'Deploy CMMN to Camunda')
                            .append($('<span>').addClass('fa fa-cloud-upload'))
                    )
                )
            );

    });

    var downloadLink = $('#js-download-diagram');
    var downloadSvgLink = $('#js-download-svg');

     $('.io-export a').click(function (e) {
        if (!$(this).is('.active')) {
            e.preventDefault();
            e.stopPropagation();
        }
    });

    function setEncoded(link, name, data) {
        var encodedData = encodeURIComponent(data);
        if (data) {
            link.addClass('active').attr({
                'href': 'data:application/cmmn-xml;charset=UTF-8,' + encodedData,
                'download': name
            });
        } else {

            link.removeClass('active');
        }
    }

    var _ = require('lodash');

    var exportArtifacts = _.debounce(function () {
        var saveName = 'diagram',
            processName = getProcessName();

        if(processName !== '' && processName !== 'Process_1')
            saveName = processName;

        saveSVG(function (err, svg) {
            setEncoded(downloadSvgLink,  saveName+'.svg', err ? null : svg);
        });

        saveDiagram(function (err, xml) {
            setEncoded(downloadLink,  saveName+'.cmmn', err ? null : xml);
        });

        $('#js-bpmn-to-camunda-btn').addClass('active');
        if(currentProcessKey) {
            $('#js-bpmn-save-version-btn').addClass('active').css('display', 'inline')
                .click(saveNewVersionOfCurrentBPMN);
        }
    }, 500);
    renderer.on('commandStack.changed', exportArtifacts);
});


init();