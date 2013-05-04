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

        redirect();

    });
},

// connect to server
startSocketConnection = function(request) {
    socket = window.io.connect('http://localhost:9001');

    socket.on('connect', function () {
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

reset = function() {
    testcase = null;

    chrome.tabs.getSelected(null, function(tab) {
        chrome.tabs.sendMessage(tab.id, {action: 'reset'});
    });
};

// register actions
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.action) {
        case 'getTestcase': getTestcase(request);
        break;
        case 'sendMousePosition': sendMousePosition(request);
        break;
        case 'reset': reset();
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