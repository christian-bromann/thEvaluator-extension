/*
 * @author Christian Bromann <contact@christian-bromann.com>
 * @description popup script, contains buttons actions
 */

var extrapolateUrlFromCookie = function(cookie) {
    var prefix = cookie.secure ? "https://" : "http://";
    if (cookie.domain.charAt(0) == ".")
        prefix += "www";

    return prefix + cookie.domain + cookie.path;
};

var reset = function(e) {
    $('.register').css('display','block');
    $('.overview').css('display','none');

    if(e) {
        chrome.extension.sendMessage({action: 'reset'});
            chrome.cookies.getAll({}, function(cookies) {
            for(var i=0; i<cookies.length;i++) {
                if(cookies[i].name === 'thevaluator_currentTaskNr' || cookies[i].name === 'thevaluator_taskStarted') {
                    chrome.cookies.remove({url: extrapolateUrlFromCookie(cookies[i]), name: cookies[i].name});
                }
            }
        });
    }
};

var overview = function(testcase) {

    chrome.cookies.getAll({}, function(cookies) {
        for(var i=0; i<cookies.length;i++) {
            if(cookies[i].name === 'thevaluator_currentTaskNr') {
                $('.taskdescription').html(testcase.tasks[cookies[i].value].description);
            }
        }
    });

    $('.testcasename').html(testcase.name);
    $('.register').css('display','none');
    $('.overview').css('display','block');
};

var getTestcase = function() {
    console.log('start test case');
    chrome.extension.sendMessage({action: 'getTestcase', testCaseID: $($('input')[0]).val()});
};

(function() {

    chrome.extension.sendMessage({action: 'getSessionInfo'}, function(response) {
        if(response) {
            overview(response);
        }
    });

    $('button.startTestCase').click(getTestcase);
    $('.stopTestCase').click(reset);
})();

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {

    console.log(request.action);

    switch(request.action) {
        case 'reset': reset();
        break;
        case 'init': overview();
        break;
    }

});