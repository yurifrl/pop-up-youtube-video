/* 
 * Version: MIT/X11 License
 * 
 * Copyright (c) 2010 Erik Vold
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * Contributors:
 *   Erik Vold <erikvvold@gmail.com> (Original Author)
 *   Greg Parris <greg.parris@gmail.com>
 *   Evgueni Naverniouk <evgueni@globexdesigns.com>
 *   Geek in Training <goMobileFirefox@gmail.com>
 *
 */

"use-strict";

const {unload} = require("unload+");
const {listen} = require("listen");
const oldWinUtils = require("window-utils");
const winUtils = require("sdk/window/utils");
const persist = require("./persist");

const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const TBB_PREF = "extensions.toolbarButtonCompleteLibrary.";

persist.init(TBB_PREF);

exports.ToolbarButton = function ToolbarButton(options) {

    var unloaders = [],
    	toolbarID = "",
		insertbefore = "",
		destroyed = false,
		destroyFuncs = [];
        
    if (!options) throw new Error("ToolbarButton options must be specified");
    if (!options.id) throw new Error("ToolbarButton 'id' option must be specified");
    
    
    // createMenu()
    // Creates a dropdown menu
    //
    // @param   input       object      Options for the menu object
    // @param   popup       boolean     Should the menu be a popup?
    // @param   buttonID    string      ID of the button to attach the dropdown to
    //
    // @return object
    var createMenu = function(input, popup, buttonID) {
        // The window object we're currently in
        var window = winUtils.getMostRecentBrowserWindow(),
        
        // The button the menu will be attached to
        toolbarbutton = window.document.getElementById(buttonID);
        
        // Given a XUL element type -- creates a XUL element
        function xul(type) {
            return window.document.createElementNS(NS_XUL, type);
        }
    	
        // This is our new menu option
    	var menu = popup ? xul("menupopup") : xul("menu");
        
    	if (!popup) {
    		var submenu = xul("menupopup");
    		submenu.setAttribute("id", input.id + "-popup");
    		menu.setAttribute("contextmenu", submenu.id);
    	}
    	
        // Attach events
    	if (input.onShow) {
    		menu.addEventListener("popupshowing", input.onShow, true);
    	}
        
    	if (input.onHide) {
    		menu.addEventListener("popuphiding", input.onHide, true);
    	}
        
        // Draw menu items
    	input.items.forEach(function (mitem) {
            let xultype = mitem.type == 'divider' ? 'menuseparator' : 'menuitem';
            
    		let tbmi = xul(xultype);
            
            // Menu type
            if (mitem.type != 'divider') {
                if (mitem.type == "menu") {
            		tbmi.setAttribute("items", mitem.items);
            		if (mitem.onShow) tbmi.addEventListener("popupshowing", mitem.onShow, true);
            		if (mitem.onHide) tbmi.addEventListener("popuphiding", mitem.onHide, true);
            		tbmi = createMenu(mitem);
            	}
            
                // Pass in simple params
                
                var params = ['id', 'checked', 'closemenu', 'disabled', 'label', 'tooltiptext', 'type'];
                params.map(function(param) {
                    if (param in mitem) tbmi.setAttribute(param, mitem[param]);
                })
                
                // Complex params
                
                if (mitem.image) {
        			tbmi.setAttribute("class", "menuitem-iconic");
        			tbmi.setAttribute("image", mitem.image);
        		}
                
                // Events
        		
                if (mitem.onCommand) {
                    tbmi.addEventListener("command", function () {
        			    mitem.onCommand();
        		    }, true);
                }
            }
        		
        	(submenu || menu).appendChild(tbmi);
    	});
        
    	if (submenu) {
            menu.appendChild(submenu);
        }
    	
    	return menu;
    }
    
	var delegate = {
		onTrack: function (window) {
			if ("chrome://browser/content/browser.xul" != window.location || destroyed)
				return;
			let doc = window.document;

			function $(id) doc.getElementById(id);
            
            // Given a XUL element type -- creates a XUL element
            function xul(type) {
                return window.document.createElementNS(NS_XUL, type);
            }

			// Create toolbar button

			var customizeMode = ($("nav-bar") || $("addon-bar")).getAttribute("place");
			if (customizeMode) {
				return false; // toolbar is in customize mode, therefore we cannot add the button.
			}

			let tbb = xul("toolbarbutton");
            
            // Set option defaults
            options['class'] = "toolbarbutton-1 chromeclass-toolbar-additional";
            options.type = options.type || options.menu ? 'menu' : 'button';
            
            // Pass in simple params
            
            var params = ['class', 'id', 'image', 'label', 'tooltiptext', 'type'];
            params.map(function(param) {
                if (param in options) tbb.setAttribute(param, options[param]);
            })
			
			// use this if you need to discriminate left/middle/right click
			// return true if you want to prevent default behaviour (like the showing of the context-menu on right click)
			if (options.onClick) {
				tbb.addEventListener("click", function (evt) {
                    // e is a MouseEvent (so you can use e.button to know which mouse button was pressed)
					if (options.onClick) options.onClick(evt);
					if (options.panel) {
						try {
							options.panel.show({}, tbb);
						} catch(e) {
							options.panel.show(tbb);
						}
					}
				}, false);
			}

			// Create toolbar button menu
			if (options.menu) {
				let tbmid = options.menu.id;
				tbb.setAttribute("contextmenu", tbmid);

				// Create menu popup
                let tbm = createMenu(options.menu, true, options.id);
    			tbb.appendChild(tbm);
			}

			if (options.onCommand || options.panel) {
				tbb.addEventListener("command", function (evt) {
                    if (options.onCommand) options.onCommand(evt);
					if (options.panel) {
						try {
							options.panel.show({}, tbb);
						} catch(e) {
							options.panel.show(tbb);
						}
					}
				}, true);
			}
            
			// add toolbarbutton to palette
			($("navigator-toolbox") || $("mail-toolbox")).palette.appendChild(tbb);

			// find a toolbar to insert the toolbarbutton into
			if (toolbarID) var tb = $(toolbarID);
			if (!tb) var tb = toolbarbuttonExists(doc, options.id);

			// found a toolbar to use?
			if (tb) {
				// if addon bar use small icon
				if (tb.getAttribute("iconsize") === "small" && options.smallImage) {
					tbb.setAttribute("image", options.smallImage);
				}
				
				let b4;
				// find the toolbarbutton to insert before
				if (insertbefore) {
					b4 = $(insertbefore);
				}
				if (!b4) {
					let currentset = tb.getAttribute("currentset").split(",");
					let i = currentset.indexOf(options.id) + 1;

					// was the toolbarbutton id found in the curent set?
					if (i > 0) {
						let len = currentset.length;
						// find a toolbarbutton to the right which actually exists
						for (; i < len; i++) {
							b4 = $(currentset[i]);
							if (b4) break;
						}
					}
				}

				tb.insertItem(options.id, b4, null, false);
				tb.setAttribute("currentset", tb.currentSet);
				persist.update(tb.id + ".currentset", tb.currentSet);
			}

			var saveTBNodeInfo = function (e) {
				toolbarID = tbb.parentNode.getAttribute("id") || "";
				insertbefore = (tbb.nextSibling || "") && tbb.nextSibling.getAttribute("id").replace(/^wrapper-/i, "");

				if (!tb) {
					var tb = (tbb.parentElement.id !== "BrowserToolbarPalette") ? tbb.parentElement : null;
				}
				if (tb) {
					tb.setAttribute("currentset", tb.currentSet);
					
					if (tb.getAttribute("iconsize") === "small" && options.smallImage) {
						tbb.setAttribute("image", options.smallImage);
					}
					else {
						tbb.setAttribute("image", options.image);
					}
					persist.update(tb.id + ".currentset", tb.currentSet);
				}
				
				ptbs = persist.persistentToolbars();
				for (var i = 0, l = ptbs.length; i < l; ++i) {
					// for each persistent toolbar update current set
					persist.update(ptbs[i] + ".currentset", $(ptbs[i]).currentSet);
				}
			};

			window.addEventListener("aftercustomization", saveTBNodeInfo, false);

			// add unloader to unload+'s queue
			var unloadFunc = function () {
				tbb.parentNode.removeChild(tbb);
				window.removeEventListener("aftercustomization", saveTBNodeInfo, false);
			};
            
			var index = destroyFuncs.push(unloadFunc) - 1;
			listen(window, window, "unload", function () {
				destroyFuncs[index] = null;
			}, false);
			unloaders.push(unload(unloadFunc, window));
            
		},
        
		onUntrack: function (window) {}
	};

	var tracker = new oldWinUtils.WindowTracker(delegate);

	return {
    
		button: function() {
			let button = winUtils.getMostRecentBrowserWindow().document.getElementById(options.id);
			return button;
		},
        
		updateMenu: function(data) {
			var button = this.button();
            
            if (button && data) {
                button.setAttribute("contextmenu", data.id);
                var menu = this.createMenu(data, true, button.id);
                
                // Make sure toolbar button is empty
                var existingMenus = button.childNodes;
                if (existingMenus.length) {
                    for (var i = 0, l = existingMenus.length; i < l; i++) {
                        button.removeChild(existingMenus[i]);
                    }
                }
                
                // Insert new menu
				button.appendChild(menu);
			}
            
            return false
		},
        
		destroy: function () {
			if (destroyed) return;

			try {
				let window = winUtils.getMostRecentBrowserWindow();
				let $ = function (id) {
					return window.document.getElementById(id);
				}
				if (($("nav-bar") || $("addon-bar")).getAttribute("place")) {
					return;
				}
			} catch (e) {console.log(e)}


			destroyed = true;

			if (options.panel) options.panel.destroy();

			// run unload functions
			destroyFuncs.forEach(function (f) f && f());
			destroyFuncs.length = 0;

			// remove unload functions from unload+'s queue
			unloaders.forEach(function (f) f());
			unloaders.length = 0;
		},
        
		moveTo: function (pos) {
			if (destroyed) return;

			// record the new position for future windows
			toolbarID = pos.toolbarID;
			insertbefore = pos.insertbefore;

			// change the current position for open windows
			for each(var window in oldWinUtils.windowIterator()) {
				if ("chrome://browser/content/browser.xul" != window.location) continue;

				let doc = window.document;
				let $ = function (id) doc.getElementById(id);

				// if the move isn't being forced and it is already in the window, abort
				if (!pos.forceMove && $(options.id)){ return; }

				var tb = $(toolbarID);
				var b4 = $(insertbefore);

				// TODO: if b4 dne, but insertbefore is in currentset, then find toolbar to right

				if (tb) {
					tb.insertItem(options.id, b4, null, false);
					persist.update(tb.id + ".currentset", tb.currentSet)
				}
			};
		},
        
        createMenu: createMenu
        
	};
};



function toolbarbuttonExists(doc, id, live) {
	var toolbars = doc.getElementsByTagNameNS(NS_XUL, "toolbar");
	for (var i = toolbars.length - 1;~ i; i--) {
		if ((new RegExp("(?:^|,)" + id + "(?:,|$)")).test(toolbars[i].getAttribute("currentset")))
			return toolbars[i];
	}
	return false;
}
