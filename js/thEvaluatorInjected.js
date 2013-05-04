/*
 * @author Christian Bromann <contact@christian-bromann.com>
 * @description injects code into the website, send mouse coords to the background script
 */

var thEvaluatorInjected = function() {

    this.logStyleLabel = 'color:#0088cc;font-weight:bold;';
    this.logStyle      = 'color:#999999';
    this.testcase      = null;
    this.currentTask   = null;
    this.widget        = null;
    this.currentTaskNr = 0;
    this.taskStarted   = false;

};

thEvaluatorInjected.prototype.redirectTo = function(url) {
    if(!url) return;
    window.location.href = url;
};

thEvaluatorInjected.prototype.log = function(msg) {
    if(typeof msg === 'string') {
        console.log('%c[thEvaluator]%c - '+msg, this.logStyleLabel, this.logStyle);
    } else {
        console.log('%c[thEvaluator]%c - ', this.logStyleLabel, this.logStyle,msg);
    }
};

thEvaluatorInjected.prototype.sendCoordToExtension = function(event) {

    if(!this.testcase || !this.taskStarted) return;

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

thEvaluatorInjected.prototype.showTaskLayer = function() {

    var that = this,
        replace = {
            testcaseName: this.testcase.name,
            description: this.currentTask.description,
            currentTask: this.currentTaskNr+1,
            allTasks: this.testcase.tasks.length
        };

    this.loadTemplate('task',replace,function(template) {
        $('body').append(template);
        $('.thevaluator .start').click(function() {

            if(!that.widget) {
                that.widget = new thEvaluatorWidget(that.currentTaskNr+1,that.testcase.tasks.length,that.currentTask.description);
            }

            $('.thevaluator').fadeOut();
            that.set('taskStarted', true);
        });
    });

};

thEvaluatorInjected.prototype.showThanksLayer = function() {

    this.loadTemplate('thanks',function(template) {
        $('body').append(template);
        $('.thevaluator .close').click(function() {
            $('.thevaluator').fadeOut(function(){ this.remove(); });
        });
    });

};

thEvaluatorInjected.prototype.hitTargetElem = function(e) {
    e.preventDefault();
    e.stopPropagation();

    if(this.currentTaskNr + 1 === this.testcase.tasks.length) {

        // reset cookies
        this.set('currentTaskNr',0);
        this.set('taskStarted',false);

        chrome.extension.sendMessage({action:'reset'});
        this.widget.remove();
        this.showThanksLayer();

    } else {

        this.set('taskStarted',false);
        this.set('currentTaskNr',++this.currentTaskNr);

        this.currentTask = this.testcase.tasks[this.currentTaskNr];
        this.log('go to next task: '+this.currentTask.description);
        this.widget.update(this.currentTaskNr+1,this.currentTask.description);
        this.showTaskLayer();

    }
};

thEvaluatorInjected.prototype.set = function(key,value) {
    var host = document.location.host.split('.');
    host = '.' + (host.slice(host.length - 2,host.length).join('.'));

    this[key] = value;
    $.cookie('thevaluator_'+key, value, { domain: host, path: '/' });
};

thEvaluatorInjected.prototype.get = function(key) {
    var ret = $.cookie('thevaluator_'+key);

    switch(key) {
        case 'currentTaskNr': ret = parseInt(ret,10);
        break;
        case 'taskStarted': ret = ret === 'true';
        break;
    }

    return ret;
};

/**
 * ------------------- event functions -------------------------------------
 */

thEvaluatorInjected.prototype.startTestCase = function(request) {
    this.redirectTo(request.testcase.url);
};

thEvaluatorInjected.prototype.init = function(request) {

    if(!request.testcase) return;

    if(!this.get('currentTaskNr')) this.set('currentTaskNr',0);
    if(!this.get('taskStarted')) this.set('taskStarted',false);

    this.testcase = request.testcase;
    this.log('testcase: '+this.testcase.name);
    this.currentTaskNr = this.get('currentTaskNr');
    this.taskStarted   = this.get('taskStarted');
    this.currentTask   = this.testcase.tasks[this.currentTaskNr];
    this.log('current task ('+(this.currentTaskNr + 1)+'/'+this.testcase.tasks.length+') [status: '+(this.taskStarted?'started':'not started')+']: '+this.currentTask.description);

    // register event for clicks
    this.log('register event listener for ' + document.URL);
    document.body.addEventListener('click', this.sendCoordToExtension.bind(this));

    // register target events
    this.targetElem = document.querySelectorAll(this.currentTask.targetElem);
    for(var i = 0; i < this.targetElem.length; ++i) {
        this.targetElem[i].addEventListener(this.currentTask.targetAction, this.hitTargetElem.bind(this));
    }
    this.log('found '+this.targetElem.length+' target elements (' + this.currentTask.targetElem + ') on this page');

    // show task or widget layer
    if(this.currentTaskNr === 0 && !this.taskStarted) {
        this.showTaskLayer();
    }else if(this.taskStarted) {
        this.widget = new thEvaluatorWidget(this.currentTaskNr+1,this.testcase.tasks.length,this.currentTask.description);
    }

};