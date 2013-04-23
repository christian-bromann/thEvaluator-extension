/*
 * @author Christian Bromann <contact@christian-bromann.com>
 * @description get mouse coords from contentscript, send coords via socket.io to node server
 */

var socket   = null,
    testCase = {},

// send mouse position to server via socketIO
sendMousePosition = function(request) {

    if(!testCase.id) {
        return;
    }

    console.log('got coords ', request);
    socket.emit('mousePosition', {id: testCase.id, x: request.x, y: request.y });
},

// connect to server
startSocketConnection = function(request) {
    socket      = window.io.connect('http://localhost');
    testCase.id = request.id;

    socket.on('connect', function () {
        socket.emit('startTestCase', testCase.id, function (data) {
            testCase = data;
            
            chrome.tabs.getSelected(null, function(tab) {
                chrome.tabs.sendMessage(tab.id, {action: "openTestSite", url: testCase.url});
            });
        });
    });
    
};

// register actions
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.action) {
        case 'sendMousePosition': sendMousePosition(request);
        break;
        case 'startSocketConnection': startSocketConnection(request);
        break;
        default:
            console.warn('[background.js] no action \'%s\' found!',request.action);
    }
});