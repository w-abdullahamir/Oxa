Write-Host "=== FAST RELEASE BUILD ==="
Write-Host "No heavy cleaning, only updating the JS bundle & assets."

# Make sure assets directory exists
if (!(Test-Path android/app/src/main/assets)) {
    New-Item -ItemType Directory -Path android/app/src/main/assets | Out-Null
}

Write-Host "=== Bundling latest JS and assets ==="

npx react-native bundle `
  --platform android `
  --dev false `
  --entry-file ./app/index.tsx `
  --bundle-output android/app/src/main/assets/index.android.bundle `
  --assets-dest android/app/src/main/res `
  --reset-cache:$false

Write-Host "=== Using existing Gradle cache to build APK ==="

cd android
./gradlew assembleRelease -x lint
cd ..

Write-Host "=== DONE ==="
Write-Host "APK → android/app/build/outputs/apk/release/app-release.apk"
