// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "MynahFM",
    platforms: [
        .macOS("15.0")
    ],
    products: [
        .library(
            name: "MynahFM",
            type: .static,
            targets: ["MynahFM"]
        )
    ],
    dependencies: [],
    targets: [
        .target(
            name: "MynahFM",
            dependencies: [],
            path: "Sources/MynahFM"
        )
    ]
)
