/*
 * @author Christian Bromann <contact@christian-bromann.com>
 * @description injects code into the website, send mouse coords to the background script
 */

var i = 0,
    isTesting = false,
    testCaseID = '',
    testcase = null,

sendCoordToExtension = function(event) {

    if(testcase) {
        return;
    }

    e = event || window.event;

    console.log('send coords: ',{ id: testCaseID, x: e.pageX, y: e.pageY });
    chrome.extension.sendMessage({ action: 'sendMousePosition', x: e.pageX, y: e.pageY });
},
redirectTo = function(url) {
    var script = document.createElement('script');
    script.innerHTML = 'window.location.href = \'' + testcase.url + '\'';
    document.body.appendChild(script);
},
startTestCase = function(request) {
    console.log('[contentscript.js] action: startTestCase()');
    testcase = request.testcase;
    redirectTo();
},
startTestrun = function(e) {
    console.log('[contentscript.js] website %s opened',document.URL);
},
registerEventListener = function() {
    console.log('register event listener for %s', document.URL);
    document.body.addEventListener('click', sendCoordToExtension);
    document.body.addEventListener('load', startTestrun);
};

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.action) {
        case 'startTestCase': startTestCase(request);
        break;
        case 'registerEventListener': registerEventListener();
        break;
        default:
            console.error('[contentscript.js] couldn\'t find action: \'%s\'',request.action);
    }
});