import Foundation

/// Parses a raw SSE byte stream into structured SSEEvent values.
struct SSEParser {

    /// Asynchronously iterate over SSE events from a URLSession byte stream.
    static func events(from bytes: URLSession.AsyncBytes) -> AsyncStream<SSEEvent> {
        AsyncStream { continuation in
            let task = Task {
                var buffer = ""
                do {
                    for try await byte in bytes {
                        let char = Character(UnicodeScalar(byte))
                        buffer.append(char)

                        // SSE events are delimited by double newlines
                        while let range = buffer.range(of: "\n\n") {
                            let eventBlock = String(buffer[buffer.startIndex..<range.lowerBound])
                            buffer = String(buffer[range.upperBound...])

                            if let event = parseEventBlock(eventBlock) {
                                continuation.yield(event)
                                if case .complete = event {
                                    continuation.finish()
                                    return
                                }
                            }
                        }
                    }
                } catch {
                    if !Task.isCancelled {
                        continuation.yield(.error(message: error.localizedDescription))
                    }
                }
                continuation.finish()
            }

            continuation.onTermination = { _ in
                task.cancel()
            }
        }
    }

    private static func parseEventBlock(_ block: String) -> SSEEvent? {
        // Collect data lines from the block
        var dataLines: [String] = []
        for line in block.components(separatedBy: "\n") {
            if line.hasPrefix("data: ") {
                let content = String(line.dropFirst(6))
                dataLines.append(content)
            } else if line.hasPrefix("data:") {
                let content = String(line.dropFirst(5))
                dataLines.append(content)
            }
        }
        guard !dataLines.isEmpty else { return nil }
        let jsonString = dataLines.joined(separator: "\n")
        return SSEEvent.parse(from: jsonString)
    }
}
