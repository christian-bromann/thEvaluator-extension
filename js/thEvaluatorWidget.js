var thEvaluatorWidget = function(taskNr,allTasksNr,taskDescription) {

    this.taskNr = taskNr;
    this.allTasksNr = allTasksNr;
    this.taskDescription = taskDescription;

    this.tplURI = chrome.extension.getURL('templates/widget.tpl');
    this.show();

};

thEvaluatorWidget.prototype.show = function(tpl) {

    var that = this;

    $.ajax({
        url: this.tplURI,
        dataType: 'html',
        success: function(tpl) {
            tpl = tpl.replace(/%[a-zA-Z]+%/g, that.replaceSnippets.bind(that));
            $('body').append(tpl);

            that.el = $('.thevaluator_widget');
            that.el.fadeIn();
            that.el.hover(function() {
                var currentHeight = parseInt($(this).css('bottom'),10);
                $(this).css('bottom',(currentHeight > 20 ? 20 : ($(this).height()+20))+'px');
            },function(){});
        }
    });

};

thEvaluatorWidget.prototype.hide = function() {
    this.el.fadeOut();
};

thEvaluatorWidget.prototype.remove = function() {

    if(!this.el) return;

    this.el.fadeOut(function() {
        this.el.remove();
    }.bind(this));
};

thEvaluatorWidget.prototype.update = function(taskNr,taskDescription) {
    this.el.find('.te_taskNr').html(taskNr);
    this.el.find('.te_taskDescription').html(taskDescription);
};

thEvaluatorWidget.prototype.replaceSnippets = function(snippet) {

    var ret = snippet,
        key = snippet.substr(1,snippet.length-2);

    if(this.hasOwnProperty(key)) {
        ret = this[key];
    }

    return ret;
};