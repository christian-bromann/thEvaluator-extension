/*
 * @author Christian Bromann <contact@christian-bromann.com>
 * @description popup script, contains buttons actions
 */

(function() {
    $('button#startTestCase').click(function() {
        console.log('start test case');
        chrome.extension.sendMessage({action: 'getTestcase', testCaseID: $($('input')[0]).val()});
    });
})();