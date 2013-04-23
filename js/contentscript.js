/*
 * @author Christian Bromann <contact@christian-bromann.com>
 * @description injects code into the website, send mouse coords to the background script
 */

var i = 0,
    isTesting = false,
    testCaseID = '',

sendCoordToExtension = function(event) {

    if(testCaseID === '') {
        return;
    }

    ++i;
    if(i % 10 !== 0) {
        return;
    }
    e = event || window.event;

    console.log('send coords: ',{ id: testCaseID, x: e.pageX, y: e.pageY });
    chrome.extension.sendMessage({ action: 'sendMousePosition', x: e.pageX, y: e.pageY });
},
redirectTo = function(url) {
    var script = document.createElement('script');
    script.innerHTML = 'window.location.href = \'' + url + '\'';
    document.body.appendChild(script);
},
inject = function() {
    console.log('[contentscript.js] action: inject()');
    var text = document.createElement('p');
    text.innerHTML = "Hi! I'm injected text from thEvaluator extension.";
    document.body.appendChild(text);
},
login = function() {
    console.log('[contentscript.js] action: login()');
    redirectTo('http://mail.google.com/');
},
start = function(request) {
    console.log('[contentscript.js] action: start()');
    isTesting  = true;
    testCaseID = request.testCaseID;
    chrome.extension.sendMessage({ action: 'startSocketConnection', id: testCaseID });
},
openTestSite = function(request) {
    console.log('[contentscript.js] action: openTestSite()');
    redirectTo(request.url + '?starthEvaluator');
};

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.action) {
        case 'inject': inject();
        break;
        case 'login': login();
        break;
        case 'start': start(request);
        break;
        case 'openTestSite': openTestSite(request);
        break;
        default:
            console.error('[contentscript.js] couldn\'t find action: \'%s\'',request.action);
    }
});

document.onmousemove = sendCoordToExtension;