/*
 * @author Christian Bromann <contact@christian-bromann.com>
 * @description get mouse coords from contentscript, send coords via socket.io to node server
 */

var socket   = null,
    testcase = null;

// send mouse position to server via socketIO
sendMousePosition = function(request) {

    if(!testcase) {
        return;
    }

    console.log('got coords ', request);
    socket.emit('mousePosition', {id: testcase._id, x: request.x, y: request.y });
},

getTestcase = function(request) {
    if(!socket) {
        startSocketConnection(request);
        return;
    }

    socket.emit('getTestcase', request.testCaseID, function (data) {

        console.info('received testcase: ',data);
        testcase = data;

        chrome.tabs.getSelected(null, function(tab) {
            chrome.tabs.sendMessage(tab.id, {action: 'startTestCase', testcase: data});
        });
    });
},

// connect to server
startSocketConnection = function(request) {
    socket      = window.io.connect('http://localhost:9001');
    testCase.id = request.id;

    socket.on('connect', function () {
        getTestcase(request);
    });
},

// register actions
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.action) {
        case 'getTestcase': getTestcase(request);
        break;
        case 'sendMousePosition': sendMousePosition(request);
        break;
        case 'reset': testcase = null;
        break;
        default:
            console.warn('[background.js] no action \'%s\' found!',request.action);
    }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
    if (changeInfo.status === 'complete') {
        chrome.tabs.sendMessage(tabId, {action: 'registerEventListener', testcase: testcase});
    }
});