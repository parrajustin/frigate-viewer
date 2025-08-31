# Frigate Viewer

This is mobile application which has been written using React Native to easily browse camera events of Frigate NVR. This is not official app.

## Android developing

Follow the instructions of React Native docs to install Android Studio and the emulator.

Run `npm install` to install dependencies and `npm run android` to start the emulator, compile the app and install it on the emulator or a connected device.

`google-services.json` file should be placed in `./android/app` folder - it should contain credentials to Firebase for Crashlytics service.

```bash
npm run android:bundle
# Copy built in android/app/build/outputs/bundle/release/app-release.aab
java -jar bundletool-all-1.18.1.jar build-apks --mode universal --bundle=./app-release.aab --output=app.apks --ks=demo.jks --ks-pass=pass:$PASS --ks-key-alias=frigate --key-pass=pass:$PASS
# Rename to app.apks -> app.zip
```

## iOS developing

I've never run this application on iOS. It should work in theory, but probably needs some enhancements.
