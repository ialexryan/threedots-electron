# threedots-electron
DEPRECATED: This version of Electron threedots **_should not be used_**. It is causing some kind of infinitely repeating error in the wrapped Asana webapp that uses a ton of bandwidth on your computer and is probably making Asana's servers very sad.

In the meantime, as an alternative I recommend using the excellent [nativefier](https://www.npmjs.com/package/nativefier) package. All you need to do is:
1. install node
2. install the nativefier package
3. run `nativefier --name "Asana" "https://app.asana.com" --min-width 750 --min-height 300` in your terminal.

(You can also tack on the [`--hide-window-frame`](https://github.com/jiahaog/nativefier/blob/master/docs/api.md#hide-window-frame) and/or [`--single-instance`](https://github.com/jiahaog/nativefier/blob/master/docs/api.md#single-instance) options to the end of that command as you wish.)


---------


Asana desktop client based on Electron


Download the repository and run build.sh to make a runnable app
