import urllib.request
u='https://kimse.suaveforge.com/'
with urllib.request.urlopen(u,timeout=20) as r:
    homepage=r.read().decode()
assert 'app.js?v=20261014-native-resume-29' in homepage
with urllib.request.urlopen(u+'app.js?v=20261014-native-resume-29',timeout=20) as r:
    source=r.read().decode()
assert 'else if(window.KIMSE_NATIVE?.isNative?.())' in source
assert 'void collectNativeBridgeSignals();' in source
print('KIMSE_LIVE_NATIVE_RESUME_OK')
