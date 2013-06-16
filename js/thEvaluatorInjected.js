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
    this.taskStarted   = 0;
    this.timeout       = null;
    this.targetEvent   = null;

};

thEvaluatorInjected.prototype.log = function(msg) {
    if(typeof msg === 'string') {
        console.log('%c[thEvaluator]%c - '+msg, this.logStyleLabel, this.logStyle,document.URL);
    } else {
        console.log('%c[thEvaluator]%c - ', this.logStyleLabel, this.logStyle,msg);
    }
};

thEvaluatorInjected.prototype.sendClickCoordToExtension = function(event) {

    if(!this.testcase || !this.taskStarted || $(event.target).parents('.thevaluator').length) return;

    var e = event || window.event;

    // this.log('send click coords for testcase ' + this.testcase.id + ', x = ' + e.pageX + ' y = ' + e.pageY );
    chrome.extension.sendMessage({
        action: 'sendClickPosition',
        x: this.isAnIframe() ? e.screenX : e.pageX,
        y: this.isAnIframe() ? e.screenY : e.pageY,
        url: this.isAnIframe() ? null : document.URL,
        _task: this.currentTask._id
    });
};

thEvaluatorInjected.prototype.sendMoveCoordToExtension = function(event,fromTimeout) {

    this.currentTimeout = new Date().getTime();
    if(!this.testcase || !this.taskStarted || (this.lastTimeout && this.currentTimeout - this.lastTimeout < 100)) return;
    this.lastTimeout = this.currentTimeout;

    if(!fromTimeout) {
        clearTimeout(this.timeout);
    }

    e = event || window.event;

    // this.log('send move coords for testcase ' + this.testcase.id + ', x = ' + e.pageX + ' y = ' + e.pageY );
    chrome.extension.sendMessage({
        action: 'sendMovePosition',
        x: this.isAnIframe() ? e.screenX : e.pageX,
        y: this.isAnIframe() ? e.screenY : e.pageY,
        url: this.isAnIframe() ? null : document.URL,
        isIdle: fromTimeout,
        _task: this.currentTask._id
    });

    this.timeout = setTimeout(function() {
        this.sendMoveCoordToExtension(e,true);
    }.bind(this),110);

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

thEvaluatorInjected.prototype.showTaskLayer = function(isTimeoutVisible) {

    if(this.isAnIframe()) {
        return;
    }

    var that = this,
        replace = {
            testcaseName: this.testcase.name,
            description: this.currentTask.description,
            currentTask: this.currentTaskNr+1,
            allTasks: this.testcase.tasks.length,
            timeoutClass: !isTimeoutVisible ? ' hidden' : ''
        };

    this.loadTemplate('task',replace,function(template) {
        $('body').append(template);
        $('.thevaluator .start').click(function() {

            if(!that.widget) {
                that.widget = new thEvaluatorWidget(that.currentTaskNr+1,that.testcase.tasks.length,that.currentTask.description);
            }

            $('.thevaluator').fadeOut(function() { this.remove(); });
            that.set('taskStarted', Date.now());
            that.checkTimeout();
        });
    });

};

thEvaluatorInjected.prototype.showThanksLayer = function(isTimeoutVisible, isRequiredVisible) {

    if($('.thevaluator').length || this.isAnIframe()) {
        return;
    }

    // remove widget
    if(this.widget) this.widget.remove();
    this.removeCookies();
    this.removeListener();

    chrome.extension.sendMessage({action:'reset', fromOrigin: window.location.origin, status: isTimeoutVisible && isRequiredVisible ? 2 : 1 });
    this.set('currentTaskNr',0);
    this.set('taskStarted',0);

    var replace = {
        timeoutClass: !isTimeoutVisible ? ' hidden' : '',
        requiredClass: !isRequiredVisible ? 'hidden' : ''
    };

    this.loadTemplate('thanks',replace,function(template) {
        $('body').append(template);
        $('.thevaluator .close').click(function() {
            var feedback = $('.thevaluator textarea').val();

            if(feedback !== '') {
                chrome.extension.sendMessage({action:'feedback', text: feedback });
            }
            $('.thevaluator').fadeOut(function(){ this.remove(); });
        });
    });

};

thEvaluatorInjected.prototype.hitTargetElem = function(e) {

    if(!this.currentTask.propagate) {
        e.preventDefault();
        e.stopPropagation();
    }

    // send final click coords
    this.sendClickCoordToExtension(e);

    if(this.currentTaskNr + 1 === this.testcase.tasks.length) {
        chrome.extension.sendMessage({action:'finishedTestrun', fromOrigin: window.location.origin});
        this.showThanksLayer();
    } else {
        chrome.extension.sendMessage({action:'newTask', task: this.currentTaskNr+1, fromOrigin: window.location.origin});
        this.nextTask();
    }
};

thEvaluatorInjected.prototype.nextTask = function(isTimeoutVisible) {
    this.set('taskStarted',0);
    this.set('currentTaskNr',++this.currentTaskNr);

    this.currentTask = this.testcase.tasks[this.currentTaskNr];
    this.registerTargetEvent();
    this.log('go to next task: '+this.currentTask.description);

    if(!this.widget || this.isAnIframe()) {
        return;
    }

    this.widget.update(this.currentTaskNr+1,this.currentTask.description);
    this.showTaskLayer(isTimeoutVisible);
};

thEvaluatorInjected.prototype.set = function(key,value) {
    var host = document.location.host.split('.');
    host = '.' + (host.slice(host.length - 2,host.length).join('.'));

    this[key] = value;
    $.cookie('thevaluator_'+key, value, { domain: host, path: '/' });
};

thEvaluatorInjected.prototype.get = function(key) {
    return parseInt($.cookie('thevaluator_'+key),10);
};

thEvaluatorInjected.prototype.taskExpired = function() {
    var time = this.currentTask.maxTime * 60000;

    return this.taskStarted + time < Date.now();
};

thEvaluatorInjected.prototype.checkTimeout = function() {

    if(this.taskStarted === 0) return;

    var time = this.currentTask.maxTime * 60000;

    if(this.taskExpired()) {
        if(this.testcase.tasks.length === this.currentTaskNr + 1 || this.currentTask.required) {
            this.showThanksLayer(true,this.currentTask.required);
        } else {
            this.nextTask(true);
        }
    }

    // if no target elem was found in first place, try to find it again
    if(this.targetEvent && this.targetEvent.elem.length === 0) {
        this.registerTargetEvent();
    }

    window.setTimeout(this.checkTimeout.bind(this),1000);
};

thEvaluatorInjected.prototype.removeCookies = function() {
    this.set('currentTaskNr',0);
    this.set('taskStarted',0);
};

thEvaluatorInjected.prototype.removeListener = function() {
    // remove event listener from body
    document.body.removeEventListener('mousedown', this.sendClickCoordToExtension);
    document.body.removeEventListener('mousemove', this.sendMoveCoordToExtension);
};

thEvaluatorInjected.prototype.isAnIframe = function() {
    return window.top.location !== window.self.location;
};

thEvaluatorInjected.prototype.registerTargetEvent = function() {

    var i;

    // clear listeners
    for(i = 0; this.targetEvent && i < this.targetEvent.elem.length; ++i) {
        $(this.targetEvent.elem[i]).unbind(this.targetEvent.action);
    }

    // register listeners
    this.targetEvent = {
        elem: document.querySelectorAll(this.currentTask.targetElem),
        action: this.currentTask.targetAction
    };
    for(i = 0; i < this.targetEvent.elem.length; ++i) {
        $(this.targetEvent.elem[i]).bind(this.targetEvent.action, this.hitTargetElem.bind(this));
    }
    this.log('found '+this.targetEvent.elem.length+' target elements (' + this.currentTask.targetElem + ')');

};

/**
 * ------------------- event functions -------------------------------------
 */

thEvaluatorInjected.prototype.init = function(request, sender, sendResponse) {

    if(!this.get('currentTaskNr')) this.set('currentTaskNr',0);
    if(!this.get('taskStarted')) this.set('taskStarted',0);

    this.testcase = request.testcase;
    this.log('testcase: '+this.testcase.name);
    this.currentTaskNr = this.get('currentTaskNr');
    this.taskStarted   = this.get('taskStarted');
    this.currentTask   = this.testcase.tasks[this.currentTaskNr];
    this.log('current task ('+(this.currentTaskNr + 1)+'/'+this.testcase.tasks.length+') [status: '+(this.taskStarted?'started':'not started')+']: '+this.currentTask.description);

    // register event for clicks
    this.log('register event listener for frame');
    document.body.addEventListener(this.isAnIframe() ? 'click' : 'mousedown', this.sendClickCoordToExtension.bind(this));
    document.body.addEventListener('mousemove', this.sendMoveCoordToExtension.bind(this));

    // register target events
    this.registerTargetEvent();

    // iframes don't handle testcases or timeouts - no layers
    if(this.isAnIframe()) {
        this.taskStarted = Date.now();
        return;
    }

    // show task or widget layer
    if(this.taskStarted && this.taskExpired()) {
        this.showThanksLayer(true,true);
    } if(this.currentTaskNr === 0 && !this.taskStarted) {
        this.showTaskLayer(false);
    } else if(this.taskStarted && !this.taskExpired()) {
        this.widget = new thEvaluatorWidget(this.currentTaskNr+1,this.testcase.tasks.length,this.currentTask.description);
    }

    // check max time
    this.checkTimeout();

};

thEvaluatorInjected.prototype.getDocumentInformations = function(request, sender, sendResponse) {
    var dimension = {
        height: $(document).height(),
        width: $(document).width(),
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth
    };

    if(sendResponse && !this.isAnIframe()) sendResponse(dimension);
    return dimension;
};

thEvaluatorInjected.prototype.reset = function(request) {

    // ignore message if origin is equal
    if(request && request.fromOrigin === window.location.origin) {
        return;
    }

    $('.thevaluator').fadeOut(function() { this.remove(); });
    if(this.widget) {
        this.widget.remove();
    }

    this.testcase    = null;
    this.currentTask = null;

    this.removeCookies();
    this.removeListener();
};

thEvaluatorInjected.prototype.scroll = function(request,sender,sendResponse) {

    if(this.isAnIframe()) {
        return;
    }

    this.log('scroll to ' + request.pos.x + ', ' + request.pos.y);
    window.scrollTo(request.pos.x,request.pos.y);
    sendResponse({scrollX: window.scrollX, scrollY: window.scrollY});
};

thEvaluatorInjected.prototype.updateTask = function(request,sender,sendResponse) {

    // ignore message if origin is equal
    if(request && request.fromOrigin === window.location.origin) {
        return;
    }

    this.nextTask(false);
};

thEvaluatorInjected.prototype.finishedTestrun = function(request,sender,sendResponse) {

    // ignore message if origin is equal
    if(request && request.fromOrigin === window.location.origin) {
        return;
    }

    this.showThanksLayer();

};