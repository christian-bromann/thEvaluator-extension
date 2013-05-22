/*
 * @author Christian Bromann <contact@christian-bromann.com>
 * @description get mouse coords from contentscript, send coords via socket.io to node server
 */

var socket   = null,
    testcase = null,
    testrun  = null,
    screenshot = {},
    docDimension = {},
    currentTask = 0;

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

    // reset task nr
    currentTask = 0;

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
                chrome.tabs.update(tab.id, {url: testcase.url, selected: true});
                return;
            }
        }
        chrome.tabs.create({url: testcase.url});
    });

},

sanitize = function(url) {
    // remove http protocol
    url = url.replace('http://','').replace('https://','');
    // remove anything behind the TLD
    url = url.split(/[\/|?|#]/)[0];
    // split domain parts
    url = url.split(/\./);
    // return the last two parts domain.TLD
    return url.slice(url.length-2).join('.');
},

reset = function(request) {

    // save end status
    socket.emit('endTestrun', { id: testrun._id, status: request.status });

    testcase = null;
    testrun  = null;

    chrome.tabs.getSelected(null, function(tab) {
        chrome.tabs.sendMessage(tab.id, request);
    });
},

capturePage = function(opt,cb) {

    var x = opt.x,
        y = opt.y;

    console.log('take screenshot on %d , %d',x,y);

    chrome.tabs.getSelected(null, function(tab) {
        chrome.tabs.sendMessage(tab.id, {action: 'scroll', pos: {x:x,y:y}}, function(pos) {
            window.setTimeout(function() {
                chrome.tabs.captureVisibleTab(null, {
                    format: 'jpeg',
                    quality: 10
                }, function(data) {

                    if (data) {
                        var image = new Image();
                        image.src = data;

                        image.onload = function() {
                            screenshot.ctx.drawImage(image, pos.scrollX, pos.scrollY);
                            // socket.emit('screenshot', { _testrun: testrun._id, name:y===0?'0':y, imageData: data});
                            cb();
                        };
                    }

                });
            },150);
        });
    });

},

takeScreenshot = function(opt,cb) {

    var x = opt.x || 0,
        y = opt.y || 0;

    if(y < docDimension.height) {
        capturePage({x:0,y:y}, function() {
            takeScreenshot({x:0, y: y + docDimension.innerHeight }, cb);
        });
    } else {
        cb();
    }
},

screenshotExists = function(url) {

    for(var i = 0; i < testcase.screenshots.length; ++i) {
        if(testcase.screenshots[i].url === url) {
            return true;
        }
    }

    return false;

},

newTask = function(opt) {
    currentTask = opt.task;
},

closeAllUnselectedTabs = function(tab,currentURI){
    chrome.tabs.getAllInWindow(null, function(tabs){
        for (var i = 0; i < tabs.length; i++) {
            if(tab.id !== tabs[i].id && currentURI === sanitize(tabs[i].url)) {
                chrome.tabs.remove(tabs[i].id);
            }
        }
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
        case 'newTask': newTask(request);
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

                closeAllUnselectedTabs(tab,currentURI);

                // capture screen if not already happended earlier
                if(!screenshotExists(tab.url)) {

                    chrome.tabs.sendMessage(tab.id, {action: 'getDocumentInformations', testcase: testcase}, function(dimension) {

                        docDimension = dimension;

                        if(!screenshot || !screenshot.canvas) {
                            canvas = document.createElement('canvas');
                            screenshot.canvas = canvas;
                            screenshot.ctx = canvas.getContext('2d');
                        }

                        screenshot.canvas.width  = docDimension.width;
                        screenshot.canvas.height = docDimension.height;

                        takeScreenshot({x:0,y:0},function() {

                            testcase.screenshots.push({
                                url: tab.url
                            });

                            chrome.tabs.sendMessage(tab.id, {action: 'scroll', pos: {x:0,y:0}});
                            chrome.tabs.sendMessage(tab.id, {action: 'init', testcase: testcase});
                            socket.emit('screenshot', { testcase: testcase, url: tab.url, imageData: screenshot.canvas.toDataURL('image/jpeg',0.1)});

                            // clear canvas
                            screenshot.ctx.fillStyle="#ffffff";
                            screenshot.ctx.fillRect(0,0,docDimension.width,docDimension.height);

                        });

                    });

                } else {

                    chrome.tabs.sendMessage(tab.id, {action: 'init', testcase: testcase});

                }

                // save page visit for testrun
                socket.emit('pagevisit', { id: testrun._id, url: tab.url, task: testcase.tasks[currentTask]._id });

            }

        });
    }
});