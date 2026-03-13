import SwiftUI

@main
struct RoundtableApp: App {
    /// Configure the base URL of the Next.js backend.
    /// Change this to your server's address (e.g., ngrok URL for remote testing).
    private let baseURL: URL = {
        if let envURL = ProcessInfo.processInfo.environment["ROUNDTABLE_API_URL"],
           let url = URL(string: envURL) {
            return url
        }
        return URL(string: "http://localhost:3000")!
    }()

    var body: some Scene {
        WindowGroup {
            ContentView(baseURL: baseURL)
        }
    }
}
