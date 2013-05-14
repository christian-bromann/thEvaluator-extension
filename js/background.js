/*
 * @author Christian Bromann <contact@christian-bromann.com>
 * @description get mouse coords from contentscript, send coords via socket.io to node server
 */

var socket   = null,
    testcase = null,
    testrun  = null;

// send mouse position to server via socketIO
sendClickPosition = function(request) {

    if(!testcase) {
        return;
    }

    console.log('got coords ', request);
    socket.emit('clickPosition', { _testrun: testrun._id, x: request.x, y: request.y, url: request.url, _task: request._task });
},

sendMovePosition = function(request) {

    if(!testcase) {
        return;
    }

    console.log('got coords ', request);
    socket.emit('movePosition', { _testrun: testrun._id, x: request.x, y: request.y, url: request.url, _task: request._task });
},

initTestrun = function() {

    // get geodata from user
    $.getJSON('http://smart-ip.net/geoip-json', function(data) {
        // init testrun
        socket.emit('init', {_testcase: testcase._id, geoData: data },function(data) {
            testrun = data;
        });
    });
},

getTestcase = function(request) {

    // start socket connection, if no connection is open
    if(!socket) {
        startSocketConnection(request);
        return;
    }

    // redirect if testcase was already assigned
    if(testcase) {
        redirect();
        return;
    }

    socket.emit('getTestcase', request.testCaseID, function (data) {

        console.info('received testcase: ',data);
        testcase = data;

        initTestrun();
        redirect();

    });
},

// connect to server
startSocketConnection = function(request) {
    socket = window.io.connect('http://localhost:9001');

    socket.on('connection', function () {
        getTestcase(request);
    });
},

redirect = function() {

    // switch to given url or create a new tab
    chrome.tabs.getAllInWindow(undefined, function(tabs) {
        var tab;
        for (var i = 0; i < tabs.length; ++i) {
            tab = tabs[i];
            if (tab.url && sanitize(tab.url) === sanitize(testcase.url)) {
                chrome.tabs.update(tab.id, {url: tab.url, selected: true});
                return;
            }
        }
        chrome.tabs.create({url: testcase.url});
    });

},

sanitize = function(url) {
    return url.replace('http://','').replace('www.','').split(/[\/|?|#]/)[0];
},

reset = function(request) {
    testcase = null;
    testrun  = null;

    chrome.tabs.getSelected(null, function(tab) {
        chrome.tabs.sendMessage(tab.id, request);
    });
};

// register actions
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.action) {
        case 'getTestcase': getTestcase(request);
        break;
        case 'sendClickPosition': sendClickPosition(request);
        break;
        case 'sendMovePosition': sendMovePosition(request);
        break;
        case 'reset': reset(request);
        break;
        case 'getSessionInfo': sendResponse(testcase);
        break;
        default:
            console.warn('[background.js] no action \'%s\' found!',request.action);
    }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
    if (changeInfo.status === 'complete') {

        if(!testcase) return;

        chrome.tabs.getSelected(null, function(tab) {

            var desiredURI = sanitize(testcase.url),
                currentURI = sanitize(tab.url);

            if(testcase && desiredURI === currentURI) {
                // resize browser resolution
                chrome.windows.update(-2,{left:0,top:0,width:testcase.resolution[0],height:testcase.resolution[1]});

                chrome.tabs.sendMessage(tabId, {action: 'init', testcase: testcase});
            }

        });
    }
});