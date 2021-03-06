L.Kosmtik.Command = L.Class.extend({

    initialize: function (map, options) {
        this._map = map;
        L.setOptions(this, options);
        L.DomEvent.addListener(document, 'keydown', this.onKeyDown, this);
        this._specs = [];
        this._listeners = {};
        this.tool = L.DomUtil.create('span', 'k-command-palette');
        var formatResult = function (spec, el) {
            var name = L.DomUtil.create('strong', '', el);
            name.innerHTML = spec.name;
            if (spec.description) name.title = spec.description;
            if (spec.keyCode) {
                var key = L.K.Command.makeLabel(spec),
                    shortcut = L.DomUtil.create('small', 'shortcut');
                shortcut.innerHTML = key;
                el.insertBefore(shortcut, el.firstChild);
            }
        };
        this.autocomplete = new L.K.Autocomplete(this.tool, {
            minChar: 0,
            placeholder: 'Type command (ctrl-shift-P)…',
            emptyMessage: 'No matching command',
            formatResult: formatResult,
            submitDelay: 100
        });
        map.toolbar.addTool(this.tool);
        this.autocomplete.on('typeahead', function (e) {
            var results = this.scoreAll(e.value).slice(0, 10);
            this.autocomplete.handleResults(results);
        }, this);
        this.autocomplete.on('selected', function (e) {
            e.choice.callback.apply(e.choice.context || this._map);
        }, this);
        this.add({
            keyCode: L.K.Keys.P,
            shiftKey: true,
            ctrlKey: true,
            callback: this.focus,
            context: this,
            name: 'Command palette: focus'
        });
    },

    _makeKey: function (e) {
        var els = [e.keyCode];
        if (e.altKey) els.push('alt');
        if (e.ctrlKey) els.push('ctrl');
        if (e.shiftKey) els.push('shift');
        return els.join('.');
    },

    add: function (specs) {
        if (typeof specs.keyCode === 'string') specs.keyCode = L.K[specs.keyCode.upper()];
        if (!specs.callback) return console.error('Missing callback in command specs', specs);
        if (specs.keyCode) this._listeners[this._makeKey(specs)] = specs;
        this._specs.push(specs);
    },

    remove: function (specs) {
        var key = this._makeKey(specs);
        delete this._listeners[key];
    },

    onKeyDown: function (e) {
        var key = this._makeKey(e),
            specs = this._listeners[key];
        if (specs) {
            if(specs.stop !== false) L.DomEvent.stop(e);
            specs.callback.apply(specs.context || this._map);
        }
    },

    each: function (method, context) {
        for (var i = 0; i < this._specs.length; i++) {
            method.call(context, this._specs[i]);
        }
        return this;
    },

    filter: function (filter, max) {
        max = max || 10;
        var specs = [], spec;
        for (var i = 0; i < this._specs.length; i++) {
            if (specs.length >= max) break;
            spec = this._specs[i];
            if (spec.name && spec.name.toString().toLowerCase().indexOf(filter) !== -1) specs.push(spec);
        }
        return specs;
    },

    score: function (spec, query) {
        query = query.toLowerCase();
        var name = (spec.name || '').toString().toLowerCase(),
            index = name.indexOf(query);
        if (index === 0) spec.score = 5;
        else if (index > 0) spec.score = 3;
        else if (name.search(query.split('').join('.*')) !== -1) spec.score = 1;
        else spec.score = 0;
    },

    scoreAll: function (query) {
        var match = [];
        this.each(function (spec) {
            this.score(spec, query);
            if (spec.score > 0) match.push(spec);
        }, this);
        return match.sort(function (a, b) {
            return b.score - a.score;
        });
    },

    focus: function () {
        this.autocomplete.input.focus();
    }

});

L.Kosmtik.Command.makeLabel = function (e) {
    var els = [];
    if (e.altKey) els.push('alt');
    if (e.ctrlKey) els.push('ctrl');
    if (e.shiftKey) els.push('shift');
    els.push(L.K.KeysLabel[e.keyCode]);
    return els.join('+');
};
