// SGPvP object - user interface methods.
// 
// This code is not loaded unless the user interface has to be shown,
// to keep things fast.
// 
// This code must run in Firefox and Google Chrome - no Greasemonkey
// calls and no chrome.* APIs here.  localStorage should not be
// accessed from here either.

// V 32

function SGPvPAction() { }
SGPvPAction.prototype.serialise = function() { return this.id; };
SGPvPAction.prototype.displayName = function() { return this.name; };
// Mind: this one is to be called in the context of the SGPvPUI element.
SGPvPAction.prototype.updateSetKeyPanelArgs = function() {
    var e = this.elements;
    e.skarg_bots.style.display = 'none';
    e.skarg_rounds.style.display = 'none';
    e.skarg_missiles.style.display = 'none';
};

function SGPvPNoAction() { }
SGPvPNoAction.prototype.serialise = function() { return ''; };
SGPvPNoAction.prototype.displayName = function() { return ''; };
SGPvPNoAction.prototype.updateSetKeyPanelArgs =
    SGPvPAction.prototype.updateSetKeyPanelArgs;

function SGPvPActionM() { }
SGPvPActionM.prototype.serialise = function(missiles) {
    return this.id + (missiles != 'n' ? ',m' : ',n');
};
SGPvPActionM.prototype.displayName = function(missiles) {
    return this.name + (missiles != 'n' ? '' : ' no missiles');
};
// Call these two from SGPvPUI context
SGPvPActionM.prototype.updateSetKeyPanelArgs = function(missiles) {
    var e = this.elements;
    e.skarg_bots.style.display = 'none';
    e.skarg_rounds.style.display = 'none';
    e.skarg_missiles.style.display = null; // default to block
    e.setkey_missiles.checked = (missiles != 'n');
};
SGPvPActionM.prototype.getArgsFromUI = function() {
    var e = this.elements;
    return [ e.setkey_missiles.checked ? 'm' : 'n' ];
};

function SGPvPActionRM() { }
SGPvPActionRM.prototype.serialise = function(rounds, missiles) {
    return this.id + ',' + (rounds || 20) +
        (missiles != 'n' ? ',m' : ',n');
};
SGPvPActionRM.prototype.displayName = function(rounds, missiles) {
    if(!rounds)
        rounds = 20;
    return this.name + (rounds == 20 ? '' : ' '+rounds) +
        (missiles != 'n' ? '' : ' no missiles');
};
// Call these two from SGPvPUI context
SGPvPActionRM.prototype.updateSetKeyPanelArgs = function(rounds, missiles) {
    var e = this.elements;
    e.skarg_bots.style.display = 'none';
    e.skarg_rounds.style.display = null; // default to block
    e.setkey_rounds.style.color = null; // default
    e.setkey_rounds.value = (rounds || 20);
    e.skarg_missiles.style.display = null; // default to block
    e.setkey_missiles.checked = (missiles != 'n');
};
SGPvPActionRM.prototype.getArgsFromUI = function() {
    var e = this.elements,
    rounds = this.getPositiveIntegerValue(e.setkey_rounds, 20);
    if(rounds)
        return [ rounds, e.setkey_missiles.checked ? 'm' : 'n' ];
    return null;
};

function SGPvPActionB() { }
SGPvPActionB.prototype.serialise = function(bots) {
    return this.id + ',' + (bots || 1);
};
SGPvPActionB.prototype.displayName = function(bots) {
    if(!bots)
        bots = 1;
    return 'Force use ' + (bots == 1 ? '1 robot' : bots + ' robots');
};
// Call these two from SGPvPUI context
SGPvPActionB.prototype.updateSetKeyPanelArgs = function(bots) {
    var e = this.elements;
    e.skarg_rounds.style.display = 'none';
    e.skarg_missiles.style.display = 'none';
    e.skarg_bots.style.display = null; // default to block
    e.setkey_bots.style.color = null; // default
    e.setkey_bots.value = (bots || 1);
};
SGPvPActionB.prototype.getArgsFromUI = function() {
    var e = this.elements,
    bots = this.getPositiveIntegerValue(e.setkey_bots);
    if(bots)
        return [ bots ];
    return null;
};

// Actions not listed here are regular SGPvPAction types.
SGPvPUI.prototype.ACTION_TYPES = {
    '': SGPvPNoAction,
    damageBuilding: SGPvPActionM,
    raidBuilding: SGPvPActionM,
    engage: SGPvPActionRM,
    raid: SGPvPActionRM,
    forceBots: SGPvPActionB
};

function SGPvPUI(sgpvp, doc) {
    this.sgpvp = sgpvp;
    this.doc = doc;
}

SGPvPUI.prototype.injectStyle = function() {
    var doc = this.doc;

    if(doc.getElementById('sg-style'))
        return;

    var head = doc.evaluate('/html/head', doc, null,
                                 XPathResult.ANY_UNORDERED_NODE_TYPE,
                                 null).singleNodeValue;
    var link = doc.createElement('link');
    link.id = 'sg-style';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = this.sgpvp.getResourceURL('ui_style');
    head.appendChild(link);
};

SGPvPUI.prototype.open = function() {
    if(this.ui_element)
        return;

    this.injectStyle();

    var doc = this.doc;
    var dummy = doc.createElement('div');
    dummy.innerHTML = this.sgpvp.getResourceText('ui_html');
    var div = dummy.removeChild(dummy.firstChild);
    doc.body.appendChild(div);
    this.setUIElement(div);
};

SGPvPUI.prototype.close = function() {
    if(this.ui_element) {
        this.ui_element.parentNode.removeChild(this.ui_element);
        delete this.ui_element;
    }
};

SGPvPUI.prototype.enableClose = function(enabled) {
    var close = this.elements.close;
    if(enabled) {
        close.disabled = false;
        close.style.borderColor = null;
        close.style.color = null;
    }
    else {
        close.disabled = true;
        close.style.borderColor = 'rgb(0,0,28)';
        close.style.color = 'rgb(56,56,84)';
    }
};

SGPvPUI.prototype.enableCloseIfProper = function() {
    var enabled = this.targetingValid && this.armourValid && this.rtidValid;
    this.enableClose(enabled);
};

// Parse QL and include/exclude lists. Store if they are valid,
// inhibit close if they are not.
SGPvPUI.prototype.targetingDataInputHandler = function() {
    this.targetingValid = false;

    var qo = this.parseQL(this.elements.ql.value);
    if(qo) {
        this.targetingValid = true;
        this.elements.ql.style.removeProperty('color');
        var settings = {
            ql: qo.ql,
            targeting: {
                ql: qo.parsed,
                include: this.parseOverrideList(this.elements.inc.value),
                exclude: this.parseOverrideList(this.elements.exc.value)
            }
        };
        this.sgpvp.saveSettings(settings);
    }
    else
        this.elements.ql.style.color = 'red';
    this.enableCloseIfProper();
};

SGPvPUI.prototype.DIGITS_RX = /^\s*[0-9]+\s*$/;
SGPvPUI.prototype.EMPTY_RX = /^\s*$/;

// Gets the value of the given element. If it's a positive integer,
// return it. If it isn't, turn the element red and return null. If
// max is supplied, then value also must be <= max.  If allowEmpty is
// true, then an empty string will return -1 and the element
// won't turn red.
SGPvPUI.prototype.getPositiveIntegerValue = function(element, max, allowEmpty) {
    var value = element.value;
    if(this.DIGITS_RX.test(value)) {
        var nvalue = parseInt(value);
        if(nvalue > 0 && (!max || nvalue <= max)) {
            element.style.color = null;
            return nvalue;
        }
    }
    else if(allowEmpty && this.EMPTY_RX.test(value)) {
        element.style.color = null;
        return -1;
    }

    // Still here? Problem.
    element.style.color = 'red';
    return null;
};

SGPvPUI.prototype.armourInputHandler = function() {
    var points = this.getPositiveIntegerValue(this.elements.arm),
    level = this.getPositiveIntegerValue(this.elements.lvl, 6);
    if(points && level) {
        this.armourValid = true;
        this.sgpvp.saveSettings({ armour: {points:points, level:level} });
    }
    else
        this.armourValid = false;
    this.enableCloseIfProper();
};

SGPvPUI.prototype.rtidInputHandler = function() {
    var rtid = this.getPositiveIntegerValue(this.elements.rid, null, true);
    if(rtid) {
        this.rtidValid = true;
        if(rtid > 0)
            this.sgpvp.saveSettings({ rtid: rtid });
        // else XXX - we should have a deleteSettings method...
    }
    else
        this.rtidValid = false;
    this.enableCloseIfProper();
};

SGPvPUI.prototype.switchToPanel = function(panel) {
    var e = this.elements;
    switch(panel) {
    case 'targeting':
        e.s2targeting.className = 'active';
        e.s2keys.className = '';
        e.targeting.style.display = 'block';
        e.keybindings.style.display = 'none';
        e.setkey.style.display = 'none';
        this.enableCloseIfProper();
        break;
    case 'bindings':
        e.s2targeting.className = '';
        e.s2keys.className = 'active';
        e.targeting.style.display = 'none';
        e.keybindings.style.display = 'block';
        e.setkey.style.display = 'none';
        this.enableClose(true);
    }
};

// Build our catalogue of available actions. We fetch most of this
// from HTML, cause it's already there so we may as well use it.
// However, there are a few actions with parameters; those we
// deal with exceptionally here.

SGPvPUI.prototype.initActionCatalogue = function() {
    this.catalogue = new Object();

    var option, doc = this.doc, e = this.elements,
    xpr = doc.evaluate('.//option', e.setkey_select, null,
                       XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
    while((option = xpr.iterateNext())) {
        var id = option.value,
        type = this.ACTION_TYPES[id] || SGPvPAction,
        action = new type();
        action.id = id;
        action.name = option.textContent;
        this.catalogue[id] = action;
    }
};

SGPvPUI.prototype.parseAction = function(action_str) {
    // XXX - this will be removed in a few versions
    action_str = this.sgpvp.fixActionString(action_str);

    var args, id;
    if(action_str) {
        args = action_str.split(',');
        id = args.shift();
    }
    else {
        args = [ ];
        action_str = id = '';
    }

    var action = this.catalogue[id];

    // XXX - this should never happen, remove.
    if(!action) {
        action = new SGPvPAction();
        action.id = id;
        action.name = action_str;
        console.log('parsed unknown action', action);
    }

    return { action: action, args: args };
};

SGPvPUI.prototype.switchToSetKey = function(keydiv) {
    this.setkey_div = keydiv;
    this.setkey_code = parseInt(keydiv.id.substr(4));

    var e = this.elements,
    cap = keydiv.firstChild.textContent, // bit flaky but succinct
    a = this.parseAction(this.keymap[this.setkey_code]);

    e.keybindings.style.display = 'none';
    e.setkey.style.display = 'block';
    e.setkey_code.textContent = this.setkey_code;
    e.setkey_key.textContent = cap;
    this.setKeyLegend(e.setkey_key,
                      a.action.displayName.apply(a.action, a.args));
    a.action.updateSetKeyPanelArgs.apply(this, a.args);
    this.enableClose(false);

    for(var options = e.setkey_select.options, i = 0, end = options.length;
        i < end; i++) {
        if(options.item(i).value == a.action.id) {
            e.setkey_select.selectedIndex = i;
            break;
        }
    }
};

SGPvPUI.prototype.setKeyArgInputHandler = function() {
    var e = this.elements,
    opts = e.setkey_select.options,
    action_id = opts[e.setkey_select.selectedIndex].value,
    action = this.catalogue[action_id],
    args = action.getArgsFromUI.apply(this);

    if(!args)
        // bad input
        return;

    var legend = action.displayName.apply(action, args),
    action_str = action.serialise.apply(action, args);

    this.setKeyLegend(e.setkey_key, legend);
    this.setKeyLegend(this.setkey_div, legend);
    this.keymap[this.setkey_code] = action_str;
    this.saveKeyMap();
};

SGPvPUI.prototype.setKeySelectChangeHandler = function() {
    var e = this.elements,
    opts = e.setkey_select.options,
    a = this.parseAction(opts[e.setkey_select.selectedIndex].value),
    legend = a.action.displayName.apply(a.action, a.args),
    action_str = a.action.serialise.apply(a.action, a.args);

    this.setKeyLegend(e.setkey_key, legend);
    this.setKeyLegend(this.setkey_div, legend);
    a.action.updateSetKeyPanelArgs.apply(this, a.args);

    if(action_str)
        this.keymap[this.setkey_code] = action_str;
    else
        delete this.keymap[this.setkey_code];

    this.saveKeyMap();
};

SGPvPUI.prototype.setKeyLegend = function(key, legend) {
    if(legend) {
        var legenddiv = key.firstElementChild;
        if(!legenddiv) {
            legenddiv = key.ownerDocument.createElement('div');
            key.appendChild(legenddiv);
        }
        legenddiv.textContent = legend;
    }
    else {
        var legenddiv = key.firstElementChild;
        if(legenddiv)
            key.removeChild(legenddiv);
    }
};

SGPvPUI.prototype.labelAllKeys = function() {
    var doc = this.doc, e = this.elements,
    xpr = doc.evaluate('div', e.keyboard, null,
                       XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    for(var i = 0, end = xpr.snapshotLength; i < end; i++) {
        var kdiv = xpr.snapshotItem(i),
        code = parseInt(kdiv.id.substr(4)),
        a = this.parseAction(this.keymap[code]),
        legend = a.action.displayName.apply(a.action, a.args);
        this.setKeyLegend(kdiv, legend);
    }
};

SGPvPUI.prototype.resetKeyMap = function(resid) {
    var r = confirm('This will remove all custom key bindings you '
                    + 'may have defined. You OK with this?');
    if(r) {
        this.keymap = JSON.parse(this.sgpvp.getResourceText(resid));
        this.saveKeyMap();
        this.labelAllKeys();
    }
};

// We use all these elements in the UI DOM.
SGPvPUI.prototype.UI_ELEMENT_IDS =
    [ 'sg-arm',
      'sg-close',
      'sg-default-keymap',
      'sg-exc',
      'sg-illarion-keymap',
      'sg-inc',
      'sg-keybindings',
      'sg-keyboard',
      'sg-lvl',
      'sg-ql',
      'sg-rid',
      'sg-s2keys',
      'sg-s2targeting',
      'sg-setkey',
      'sg-setkey-bots',
      'sg-setkey-code',
      'sg-setkey-done',
      'sg-setkey-key',
      'sg-setkey-missiles',
      'sg-setkey-rounds',
      'sg-setkey-select',
      'sg-skarg-bots',
      'sg-skarg-missiles',
      'sg-skarg-rounds',
      'sg-targeting',
      'sg-version' ];

SGPvPUI.prototype.setUIElement = function(div) {
    this.ui_element = div;
    var doc = this.doc, sgpvp = this.sgpvp;

    // Centre it
    //var screen_width = doc.body.offsetWidth;
    div.style.left = ((doc.body.clientWidth - 600) / 2) + 'px';

    // Get the elements we use for controlling the UI
    var e = new Object();
    this.elements = e;
    for(var i in this.UI_ELEMENT_IDS) {
        var id = this.UI_ELEMENT_IDS[i];
        e[id.substr(3).replace('-','_')] = doc.getElementById(id);
    }

    e.version.textContent = sgpvp.getVersion();

    // handlers
    var self = this,
    switchToTargeting = function() { self.switchToPanel('targeting'); },
    switchToKeys = function() { self.switchToPanel('bindings'); },
    targetingInput = function() { self.targetingDataInputHandler(); },
    armourInput = function() { self.armourInputHandler(); },
    rtidInput = function() { self.rtidInputHandler(); },
    close = function() { self.close(); },
    keyClick = function(event) { self.switchToSetKey(event.currentTarget); },
    setKeySelect = function() { self.setKeySelectChangeHandler(); },
    setKeyArgInput = function() { self.setKeyArgInputHandler(); },
    defaultKeys = function() { self.resetKeyMap('default_keymap'); },
    illarionKeys = function() { self.resetKeyMap('illarion_keymap'); },
    configure = function() {
        self.keymap = sgpvp.keymap;
        e.ql.value = sgpvp.ql;
        var targetingData = sgpvp.targeting;
        e.inc.value = self.stringifyOverrideList(targetingData.include);
        e.exc.value = self.stringifyOverrideList(targetingData.exclude);
        e.rid.value = sgpvp.rtid;
        var armourData = sgpvp.armour;
        e.arm.value = armourData.points;
        e.lvl.value = armourData.level;

        self.targetingValid = true;
        self.armourValid = true;
        self.rtidValid = true;

        self.initActionCatalogue();

        e.s2targeting.addEventListener('click', switchToTargeting, false);
        e.s2keys.addEventListener('click', switchToKeys, false);
        e.ql.addEventListener('input', targetingInput, false);
        e.inc.addEventListener('input', targetingInput, false);
        e.exc.addEventListener('input', targetingInput, false);
        e.rid.addEventListener('input', rtidInput, false);
        e.arm.addEventListener('input', armourInput, false);
        e.lvl.addEventListener('input', armourInput, false);
        e.close.addEventListener('click', close, false);
        e.setkey_done.addEventListener('click', switchToKeys, false);
        e.setkey_select.addEventListener('change', setKeySelect, false);
        e.setkey_bots.addEventListener('input', setKeyArgInput, false);
        e.setkey_rounds.addEventListener('input', setKeyArgInput, false);
        e.setkey_missiles.addEventListener('click', setKeyArgInput, false);
        e.default_keymap.addEventListener('click', defaultKeys, false);
        e.illarion_keymap.addEventListener('click', illarionKeys, false);

        self.labelAllKeys();

        // Bind the keys
        var kdiv,
        xpr = doc.evaluate('div', e.keyboard, null,
                           XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        while((kdiv = xpr.iterateNext()))
            kdiv.addEventListener('click', keyClick, false);
    };

    // load settings and configure
    sgpvp.loadSettings(['keymap', 'ql', 'targeting', 'rtid', 'armour' ],
                       configure);
};

SGPvPUI.prototype.toggle = function() {
    if(this.ui_element)
        this.close();
    else
        this.open();
};

SGPvPUI.prototype.saveKeyMap = function() {
    this.sgpvp.saveSettings({keymap: this.keymap});
};

SGPvPUI.prototype.parseOverrideList = function(list) {
    var a = list.split(/\n|,/);
    var ids = new Object();
    var names = new Object();
    for(var i = 0, end = a.length; i < end; i++) {
        var s = a[i].replace(/^\s+|\s+$/g, '');
        if(s.length > 0) {
            if(/^[0-9]+$/.test(s))
                ids[parseInt(s)] = i+1;
            else
                names[s.toLowerCase()] = i+1;
        }
    }

    return { ids: ids, names: names };
};

SGPvPUI.prototype.parseQL = function(ql) {
    var o;

    ql = ql.replace(/\s+/g, '');
    if(ql.length > 0) {
        var a = ql.split(';');
        if(a.length == 22 || a.length == 23) {
            var inf = this.parseFactionSpec(a[5]);
            if(inf) {
                var ef = this.parseFactionSpec(a[16]);
                if(ef) {
                    o = {
                        ql: ql,
                        parsed: {
                            includeFactions: inf,
                            excludeFactions: ef,
                            includeAlliances: this.parseIDList(a[13]),
                            excludeAlliances: this.parseIDList(a[19]),
                            includeCharacters: this.parseIDList(a[14]),
                            excludeCharacters: this.parseIDList(a[20])
                        }
                    };
                }
            }
        }
    }
    else {
        var no = new Object();
        o = {
            ql: '',
            parsed: {
                includeFactions: no,
                excludeFactions: no,
                includeAlliances: no,
                excludeAlliances: no,
                includeCharacters: no,
                excludeCharacters: no
            }
        };
    }

    return o;
};

SGPvPUI.prototype.FACTIONSPEC_RX = /^\s*(f?)(e?)(u?)(n?)\s*$/;
SGPvPUI.prototype.parseFactionSpec = function(spec) {
    var r;
    var m = this.FACTIONSPEC_RX.exec(spec);
    if(m) {
        r = new Object();
        r['fed'] = m[1] ? true : false;
        r['emp'] = m[2] ? true : false;
        r['uni'] = m[3] ? true : false;
        r['neu'] = m[4] ? true : false;
    }

    return r;
};

SGPvPUI.prototype.parseIDList = function(idlist) {
    var r = new Object(), a = idlist.split(','), n;
    for(var i = 0, end = a.length; i < end; i++) {
        n = parseInt(a[i]);
        if(n > 0)
            r[n] = i+1;
    }
    return r;
};

SGPvPUI.prototype.stringifyOverrideList = function(list_object) {
    var a = new Array();
    for(var id in list_object.ids)
        a[list_object.ids[id] - 1] = id;
    for(var name in list_object.names)
        a[list_object.names[name] - 1] = name;
    return a.join('\n');
};
