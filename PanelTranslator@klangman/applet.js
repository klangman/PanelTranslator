/*
 * applet.js
 * Copyright (C) 2024 Kevin Langman <klangman@gmail.com>
 *
 * PanelTranslator is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * PanelTranslator is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

const Applet = imports.ui.applet;
const St = imports.gi.St;
const GLib = imports.gi.GLib;
const Gettext = imports.gettext;
const SignalManager = imports.misc.signalManager;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const Util = imports.misc.util;
const Lang = imports.lang;
const Tooltips = imports.ui.tooltips;
const Clutter = imports.gi.Clutter;

const UUID = "PanelTranslator@klangman";
const ICON_SIZE = 16;

const AutoPasteType = {
   Disabled: 0,
   Selection: 1,
   Clipboard: 2
}

Gettext.bindtextdomain(UUID, GLib.get_home_dir() + "/.local/share/locale");

function _(text) {
  let locText = Gettext.dgettext(UUID, text);
  if (locText == text) {
    locText = window._(text);
  }
  return locText;
}

class PanelTranslatorApp extends Applet.IconApplet {

   constructor(orientation, panelHeight, instanceId) {
      super(orientation, panelHeight, instanceId);
      this._signalManager = new SignalManager.SignalManager(null);
      this.set_applet_icon_symbolic_name("thunderbolt-symbolic");
      this.set_applet_tooltip(_("Translator"));
      this.menu = new Applet.AppletPopupMenu(this, orientation);
      this.menuManager = new PopupMenu.PopupMenuManager(this);
      this.menuManager.addMenu(this.menu);
      this.translatorPopup = new TranslatorPopupItem(this);
      this.menu.addMenuItem(this.translatorPopup);
      this.infomenuitem = new PopupMenu.PopupIconMenuItem("", "", St.IconType.SYMBOLIC);
      this.infomenuitem.actor.set_reactive(false);
      this.menu.addMenuItem(this.infomenuitem);
      this.infomenuitem.actor.hide();
      this.settings = new Settings.AppletSettings(this, UUID, instanceId);
      this.languages = [];
      this.getLanguages();
   }

   on_applet_added_to_panel() {
   }

   _onButtonPressEvent(actor, event) {
      let button = event.get_button();
      if (button == 2 ) {/* Middle Click */
         this.openPopupMenu(this.settings.getValue("middle-auto-paste"), this.settings.getValue("middle-auto-play"));
         return;
      }
      super._onButtonPressEvent(actor, event);
   }

   on_applet_clicked() {
      this.openPopupMenu(this.settings.getValue("left-auto-paste"), this.settings.getValue("left-auto-play"));
   }

   openPopupMenu(autoPaste, play) {
      this.infomenuitem.actor.hide();
      if (this.languages.length == 0) {
         this.getLanguages();
      }
      if (!this.menu.isOpen && autoPaste != AutoPasteType.Disabled ) {
         this.translatorPopup.translateClipboard(autoPaste, play);
      }
      this.menu.toggle();
   }

   getLanguages() {
      // trans -list-all
      Util.spawnCommandLineAsyncIO( "trans -list-all", Lang.bind(this, this.readLanguages) );
   }

   readLanguages(stdout, stderr, exitCode) {
      if (exitCode===0) {
         let lines = stdout.split('\n');
         let nameStart = lines[0].lastIndexOf(" ")+1;
         let englishNameStart = lines[0].substring(0,nameStart-1).trim().lastIndexOf(" ")+1;
         this.languages = [];
         for (let i=0 ; i < lines.length ; i++) {
            let code = lines[i].substring(0, englishNameStart).trim();
            let englishName = lines[i].substring(englishNameStart, nameStart).trim();
            let name = lines[i].substring(nameStart).trim();
            if (code.length>0 && englishName.length>0 && name.length>0) {
               //log( `L${i} ${code} ${englishName} ${name}` );
               this.languages.push( {code: code, englishName: englishName, name: name} );
            }
         }
         if (this.languages.length == 0) {
            this.infomenuitem.label.set_text(_("Unable to query available languages from translate-shell"));
            this.infomenuitem.setIconSymbolicName("emblem-important");
            this.infomenuitem.actor.show();
         }
      } else if (exitCode===127){
         this.infomenuitem.label.set_text(_("Required \"trans\" command not found, please install translate-shell"));
         this.infomenuitem.setIconSymbolicName("emblem-important");
         this.infomenuitem.actor.show();
      } else {
         this.infomenuitem.label.set_text(_("Error, the \"trans\" command returned an exit code of ") + this.exitCode );
         this.infomenuitem.setIconSymbolicName("emblem-important");
         this.infomenuitem.actor.show();
      }
      this.translatorPopup.setFromLanguage( this.getLanguage( this.settings.getValue("default-from-language") ) );
      this.translatorPopup.setToLanguage(   this.getLanguage( this.settings.getValue("default-to-language") ) );
   }

   getLanguage(name) {
      if (name.length == 0)
         return null;
      for (let i=0 ; i<this.languages.length ; i++ ) {
         if (this.languages[i].englishName.toLowerCase().startsWith(name.toLowerCase())) {
            return this.languages[i];
         }
      }
      return null;
   }
}

class TranslatorPopupItem extends PopupMenu.PopupMenuSection {

   constructor(applet) {
      super({activate: false});
      this._applet = applet;

      this.vertBox     = new St.BoxLayout({ important: true, vertical: true, x_expand: true });
      this.languageBox = new St.BoxLayout({ important: true, vertical: false, style: 'border-width:2px;padding:2px;', x_align: Clutter.ActorAlign.CENTER, x_expand: true});
      this.textBox     = new St.BoxLayout({ important: true, vertical: false, style: 'border-width:2px;padding:2px;', x_align: Clutter.ActorAlign.CENTER, x_expand: true});
      this.actionBox   = new St.BoxLayout({ important: true, vertical: false, style: 'border-width:2px;padding:2px;', x_align: Clutter.ActorAlign.FILL, x_expand: true});

      this.vertBox.add_child(this.languageBox);
      this.vertBox.add_child(this.textBox);
      this.vertBox.add_child(this.actionBox);

      // Setup the language selection box
      this.fromSearch = new St.BoxLayout({ vertical: false, x_align: Clutter.ActorAlign.CENTER, style: 'margin-right:5px;' });
      this.toSearch   = new St.BoxLayout({ vertical: false, x_align: Clutter.ActorAlign.CENTER, style: 'margin-left:5px;' });
      this.switchButton = new ControlButton("object-flip-horizontal-symbolic", _("Swap Languages"), () => {
         let from = this.fromLanguage;
         let to = this.toLanguage;
         if (this.fromLanguage) {
            this.toLanguage = from;
            this.toSearchEntry.set_text(this.toLanguage.englishName);
         }
         if (this.toLanguage) {
            this.fromLanguage = to;
            this.fromSearchEntry.set_text(this.fromLanguage.englishName);
         }
         let fromText = this.fromLang.get_text();
         let toText = this.toLang.get_text();
         if (toText)
            this.fromLang.set_text(toText);
         if (fromText)
            this.toLang.set_text(fromText);
      });

      this.fromSearchEntry = new St.Entry({ name: 'menu-search-entry', width: 238, track_hover: true, can_focus: true,  x_expand: true, x_align: Clutter.ActorAlign.CENTER });
      this.fromSearchEntry.get_clutter_text().connect( 'key-press-event', (actor, event) => {
            let keyCode = event.get_key_symbol();
            if (keyCode == Clutter.KEY_BackSpace) {
               return false; // Ignore the BS press event!
            }
         });
      this.fromSearchEntry.get_clutter_text().connect( 'key-release-event', (actor, event) => {
            let text = this.fromSearchEntry.get_clutter_text();
            let cursorPos = text.get_cursor_position();
            let txt = text.get_text();
            if (cursorPos == -1) {
               cursorPos = txt.length;
            }
            if (event.get_key_symbol() == Clutter.KEY_BackSpace) {
               if (cursorPos > 0) {
                  cursorPos--;
                  if (cursorPos==0) {
                     text.set_text("");
                     return;
                  }
               }
            }
            let language = this._applet.getLanguage(txt.substring(0, cursorPos));
            if (language != this.fromLanguage) {
               this.fromLanguage = language;
               this.fromLang.set_text("");
            }
            if (this.fromLanguage) {
               text.set_text(this.fromLanguage.englishName);
               text.set_cursor_position(cursorPos);
            }
         });

      this.toSearchEntry   = new St.Entry({ name: 'menu-search-entry', width: 238, track_hover: true, can_focus: true,  x_expand: true, x_align: Clutter.ActorAlign.CENTER });
            this.toSearchEntry.get_clutter_text().connect( 'key-press-event', (actor, event) => {
            let keyCode = event.get_key_symbol();
            if (keyCode == Clutter.KEY_BackSpace) {
               return false; // Ignore the BS press event!
            }
         });
      this.toSearchEntry.get_clutter_text().connect( 'key-release-event', (actor, event) => {
            let text = this.toSearchEntry.get_clutter_text();
            let cursorPos = text.get_cursor_position();
            let txt = text.get_text();
            if (cursorPos == -1) {
               cursorPos = txt.length;
            }
            if (event.get_key_symbol() == Clutter.KEY_BackSpace) {
               if (cursorPos > 0) {
                  cursorPos--;
                  if (cursorPos==0) {
                     text.set_text("");
                     return;
                  }
               }
            }
            let language = this._applet.getLanguage(txt.substring(0, cursorPos));
            if (language != this.toLanguage) {
               this.toLanguage = language;
               this.toLang.set_text("");
            }
            if (this.toLanguage) {
               text.set_text(this.toLanguage.englishName);
               text.set_cursor_position(cursorPos);
            }
         });

      this._searchFromIcon = new St.Icon({ style_class: 'menu-search-entry-icon', icon_name: 'edit-find', icon_type: St.IconType.SYMBOLIC });
      this._searchToIcon = new St.Icon({ style_class: 'menu-search-entry-icon', icon_name: 'edit-find', icon_type: St.IconType.SYMBOLIC });
      this.fromSearchEntry.set_secondary_icon(this._searchFromIcon);
      this.toSearchEntry.set_secondary_icon(this._searchToIcon);
      this.fromSearch.add_child(this.fromSearchEntry);
      this.toSearch.add_child(this.toSearchEntry);
      this.languageBox.add_child(this.fromSearch);
      this.languageBox.add_child(this.switchButton.getActor());
      this.languageBox.add_child(this.toSearch);

      // Setup the text boxes
      //let fromScrollView = new St.ScrollView()     // TODO... Get this working!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      this.fromLang = new St.Entry({name: 'menu-search-entry', hint_text: _("Text to translate"), width: 250, height: 180, style: 'margin-right:5px;'});
      this.fromLang.get_clutter_text().set_line_wrap(true);
      this.fromLang.get_clutter_text().set_single_line_mode(false);
      this.fromLang.get_clutter_text().set_max_length(200);
      //fromScrollView.set_child(this.fromLang);
      this.textBox.add_child(this.fromLang);
      //this.textBox.add_child(fromScrollView);

      this.toLang = new St.Entry({name: 'menu-search-entry', hint_text: _("Translated text"), width: 250, height: 180, style: 'margin-left:5px;'});
      let text = this.toLang.get_clutter_text();
      text.set_line_wrap(true);
      text.set_single_line_mode(false);
      text.set_editable(false);
      text.set_max_length(200);
      this.textBox.add_child(this.toLang);

      // Setup the action buttons
      this.config = new ControlButton("system-run", _("Configure"), () => {this._applet.menu.close(); this._applet.configureApplet()});
      this.playFrom = new ControlButton("audio-speakers-symbolic", _("Play"), () => {
         log( "trans -b -p " + this.fromLanguage.code + ":" + this.fromLanguage.code + " \"" + this.fromLang.get_text() + "\"" );
         Util.spawnCommandLineAsync("trans -b -p " + this.fromLanguage.code + ":" + this.fromLanguage.code + " \"" + this.fromLang.get_text() + "\"");
      });
      this.paste = new ControlButton("edit-paste-symbolic", _("Paste"), () => {
         let clipboard = St.Clipboard.get_default();
         clipboard.get_text(St.ClipboardType.CLIPBOARD, (cb, text) => {this.clipboardText(cb, text, true);} );
      });
      this.clear = new ControlButton("process-stop-symbolic", _("Clear"), () => {
         this.fromLang.set_text("");
         this.toLang.set_text("");
      });
      this.translate = new ControlButton("media-playback-start-symbolic", _("Translate"), () => {
         Util.spawnCommandLineAsyncIO( "trans -b " + this.fromLanguage.code + ":" + this.toLanguage.code + " \"" + this.fromLang.get_text() + "\"", Lang.bind(this, this.readTranslation) );
      });
      let toBtnBox = new St.BoxLayout({x_align: Clutter.ActorAlign.END, x_expand: true});
      this.copy = new ControlButton("edit-copy-symbolic", _("Copy"), () => {
         St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, this.toLang.get_text());
         });
      this.copy.getActor().set_x_expand(true);
      this.copy.getActor().set_x_align(Clutter.ActorAlign.END);
      this.playTo = new ControlButton("audio-speakers-symbolic", _("Play Translation"), () => {
         Util.spawnCommandLineAsync("trans -b -p " + this.toLanguage.code + ":" + this.toLanguage.code + " \"" + this.toLang.get_text() + "\"");
      });

      this.actionBox.add_child(this.config.getActor());
      this.actionBox.add_child(this.playFrom.getActor());
      this.actionBox.add_child(this.paste.getActor());
      this.actionBox.add_child(this.clear.getActor());
      this.actionBox.add_child(this.translate.getActor());
      toBtnBox.add_child(this.copy.getActor());
      toBtnBox.add_child(this.playTo.getActor());
      this.actionBox.add_child(toBtnBox);

      this.addActor(this.vertBox, {expand: true});
   }

   readTranslation(stdout, stderr, exitCode) {
      if (exitCode===0) {
         this.toLang.set_text( stdout.trim() );
      }
      return exitCode;
   }

   playTranslation(stdout, stderr, exitCode) {
      if (this.readTranslation(stdout, stderr, exitCode)==0) {
         Util.spawnCommandLineAsync("trans -b -p " + this.toLanguage.code + ":" + this.toLanguage.code + " \"" + this.toLang.get_text() + "\"");
      }
   }

   translateClipboard(autoPaste, play) {
      let clipboard = St.Clipboard.get_default();
      if (autoPaste != AutoPasteType.Selection) {
         clipboard.get_text(St.ClipboardType.CLIPBOARD, (cb, text) => {this.clipboardText(cb, text, true, play);} );
      } else {
         clipboard.get_text(St.ClipboardType.PRIMARY, (cb, text) => {this.clipboardText(cb, text, true, play);} );
      }
   }

   clipboardText(cb, text, translate, play=false) {
      this.fromLang.set_text(text);
      if (translate) {
         if (play) {
            Util.spawnCommandLineAsyncIO( "trans -b " + this.fromLanguage.code + ":" + this.toLanguage.code + " \"" + this.fromLang.get_text() + "\"", Lang.bind(this, this.playTranslation) );
         } else {
            Util.spawnCommandLineAsyncIO( "trans -b " + this.fromLanguage.code + ":" + this.toLanguage.code + " \"" + this.fromLang.get_text() + "\"", Lang.bind(this, this.readTranslation) );
         }
      } else {
         this.toLang.set_text("");
      }
   }

   setFromLanguage(lang) {
      log( `Setting from language to: "${lang}"` );
      this.fromLanguage = lang;
      this.fromSearchEntry.set_text(lang.englishName);
   }

   setToLanguage(lang) {
      log( `Setting to language to: "${lang}"` );
      this.toLanguage = lang;
      this.toSearchEntry.set_text(lang.englishName);
   }
}

/* This class was borrowed from sound@cinnamon.org */
class ControlButton {
    constructor(icon, tooltip, callback, style = 'padding-left:4px; padding-right:4px;') {
        this.actor = new St.Bin();

        this.button = new St.Button();
        this.button.connect('clicked', callback);
        this.button.set_style(style);

        this.icon = new St.Icon({ icon_type: St.IconType.SYMBOLIC, icon_name: icon, icon_size: ICON_SIZE });
        this.button.set_child(this.icon);
        this.actor.add_actor(this.button);

        this.tooltip = new Tooltips.Tooltip(this.button, tooltip);
        this.setActive(true);
        this.setEnabled(true);
        this.button.set_reactive(true);
    }

    getActor() {
        return this.actor;
    }

    setData(icon, tooltip) {
        this.icon.icon_name = icon;
        this.tooltip.set_text(tooltip);
    }

    setActive(status) {
        this.button.change_style_pseudo_class("active", status);
    }

    setEnabled(status) {
        this.button.change_style_pseudo_class("insensitive", !status);
        this.button.can_focus = status;
        this.button.reactive = status;
    }
}

// Called by cinnamon when starting this applet
function main(metadata, orientation, panelHeight, instanceId) {
  return new PanelTranslatorApp(orientation, panelHeight, instanceId);
}