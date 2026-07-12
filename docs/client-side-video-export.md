# Client-side post video export

Flow must never upload a source video and ask the backend to trim it.

## Required sequence

1. Select a local source video with the device media picker.
2. Open the local trim/edit interface.
3. Validate that the selected range is between 1 and 180 seconds.
4. Export a new MP4 on the device using precise native trimming.
5. Replace the source selection in the composer with the exported MP4.
6. Upload only the exported MP4 when the user publishes the post.
7. Delete generated files after successful upload, replacement, clearing the composer, or unmounting it.

The multipart request may include `duration_seconds` for backend validation. It must not include `trim_start_seconds` or `trim_end_seconds` for mobile posts.

## Native build requirement

`react-native-video-trim` is a native dependency. Expo Go cannot provide this module. After installing dependencies, generate and rebuild the native projects:

```bash
npm ci
npx expo prebuild --clean
npx expo run:android
# or
npx expo run:ios
```

Production builds must be regenerated through EAS after this dependency is merged.
