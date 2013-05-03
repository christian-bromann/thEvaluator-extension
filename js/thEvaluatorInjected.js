/*
 * @author Christian Bromann <contact@christian-bromann.com>
 * @description injects code into the website, send mouse coords to the background script
 */

var thEvaluatorInjected = function() {

    this.logStyleLabel = 'color:#0088cc;font-weight:bold;';
    this.logStyle      = 'color:#999999';
    this.testcase      = null;
    this.currentTask   = null;
    this.currentTaskNr = 0;

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

thEvaluatorInjected.prototype.loadTemplate = function(name,replace,cb) {
    var sourceURL = chrome.extension.getURL('templates/' + name + '.tpl'),
        xmlhttp   = new XMLHttpRequest();

    if(typeof replace === 'function') {
        cb = replace;
    }

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState==4 && xmlhttp.status==200) {
            cb(xmlhttp.responseText.replace(/%[a-zA-Z]+%/g,function(all) { return this.hasOwnProperty(all.substr(1,all.length-2)) ? this[all.substr(1,all.length-2)] : all; }.bind(replace)));
        }
    };

    this.log('load resource: ' + sourceURL);
    xmlhttp.open("GET", sourceURL, false );
    xmlhttp.send();

};

thEvaluatorInjected.prototype.printWelcomeMessage = function() {

    var replace = {
        testcaseName: this.testcase.name,
        description: this.currentTask.description,
        currentTask: this.currentTaskNr+1,
        allTasks: this.testcase.tasks.length
    };
    this.loadTemplate('welcome',replace,function(template) {
        document.body.insertAdjacentHTML('beforeend',template);
    });

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
    this.currentTask   = this.testcase.tasks[request.currentTask];
    this.currentTaskNr = request.currentTask;
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