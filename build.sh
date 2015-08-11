#!/bin/bash

# First, install our app's dependencies
cd app/
npm install
cd ..

# Install the electron-packager tool
npm i electron-packager -g

# Use the electron-packager tool. Modify these arguments accordingly.
electron-packager app/ threedots --platform=darwin --arch=all --version=0.30.4 --asar --overwrite --out=releases --app-version=2.0.0 --app-bundle-id=com.threedotsapp --helper-bundle-id=com.threedotsapp.helper --icon=icon.icns

