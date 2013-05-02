/*
 * @author Christian Bromann <contact@christian-bromann.com>
 * @description popup script, contains buttons actions
 */

(function() {
    $('button#startTestCase').click(function() {
        console.log('start test case');
        chrome.tabs.getSelected(null, function(tab) {
            chrome.tabs.sendMessage(tab.id, {action: "start", testCaseID: $($('input')[0]).val()});
        });
    });
})();