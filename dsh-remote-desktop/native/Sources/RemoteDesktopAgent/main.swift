import AppKit
import ApplicationServices
import ScreenCaptureKit
import WebRTC
import QuartzCore

// The parent owns stdin/stdout; there is no listening control port.
let outputLock = NSLock()
func emit(_ value: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: value) else { return }
    outputLock.lock(); defer { outputLock.unlock() }
    FileHandle.standardOutput.write(data); FileHandle.standardOutput.write(Data([10]))
}
func displayInventory() -> [[String:Any]] {
    var ids=[CGDirectDisplayID](repeating:0,count:32),count:UInt32=0
    guard CGGetActiveDisplayList(32,&ids,&count) == .success else{return []}
    return ids.prefix(Int(count)).map { id in
        let screen=NSScreen.screens.first { ($0.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value==id }
        let mode=CGDisplayCopyDisplayMode(id)
        return ["id":id,"name":screen?.localizedName ?? "显示器 \(id)","width":mode?.pixelWidth ?? CGDisplayPixelsWide(id),"height":mode?.pixelHeight ?? CGDisplayPixelsHigh(id),"main":id==CGMainDisplayID()]
    }
}
func permissions() -> [String: Any] {
    ["type": "permissions", "screen": CGPreflightScreenCaptureAccess(), "input": AXIsProcessTrusted(), "displays":displayInventory()]
}

final class InputController {
    var heldKeys = Set<CGKeyCode>()
    var heldButtons = Set<Int>()
    var bounds = CGRect.zero
    var lastPoint = CGPoint.zero
    let test: Bool
    init(test: Bool) { self.test = test }
    let keyCodes: [String: CGKeyCode] = [
        "KeyA":0,"KeyS":1,"KeyD":2,"KeyF":3,"KeyH":4,"KeyG":5,"KeyZ":6,"KeyX":7,"KeyC":8,"KeyV":9,"KeyB":11,
        "KeyQ":12,"KeyW":13,"KeyE":14,"KeyR":15,"KeyY":16,"KeyT":17,"Digit1":18,"Digit2":19,"Digit3":20,"Digit4":21,
        "Digit6":22,"Digit5":23,"Equal":24,"Digit9":25,"Digit7":26,"Minus":27,"Digit8":28,"Digit0":29,"BracketRight":30,
        "KeyO":31,"KeyU":32,"BracketLeft":33,"KeyI":34,"KeyP":35,"Enter":36,"KeyL":37,"KeyJ":38,"Quote":39,
        "KeyK":40,"Semicolon":41,"Backslash":42,"Comma":43,"Slash":44,"KeyN":45,"KeyM":46,"Period":47,
        "Tab":48,"Space":49,"Backquote":50,"Backspace":51,"Escape":53,"MetaLeft":55,"MetaRight":54,
        "ShiftLeft":56,"ShiftRight":60,"AltLeft":58,"AltRight":61,"ControlLeft":59,"ControlRight":62,
        "ArrowLeft":123,"ArrowRight":124,"ArrowDown":125,"ArrowUp":126,"Delete":117,"Home":115,"End":119,
        "PageUp":116,"PageDown":121,"F1":122,"F2":120,"F3":99,"F4":118,"F5":96,"F6":97,"F7":98,"F8":100,"F9":101,"F10":109,"F11":103,"F12":111]
    func flags(_ value: [String:Any]) -> CGEventFlags {
        var f = CGEventFlags()
        if value["meta"] as? Bool == true { f.insert(.maskCommand) }
        if value["shift"] as? Bool == true { f.insert(.maskShift) }
        if value["alt"] as? Bool == true { f.insert(.maskAlternate) }
        if value["ctrl"] as? Bool == true { f.insert(.maskControl) }
        return f
    }
    func postKey(_ key: CGKeyCode, down: Bool, flags: CGEventFlags = []) {
        if down { heldKeys.insert(key) } else { heldKeys.remove(key) }
        guard !test else { return }
        let e = CGEvent(keyboardEventSource:nil, virtualKey:key, keyDown:down); e?.flags = flags; e?.post(tap:.cghidEventTap)
    }
    func handle(_ m: [String:Any]) -> Bool {
        guard test || AXIsProcessTrusted(), let type = m["type"] as? String else { return false }
        switch type {
        case "pointer":
            guard let x=m["x"] as? Double, let y=m["y"] as? Double, x.isFinite,y.isFinite,(0...1).contains(x),(0...1).contains(y),
                  let action=m["action"] as? String,["down","up","move"].contains(action) else { return false }
            let button=m["button"] as? Int ?? 0
            guard (0...2).contains(button) else { return false }
            lastPoint=CGPoint(x:bounds.minX+x*bounds.width,y:bounds.minY+y*bounds.height)
            let right = button == 2
            let kind: CGEventType
            if action == "down" { heldButtons.insert(button); kind=right ? .rightMouseDown : .leftMouseDown }
            else if action == "up" { heldButtons.remove(button); kind=right ? .rightMouseUp : .leftMouseUp }
            else { kind=heldButtons.contains(0) ? .leftMouseDragged : heldButtons.contains(2) ? .rightMouseDragged : .mouseMoved }
            if !test { let e=CGEvent(mouseEventSource:nil,mouseType:kind,mouseCursorPosition:lastPoint,mouseButton:right ? .right : .left);e?.flags=flags(m);e?.post(tap:.cghidEventTap) }
        case "key":
            guard let code=m["code"] as? String,let key=keyCodes[code],let down=m["down"] as? Bool else { return false }
            postKey(key,down:down,flags:flags(m))
        case "shortcut":
            guard let code=m["code"] as? String,let key=keyCodes[code] else { return false }
            postKey(key,down:true,flags:flags(m));postKey(key,down:false,flags:flags(m))
        case "text":
            guard let text=m["text"] as? String,!text.isEmpty,text.utf16.count<=2048 else { return false }
            if !test {
                let chars=Array(text.utf16)
                // One composed text event; its contents never enter diagnostics.
                for down in [true,false] {
                    let e=CGEvent(keyboardEventSource:nil,virtualKey:0,keyDown:down)
                    e?.keyboardSetUnicodeString(stringLength:chars.count,unicodeString:chars);e?.post(tap:.cghidEventTap)
                }
            }
        case "wheel":
            guard let dx=m["dx"] as? Double,let dy=m["dy"] as? Double,dx.isFinite,dy.isFinite else{return false}
            if !test { CGEvent(scrollWheelEvent2Source:nil,units:.pixel,wheelCount:2,wheel1:Int32(max(-600,min(600,-dy))),wheel2:Int32(max(-600,min(600,-dx))),wheel3:0)?.post(tap:.cghidEventTap) }
        case "release": release()
        default:return false
        }
        return true
    }
    func release() {
        for key in Array(heldKeys) { postKey(key,down:false) }
        for button in heldButtons { if !test { CGEvent(mouseEventSource:nil,mouseType:button == 2 ? .rightMouseUp:.leftMouseUp,mouseCursorPosition:lastPoint,mouseButton:button == 2 ? .right:.left)?.post(tap:.cghidEventTap) } }
        heldButtons.removeAll()
    }
}

final class DesktopSession: NSObject, RTCPeerConnectionDelegate, RTCDataChannelDelegate, SCStreamOutput, SCStreamDelegate {
    let factory=RTCPeerConnectionFactory(encoderFactory:RTCDefaultVideoEncoderFactory(),decoderFactory:RTCDefaultVideoDecoderFactory())
    var peer: RTCPeerConnection?
    var source: RTCVideoSource?
    var capturer: RTCVideoCapturer?
    var stream: SCStream?
    var timer: DispatchSourceTimer?
    var input: InputController
    var channel: RTCDataChannel?
    var displayID:CGDirectDisplayID=0
    var quality="1440"
    var responsive=true
    var videoSender:RTCRtpSender?
    var count=0
    var stopping=false
    var candidateQueue: [RTCIceCandidate]=[]
    var remoteSet=false
    let test: Bool
    init(test:Bool) { self.test=test;input=InputController(test:test);super.init() }
    func start(_ options:[String:Any]) {
        guard peer == nil else { return }
        if !test && (!CGPreflightScreenCaptureAccess() || !AXIsProcessTrusted()) { emit(permissions());emit(["type":"error","code":"permissions-required"]);return }
        displayID=CGDirectDisplayID(options["displayId"] as? UInt32 ?? 0)
        quality=options["quality"] as? String ?? "1440"
        responsive=(options["priority"] as? String ?? "responsive")=="responsive"
        guard ["720","1080","1440","2160"].contains(quality) else {emit(["type":"error","code":"invalid-request"]);return}
        let config=RTCConfiguration();config.sdpSemantics = .unifiedPlan
        config.iceServers=(options["iceServers"] as? [[String:Any]] ?? []).compactMap { item in
            let urls=(item["urls"] as? [String]) ?? (item["urls"] as? String).map{[$0]} ?? []
            return urls.isEmpty ? nil : RTCIceServer(urlStrings:urls,username:item["username"] as? String ?? "",credential:item["credential"] as? String ?? "")
        }
        if options["relayOnly"] as? Bool == true { config.iceTransportPolicy = .relay }
        peer=factory.peerConnection(with:config,constraints:RTCMediaConstraints(mandatoryConstraints:nil,optionalConstraints:["DtlsSrtpKeyAgreement":"true"]),delegate:self)
        let src=factory.videoSource(forScreenCast:true);source=src;capturer=RTCVideoCapturer(delegate:src)
        let track=factory.videoTrack(with:src,trackId:"desktop-video")
        videoSender=peer?.add(track,streamIds:["desktop"])
        if test { startPattern() }
        else { Task { await self.startCapture() } }
        emit(["type":"ready","testPattern":test])
    }
    func receive(_ m:[String:Any]) {
        guard !stopping,let type=m["type"] as? String else { return }
        if type=="start" { start(m) }
        else if type=="offer",let sdp=m["sdp"] as? String,sdp.utf8.count<262144 {
            peer?.setRemoteDescription(RTCSessionDescription(type:.offer,sdp:sdp)) { error in
                if error != nil { emit(["type":"error","code":"negotiation-failed"]);return }
                self.remoteSet=true
                for c in self.candidateQueue { self.peer?.add(c,completionHandler:{_ in}) };self.candidateQueue=[]
                self.peer?.answer(for:RTCMediaConstraints(mandatoryConstraints:nil,optionalConstraints:nil)) { desc,error in
                    guard let desc=desc,error==nil else {emit(["type":"error","code":"negotiation-failed"]);return}
                    self.peer?.setLocalDescription(desc) { error in
                        if error==nil { self.configureEncoder();emit(["type":"answer","sdp":desc.sdp]) }
                    }
                }
            }
        } else if type=="candidate",let candidate=m["candidate"] as? String,candidate.utf8.count<8192 {
            let c=RTCIceCandidate(sdp:candidate,sdpMLineIndex:Int32(m["sdpMLineIndex"] as? Int ?? 0),sdpMid:m["sdpMid"] as? String)
            if remoteSet { peer?.add(c,completionHandler:{_ in}) } else if candidateQueue.count<100 {candidateQueue.append(c)}
        } else if type=="stop" { shutdown() }
    }
    func configureEncoder() {
        guard let sender=videoSender else{return}
        let parameters=sender.parameters
        let bitrate=["720":4_000_000,"1080":8_000_000,"1440":16_000_000,"2160":28_000_000][quality]!
        for encoding in parameters.encodings {encoding.maxBitrateBps=NSNumber(value:bitrate);encoding.maxFramerate=30}
        parameters.degradationPreference=NSNumber(value:(responsive ? RTCDegradationPreference.maintainFramerate : RTCDegradationPreference.maintainResolution).rawValue)
        sender.parameters=parameters
    }
    @MainActor func startCapture() async {
        do {
            let content=try await SCShareableContent.excludingDesktopWindows(false,onScreenWindowsOnly:true)
            guard let display=content.displays.first(where:{$0.displayID==(displayID==0 ? CGMainDisplayID():displayID)}) else {emit(["type":"error","code":"display-unavailable"]);self.shutdown();return}
            let bounds=CGDisplayBounds(display.displayID);input.bounds=bounds
            let config=SCStreamConfiguration()
            let mode=CGDisplayCopyDisplayMode(display.displayID)
            let width=mode?.pixelWidth ?? display.width,height=mode?.pixelHeight ?? display.height
            let target=Double(Int(quality) ?? 1440)
            let ratio=min(1,min(target*16/9/Double(width),target/Double(height)))
            config.width=max(2,Int(Double(width)*ratio)/2*2);config.height=max(2,Int(Double(height)*ratio)/2*2)
            config.minimumFrameInterval=CMTime(value:1,timescale:30);config.queueDepth=2;config.showsCursor=true;config.capturesAudio=false
            config.pixelFormat=kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange
            let capture=SCStream(filter:SCContentFilter(display:display,excludingWindows:[]),configuration:config,delegate:self)
            try capture.addStreamOutput(self,type:.screen,sampleHandlerQueue:DispatchQueue(label:"desktop.capture"))
            if stopping { return };stream=capture
            try await capture.startCapture()
            emit(["type":"capture","width":config.width,"height":config.height,"displayId":display.displayID,"quality":quality])
        } catch { emit(["type":"error","code":"capture-failed"]);self.shutdown() }
    }
    func stream(_ stream:SCStream,didOutputSampleBuffer sampleBuffer:CMSampleBuffer,of type:SCStreamOutputType) {
        guard !stopping,type == .screen,CMSampleBufferIsValid(sampleBuffer),let image=CMSampleBufferGetImageBuffer(sampleBuffer),let cap=capturer else{return}
        let time=CMSampleBufferGetPresentationTimeStamp(sampleBuffer).seconds
        guard time.isFinite else{return}
        // Do not spend encoder time catching up on obsolete desktop frames.
        if CACurrentMediaTime()-time>0.15{return}
        source?.capturer(cap,didCapture:RTCVideoFrame(buffer:RTCCVPixelBuffer(pixelBuffer:image),rotation:._0,timeStampNs:Int64(time*1_000_000_000)))
    }
    func stream(_ stream:SCStream,didStopWithError error:Error) { emit(["type":"error","code":"capture-stopped"]);shutdown() }
    func startPattern() {
        input.bounds=CGRect(x:0,y:0,width:960,height:540)
        let t=DispatchSource.makeTimerSource(queue:DispatchQueue(label:"desktop.pattern"));timer=t
        t.schedule(deadline:.now(),repeating:1.0/15)
        t.setEventHandler { [weak self] in self?.patternFrame() };t.resume()
    }
    func patternFrame() {
        guard !stopping,let cap=capturer else{return};count+=1
        var buffer:CVPixelBuffer?
        guard CVPixelBufferCreate(kCFAllocatorDefault,960,540,kCVPixelFormatType_32BGRA,[kCVPixelBufferCGImageCompatibilityKey:true,kCVPixelBufferCGBitmapContextCompatibilityKey:true] as CFDictionary,&buffer)==kCVReturnSuccess,let image=buffer else{return}
        CVPixelBufferLockBaseAddress(image,[]);defer{CVPixelBufferUnlockBaseAddress(image,[])}
        if let context=CGContext(data:CVPixelBufferGetBaseAddress(image),width:960,height:540,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(image),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedFirst.rawValue|CGBitmapInfo.byteOrder32Little.rawValue) {
            let colors:[CGColor]=[CGColor(red:0.12,green:0.2,blue:0.4,alpha:1),CGColor(red:0.2,green:0.5,blue:0.8,alpha:1),CGColor(red:0.1,green:0.7,blue:0.5,alpha:1)]
            for i in 0..<3 {context.setFillColor(colors[i]);context.fill(CGRect(x:i*320,y:0,width:320,height:540))}
            context.setFillColor(CGColor(gray:1,alpha:1));context.fill(CGRect(x:(count*6)%900,y:220,width:60,height:60))
        }
        source?.capturer(cap,didCapture:RTCVideoFrame(buffer:RTCCVPixelBuffer(pixelBuffer:image),rotation:._0,timeStampNs:Int64(CACurrentMediaTime()*1_000_000_000)))
    }
    func shutdown() {
        guard !stopping else{return};stopping=true
        input.release();timer?.cancel();timer=nil;channel?.close();peer?.close();peer=nil
        emit(["type":"closed"])
        let capture=stream;stream=nil
        Task { try? await capture?.stopCapture();DispatchQueue.main.async { NSApp.terminate(nil) } }
        DispatchQueue.main.asyncAfter(deadline:.now()+2) { NSApp.terminate(nil) }
    }
    func dataChannelDidChangeState(_ dataChannel:RTCDataChannel) {
        if dataChannel.readyState == .open {emit(["type":"input-ready"])}
        else if dataChannel.readyState == .closed {DispatchQueue.main.async{self.input.release()}}
    }
    func dataChannel(_ dataChannel:RTCDataChannel,didReceiveMessageWith buffer:RTCDataBuffer) {
        guard !stopping,!buffer.isBinary,buffer.data.count<=16384,let m=(try? JSONSerialization.jsonObject(with:buffer.data)) as? [String:Any] else{return}
        DispatchQueue.main.async {
            guard !self.stopping else{return}
            let ok=self.input.handle(m)
            let ack:[String:Any]=["type":"ack","id":m["id"] as? Int ?? 0,"ok":ok,"testPattern":self.test]
            if let data=try? JSONSerialization.data(withJSONObject:ack){_ = dataChannel.sendData(RTCDataBuffer(data:data,isBinary:false))}
        }
    }
    func peerConnection(_ peerConnection:RTCPeerConnection,didGenerate candidate:RTCIceCandidate) { emit(["type":"candidate","candidate":candidate.sdp,"sdpMid":candidate.sdpMid ?? "0","sdpMLineIndex":candidate.sdpMLineIndex]) }
    func peerConnection(_ peerConnection:RTCPeerConnection,didOpen dataChannel:RTCDataChannel) {if dataChannel.label=="input" {channel=dataChannel;dataChannel.delegate=self}}
    func peerConnection(_ peerConnection:RTCPeerConnection,didChange newState:RTCPeerConnectionState) {emit(["type":"connection","state":newState.rawValue]);if newState == .failed {DispatchQueue.main.async{self.shutdown()}}}
    func peerConnection(_ peerConnection:RTCPeerConnection,didChange stateChanged:RTCSignalingState) {}
    func peerConnection(_ peerConnection:RTCPeerConnection,didAdd stream:RTCMediaStream) {}
    func peerConnection(_ peerConnection:RTCPeerConnection,didRemove stream:RTCMediaStream) {}
    func peerConnectionShouldNegotiate(_ peerConnection:RTCPeerConnection) {}
    func peerConnection(_ peerConnection:RTCPeerConnection,didChange newState:RTCIceConnectionState) {
        if [.disconnected,.failed,.closed].contains(newState) { DispatchQueue.main.async {self.input.release()} }
    }
    func peerConnection(_ peerConnection:RTCPeerConnection,didChange newState:RTCIceGatheringState) {}
    func peerConnection(_ peerConnection:RTCPeerConnection,didRemove candidates:[RTCIceCandidate]) {}
}

final class AppDelegate:NSObject,NSApplicationDelegate {
    var session:DesktopSession?
    var item:NSStatusItem?
    var setupWindow:NSWindow?
    let setup=CommandLine.arguments.contains("--setup")
    let validation=CommandLine.arguments.contains("--validation-window")
    var validationText:NSTextField?
    var validationPassword:NSSecureTextField?
    var validationResult:NSTextField?
    func applicationDidFinishLaunching(_ notification:Notification) {
        NSApp.setActivationPolicy(.accessory)
        let status=NSStatusBar.system.statusItem(withLength:NSStatusItem.variableLength);item=status;status.button?.title="远控"
        let menu=NSMenu();menu.addItem(withTitle:"DeepSeek 远程桌面",action:nil,keyEquivalent:"")
        let permission=menu.addItem(withTitle:"权限设置…",action:#selector(showSetup),keyEquivalent:"");permission.target=self
        let stop=menu.addItem(withTitle:"断开远程连接",action:#selector(stopSession),keyEquivalent:"");stop.target=self
        status.menu=menu
        if setup {showSetup();return}
        if validation {showValidation();return}
        RTCInitializeSSL()
        let s=DesktopSession(test:CommandLine.arguments.contains("--test-pattern"));session=s
        emit(["type":"started"])
        DispatchQueue.global(qos:.userInitiated).async {
            while let line=readLine() {
                guard line.utf8.count<=262144,let data=line.data(using:.utf8),let m=(try? JSONSerialization.jsonObject(with:data)) as? [String:Any] else {continue}
                DispatchQueue.main.async {s.receive(m)}
            }
            DispatchQueue.main.async {s.shutdown()}
        }
    }
    @objc func stopSession(){session?.shutdown();if session==nil{NSApp.terminate(nil)}}
    @objc func grantScreen(){_ = CGRequestScreenCaptureAccess()}
    @objc func grantInput(){let options=[kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String:true] as CFDictionary;_ = AXIsProcessTrustedWithOptions(options)}
    @objc func showSetup(){
        if let w=setupWindow {w.makeKeyAndOrderFront(nil);NSApp.activate(ignoringOtherApps:true);return}
        let w=NSWindow(contentRect:NSRect(x:0,y:0,width:460,height:230),styleMask:[.titled,.closable],backing:.buffered,defer:false);w.title="DeepSeek 远程桌面权限";w.center()
        let text=NSTextField(wrappingLabelWithString:"允许 DeepSeek 远程桌面查看屏幕和执行键鼠操作。连接只对已认证的设备开放，可从菜单栏随时断开。");text.frame=NSRect(x:24,y:140,width:412,height:65);w.contentView?.addSubview(text)
        let screen=NSButton(title:"授权屏幕录制",target:self,action:#selector(grantScreen));screen.frame=NSRect(x:24,y:80,width:190,height:38);w.contentView?.addSubview(screen)
        let input=NSButton(title:"授权辅助功能",target:self,action:#selector(grantInput));input.frame=NSRect(x:240,y:80,width:190,height:38);w.contentView?.addSubview(input)
        let close=NSButton(title:"完成",target:self,action:#selector(closeSetup));close.frame=NSRect(x:330,y:20,width:100,height:36);w.contentView?.addSubview(close)
        setupWindow=w;w.makeKeyAndOrderFront(nil);NSApp.activate(ignoringOtherApps:true)
    }
    @objc func closeSetup(){setupWindow?.orderOut(nil);if setup{NSApp.terminate(nil)}}
    func showValidation(){
        let w=NSWindow(contentRect:NSRect(x:0,y:0,width:540,height:320),styleMask:[.titled,.closable],backing:.buffered,defer:false)
        w.title="远程桌面输入验收";w.level = .floating;w.collectionBehavior=[.canJoinAllSpaces,.fullScreenAuxiliary]
        if let main=NSScreen.screens.first(where:{($0.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value==CGMainDisplayID()}) {
            w.setFrameOrigin(NSPoint(x:main.visibleFrame.midX-270,y:main.visibleFrame.midY-160))
        } else {w.center()};setupWindow=w
        let title=NSTextField(labelWithString:"远程桌面输入验收（只使用测试内容）");title.frame=NSRect(x:24,y:264,width:490,height:28);w.contentView?.addSubview(title)
        let text=NSTextField();text.frame=NSRect(x:24,y:207,width:490,height:32);text.placeholderString="测试文字";text.setAccessibilityLabel("测试文字");w.contentView?.addSubview(text);validationText=text
        let password=NSSecureTextField();password.frame=NSRect(x:24,y:148,width:490,height:32);password.placeholderString="测试密码";password.setAccessibilityLabel("测试密码");w.contentView?.addSubview(password);validationPassword=password
        let check=NSButton(title:"校验输入和点击",target:self,action:#selector(validateInput));check.frame=NSRect(x:24,y:86,width:200,height:38);w.contentView?.addSubview(check)
        let result=NSTextField(wrappingLabelWithString:"等待从远控页面输入。");result.frame=NSRect(x:24,y:22,width:490,height:50);w.contentView?.addSubview(result);validationResult=result
        w.makeKeyAndOrderFront(nil);NSApp.activate(ignoringOtherApps:true)
    }
    @objc func validateInput(){
        let textOK=validationText?.stringValue=="DeepSeek远控测试123!"
        let passwordOK=validationPassword?.stringValue=="Remote-1234!"
        validationResult?.stringValue=textOK&&passwordOK ? "校验成功：文字、密码和鼠标点击均已到达 Mac。" : "等待正确测试输入。文字：\(textOK ? "通过":"未通过")；密码：\(passwordOK ? "通过":"未通过")。"
    }
    func applicationWillTerminate(_ notification:Notification){session?.input.release()}
}

if CommandLine.arguments.contains("--permissions") {emit(permissions());exit(0)}
let delegate=AppDelegate();NSApplication.shared.delegate=delegate;NSApplication.shared.run()
