var thEvaluator = new thEvaluatorInjected();

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {

    if(typeof thEvaluator[request.action] === 'function') {
        thEvaluator[request.action](request);
    } else {
        thEvaluator.log('couldn\'t find action: \'' + request.action + '\'');
    }

});