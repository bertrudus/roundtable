// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "Roundtable",
    platforms: [
        .iOS(.v18),
    ],
    products: [
        .library(
            name: "Roundtable",
            targets: ["Roundtable"]
        ),
    ],
    targets: [
        .target(
            name: "Roundtable",
            path: "Sources"
        ),
    ]
)
