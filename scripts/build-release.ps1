Write-Host "=== Cleaning old build caches ==="

# Remove android/app/build
if (Test-Path android/app/build) {
    Remove-Item -Recurse -Force android/app/build
}

# Remove android assets folder
if (Test-Path android/app/src/main/assets) {
    Remove-Item -Recurse -Force android/app/src/main/assets
}

# Remove res/drawable-* auto-generated assets
if (Test-Path android/app/src/main/res) {
    Get-ChildItem -Path android/app/src/main/res -Recurse `
    | Where-Object { $_.FullName -match "drawable" -or $_.FullName -match "raw" } `
    | Remove-Item -Force -Recurse
}

Write-Host "=== Cleaning Node & RN cache ==="
npx react-native-clean-project --keep-node-modules --keep-gradle-cache

Write-Host "=== Recreating assets directory ==="
New-Item -ItemType Directory -Path android/app/src/main/assets | Out-Null

Write-Host "=== Bundling JS and copying assets ==="
npx react-native bundle `
  --platform android `
  --dev false `
  --entry-file ./app/index.tsx `
  --bundle-output android/app/src/main/assets/index.android.bundle `
  --assets-dest android/app/src/main/res

Write-Host "=== Cleaning gradle ==="
cd android
./gradlew clean

Write-Host "=== Building release APK ==="
./gradlew assembleRelease -x lint
cd ..

Write-Host "=== Build complete! ==="
Write-Host "APK path:"
Write-Host "android/app/build/outputs/apk/release/app-release.apk"
