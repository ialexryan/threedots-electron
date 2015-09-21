#!/bin/bash

# First, install our app's dependencies
cd app/
npm install
cd ..

# Install the electron-packager tool if needed
which electron-packager || npm i electron-packager -g

# Use the electron-packager tool. Modify these arguments accordingly.
electron-packager app/ threedots \
    --platform=darwin \
    --arch=all \
    --version=0.33.0 \
    --asar \
    --overwrite \
    --out=releases \
    --app-version=2.0.0 \
    --app-bundle-id=com.threedotsapp \
    --helper-bundle-id=com.threedotsapp.helper \
    --icon=icon.icns \
#    --sign="Developer ID Application: Alex Ryan (4H5P3P832L)"
#spctl --assess --verbose releases/threedots-darwin-x64/threedots.app

# Uncomment the above two lines to output and verify a Developer ID-signed app
