#!/bin/bash

# Check that we're on the release branch
if [ `git symbolic-ref --short -q HEAD` != "release" ]
then
    echo "Not currently on the release branch."
    exit 1
fi

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
    --version=0.34.1 \
    --asar \
    --overwrite \
    --out=releases \
    --app-version=2.1.2 \
    --app-bundle-id=com.threedotsapp \
    --helper-bundle-id=com.threedotsapp.helper \
    --icon=icon.icns \
#    --sign="Developer ID Application: Alex Ryan (4H5P3P832L)"
#spctl --assess --verbose releases/threedots-darwin-x64/threedots.app

# Uncomment the above two lines to output and verify a Developer ID-signed app
