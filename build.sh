#!/bin/bash

cd app/
npm install
cd ..

npm i electron-packager -g

electron-packager app/ threedots --platform=darwin --arch=all --version=0.30.4 --overwrite --out=releases --app-version=2.0.0 --app-bundle-id=com.threedotsapp --helper-bundle-id=com.threedotsapp.helper --asar
