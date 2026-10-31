// swift-tools-version: 5.10
import PackageDescription
let package = Package(
    name: "DeepSeekRemoteAgent",
    platforms: [.macOS(.v13)],
    products: [.executable(name: "DeepSeekRemoteAgent", targets: ["RemoteDesktopAgent"])],
    targets: [
        .binaryTarget(name: "WebRTC", path: "Vendor/WebRTC.xcframework"),
        .executableTarget(name: "RemoteDesktopAgent", dependencies: ["WebRTC"])
    ]
)
