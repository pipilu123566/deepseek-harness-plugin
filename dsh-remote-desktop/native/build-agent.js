import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, existsSync, writeFileSync, copyFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
const root=resolve('native'),app=resolve('agent/DeepSeek Remote.app'),contents=join(app,'Contents');
execFileSync('swift',['build','-c','release','-Xlinker','-rpath','-Xlinker','@executable_path/../Frameworks'],{cwd:root,stdio:'inherit'});
const bin=execFileSync('swift',['build','-c','release','--show-bin-path'],{cwd:root,encoding:'utf8'}).trim();
mkdirSync(join(contents,'MacOS'),{recursive:true});mkdirSync(join(contents,'Frameworks'),{recursive:true});
copyFileSync(join(bin,'DeepSeekRemoteAgent'),join(contents,'MacOS/DeepSeekRemoteAgent'));
// Remove debug symbols, including the builder's absolute source/object paths.
execFileSync('/usr/bin/strip',['-S',join(contents,'MacOS/DeepSeekRemoteAgent')]);
function find(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.name.startsWith('macos-')&&existsSync(join(p,'WebRTC.framework')))return join(p,'WebRTC.framework');if(e.isDirectory()){const result=find(p);if(result)return result;}}}
const framework=find(join(root,'Vendor'));if(!framework)throw Error('WebRTC macOS framework missing');
execFileSync('/usr/bin/ditto',[framework,join(contents,'Frameworks/WebRTC.framework')]);
writeFileSync(join(contents,'Info.plist'),`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>wang.pipilu.deepseek.remote</string><key>CFBundleName</key><string>DeepSeek Remote</string><key>CFBundleExecutable</key><string>DeepSeekRemoteAgent</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleShortVersionString</key><string>0.4.1</string><key>CFBundleVersion</key><string>5</string><key>LSUIElement</key><true/><key>LSMinimumSystemVersion</key><string>13.0</string><key>NSScreenCaptureUsageDescription</key><string>在本人已认证的手机或 iPad 上查看这台 Mac 的桌面。</string><key>NSHighResolutionCapable</key><true/></dict></plist>`);
execFileSync('/usr/bin/codesign',['--force','--deep','--sign','-',app],{stdio:'inherit'});
execFileSync('/usr/bin/codesign',['--verify','--deep','--strict',app],{stdio:'inherit'});
mkdirSync(join(contents,'Resources'),{recursive:true});
copyFileSync(join(root,'Vendor/WebRTC.xcframework/LICENSE'),join(contents,'Resources/WebRTC-LICENSE'));
// Sign after adding the license, then archive with framework symlinks preserved.
execFileSync('/usr/bin/codesign',['--force','--deep','--sign','-',app],{stdio:'inherit'});
const zip=resolve('agent/DeepSeekRemoteAgent.zip');
execFileSync('/usr/bin/ditto',['-c','-k','--keepParent',app,zip]);
writeFileSync(resolve('agent/manifest.json'),JSON.stringify({version:'0.4.1',sha256:createHash('sha256').update(readFileSync(zip)).digest('hex')},null,2)+'\n');
console.log('Native remote agent built and signed.');
