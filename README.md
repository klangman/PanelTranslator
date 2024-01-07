# Panel Translator
A translator applet for the Cinnamon desktop environment

![screen shot](PanelTranslator@klangman/screenshot.png)

Uses [Google](https://translate.google.com/), [Bing](https://www.bing.com/translator) and others (via [trantlate-shell](https://github.com/soimort/translate-shell)) to translate text into more then 150 languages.

## Features

1. Type text into a popup dialog from the Cinnamon panel and translate to the language of your choice
2. Optional automatically translate and playback test from the current selection or clipboard
3. Middle mouse button can be used to perform 6 different translation action
4. Ctrl + Middle mouse button can be used to perform 6 different translation action

## Requirements

The [trantlate-shell](https://github.com/soimort/translate-shell) package must be installed for this applet to operate correctly.

```
sudo apt-get install translate-shell
```

## Installation
For the latest development version:
1. Clone the repo (or Download the latest repo by clinking on the green "code" button above then click "Download ZIP")
    ```
    git clone git@github.com:klangman/PanelTranslator.git
    ```
2. If you downloaded a ZIP, decompress the zip into a directory of your choice
    ```
    unzip ~/Downloads/PanelTranslator-main.zip
    ```
3. Change directory to the cloned repo or the decompressed ZIP file
4. Link the "PanelTranslator@klangman" directory into the "~/.local/share/cinnamon/applets/" directory
    ```
    ln -s $PWD/PanelTranslator@klangman ~/.local/share/cinnamon/applets/PanelTranslator@klangman
    ```
5. Right click on the cinnamon panel that you wish to add PanelTranslator to and click "Applets"
6. Select the "Panel Translator" entry and then click the "+" button at the bottom of the Applet window
7. Right click on the cinnamon panel and use "Panel edit mode" to enable moving the applet within the panel
8. Right click on the cinnamon panel and disable "Panel edit mode"

## Feedback
Please, if you find any issues, feel free to create an issue here on Github. Thanks!
