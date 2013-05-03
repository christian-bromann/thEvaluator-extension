/*
 * @author Christian Bromann <contact@christian-bromann.com>
 * @description injects code into the website, send mouse coords to the background script
 */

var thEvaluatorInjected = function() {

    this.logStyleLabel = 'color:#0088cc;font-weight:bold;';
    this.logStyle      = 'color:#999999';
    this.testcase      = null;
    this.currentTask   = 0;

};

thEvaluatorInjected.prototype.redirectTo = function(url) {

    if(!url) return;

    var script = document.createElement('script');
    script.innerHTML = 'window.location.href = \'' + url + '\'';
    document.body.appendChild(script);
};

thEvaluatorInjected.prototype.log = function(msg) {
    if(typeof msg === 'string') {
        console.log('%c[thEvaluator]%c - '+msg, this.logStyleLabel, this.logStyle);
    } else {
        console.log('%c[thEvaluator]%c - ', this.logStyleLabel, this.logStyle,msg);
    }
};

thEvaluatorInjected.prototype.sendCoordToExtension = function(event) {

    if(!this.testcase) return;

    e = event || window.event;

    this.log('send coords for testcase ' + this.testcase.id + ', x = ' + e.pageX + ' y = ' + e.pageY );
    chrome.extension.sendMessage({
        action: 'sendMousePosition',
        x: e.pageX,
        y: e.pageY
    });
};

thEvaluatorInjected.prototype.printWelcomeMessage = function() {

    var el = document.createElement('div');

    el.className = 'thevaluator';
    el.innerHTML = ''+
    '<div class="te_wrapper">'+
    '  <div class="te_window">'+
    '    <header><h1>thEvaluator</h1></header>'+
    '    <section>'+
    '      <p><b>Testcase name:</b> '+this.testcase.name+'</p>'+
    '      <p><b>Task #1:</b> ' + this.currentTask.description + '</p>'+
    '      <button class="start">Start</button>'+
    '    </section>'+
    '  </div>'+
    '</div>';

    // document.body.appendChild(el);

};

thEvaluatorInjected.prototype.hitTargetElem = function(e) {
    e.preventDefault();
    e.stopPropagation();
    alert('you MADE IT');
};

// thEvaluatorInjected.prototype.isPopupOpen = function() {

// }

/**
 * ------------------- event functions -------------------------------------
 */

thEvaluatorInjected.prototype.startTestCase = function(request) {
    this.redirectTo(request.testcase.url);
};

thEvaluatorInjected.prototype.registerEventListener = function(request) {

    if(!request.testcase) return;

    this.testcase = request.testcase;
    this.log('current testcase: '+this.testcase.name);
    this.currentTask = this.testcase.tasks[request.currentTask];
    this.log('current task ('+request.currentTask+'/'+this.testcase.tasks.length+'): '+this.currentTask.description);

    this.log('register event listener for ' + document.URL);
    document.body.addEventListener('click', this.sendCoordToExtension.bind(this));

    this.targetElem = document.querySelectorAll(this.currentTask.targetElem);
    for(var i = 0; i < this.targetElem.length; ++i) {
        this.targetElem[i].addEventListener(this.currentTask.targetAction, this.hitTargetElem.bind(this));
    }
    this.log('found '+this.targetElem.length+' target elements (' + this.currentTask.targetElem + ') on this page');

    this.printWelcomeMessage();
};