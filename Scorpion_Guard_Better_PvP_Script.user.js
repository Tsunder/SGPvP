// ==UserScript==
// @name        Scorpion Guard Better PvP Script
// @namespace   tag:dssrzs.org,2012-07-16:PvP
// @description Keyboard commands for Pardus combat
// @include     http://*.pardus.at/main.php*
// @include     http://*.pardus.at/ship2ship_combat.php*
// @include     http://*.pardus.at/ship2opponent_combat.php*
// @include     http://*.pardus.at/building.php*
// @require     sgpvp.js
// @author      Val
// @version     21
// @updateURL   https://dl.dropboxusercontent.com/u/28969566/sgpvp/Scorpion_Guard_Better_PvP_Script.meta.js
// @downloadURL https://dl.dropboxusercontent.com/u/28969566/sgpvp/Scorpion_Guard_Better_PvP_Script.user.js
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// ==/UserScript==

// Firefox implementation of non-portable bits

// Configuration loading... this seems ridiculously complicated, and
// it is, but Chrome forces a rather weird callback model, which we
// emulate in FF to keep the main logic portable.

SGPvP.prototype.LOADERS = {
    targetingData: function(universe) {
        var s = GM_getValue(universe + '-targeting');
        if(s)
            return JSON.parse(s);

        return {
            ql:{includeFactions:{},
                excludeFactions:{},
                includeAlliances:{},
                excludeAlliances:{},
                includeCharacters:{},
                excludeCharacters:{}},
            include:{ids:{},names:{}},
            exclude:{ids:{},names:{}},
            prioritiseTraders:false,
            retreatTile:null
        };
    },

    textQL: function(universe) {
        var s = GM_getValue(universe + '-ql');
        if(s)
            return s;
        return '';
    },

    retreatTile: function(universe) {
        var n = parseInt(GM_getValue(universe + '-rtid'));
        if(n > 0)
            return n;
        return null;
    }
};

SGPvP.prototype.SAVERS = {
    targetingData: function(universe, tdata) {
        GM_setValue(universe + '-ql', tdata.ql);
        GM_setValue(universe + '-targeting', JSON.stringify(tdata.data));
    },

    retreatTile: function(universe, id) {
        id = parseInt(id);
        if(id > 0)
            GM_setValue(universe + '-rtid', id);
        else
            GM_deleteValue(universe + '-rtid');
    }
};

SGPvP.prototype.loadSettings = function(keys, callback) {
    var r = new Array();

    for(var i = 0, end = keys.length; i < end; i++) {
        var loader = this.LOADERS[keys[i]];
        if(loader)
            r.push(loader(this.universe));
    }

    callback(r);
};

SGPvP.prototype.storeSettings = function(settings) {
    for(var key in settings) {
        var saver = this.SAVERS[key];
        if(saver)
            saver(this.universe, settings[key]);
    }
};

// We can't use unsafeWindow in Chrome, but we can here

SGPvP.prototype.getLocation = function() {
    return unsafeWindow.userloc;
};

// Just start the ball...

var controller = new SGPvP();
