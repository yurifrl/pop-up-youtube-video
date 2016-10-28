/*
 * Example Code for Toolbar Button. See "README.txt"
 * for additional documentation and info.
 *
 * Authors:
 *  Evgueni Naverniouk (evgueni@globexdesigns.com)
 * 
 */

// Firstly, you'll want to require the library. Most likely this will be
// at the top of your main.js file. But you can require it anywhere you want.
// Assign the library to any variable you want. I called mine 'toolbarbutton'
// since that makes the most sense to me.
var toolbarbutton = require("toolbarbutton");

// Usually I'll create a separate function that will generate my button. In this
// example I've called in "createButton", and it will return back my button
// object that I can later save to a variable and reference again.
function createButton() {

    // This will create an instance of our toolbarbutton.ToolbarButton() object.
    // For the sake of this example, I've bunched all the configuration variables
    // into here so I can explain what they all do. In your case -- you'll
    // probably not need all of them like this.
    return toolbarbutton.ToolbarButton({
    
        // CONFIGURATION VARIABLES
        
        // This is the ID of your button object. It must be unique so
        // I recommend using something that has the ID of your extension in it.
        id: "youtube_popup_jid0-AkqRbdPNieEh9P05Aq9SHXO0XBE",    
        
        // (Optional) If you want your button to use an icon - specify a data
        // url here like this.
        image: require("self").data.url("youtube.png"),
        
        // (Optional) This is the text label that will appeear on the button.
        // If not set, button will either use the image you provide or be blank.
        label: "Pop-up Youtube Video",                
        
        // (Optional)This is the tooltip text that appears when you hover your
        // mouse on the button.
        tooltiptext: "Pop-up Youtube Video",
        
        // EVENTS
        
        // Called when the button is clicked. This will not work if a 'menu' is set.
        onClick: function(event) {
            var tabs = require("tabs");
            var open_this = String(tabs.activeTab.url);
            open_this = open_this.replace("watch","watch_popup");                
            tabs.open(open_this);
        },
        
        // Called when the button is selected. This will not work if a 'menu' is set.
        onCommand: function(event) {}
        
    });
}


// In your exports.main function, call the createButton() function to generate
// your button.
exports.main = function(options) {
    var button = createButton();
    
    // This tells the Firefox to automatically move the button into the toolbar
    // when the extension is installed. Otherwise it will be hidden and the
    // user will have to manually go into the "Customize..." menu and drag it
    // into the toolbar.
    if (options.loadReason == "install") {
        button.moveTo({
            toolbarID: "nav-bar",
            forceMove: true
        });
    }
};