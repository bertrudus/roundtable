import Foundation

/// Represents a parsed Server-Sent Event from the discussion stream.
enum SSEEvent: Sendable {
    case turnStart(participantId: String, turnNumber: Int)
    case chunk(participantId: String, content: String)
    case turnEnd(message: Message)
    case humanWaiting(participantId: String, turnNumber: Int)
    case awaitReady
    case summary(text: String)
    case error(message: String)
    case complete

    /// Parse a raw JSON string from an SSE `data:` line into an SSEEvent.
    static func parse(from jsonString: String) -> SSEEvent? {
        guard let data = jsonString.data(using: .utf8) else { return nil }

        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String
        else { return nil }

        switch type {
        case "turn:start":
            guard let participantId = json["participantId"] as? String,
                  let turnNumber = json["turnNumber"] as? Int
            else { return nil }
            return .turnStart(participantId: participantId, turnNumber: turnNumber)

        case "chunk":
            guard let participantId = json["participantId"] as? String,
                  let content = json["content"] as? String
            else { return nil }
            return .chunk(participantId: participantId, content: content)

        case "turn:end":
            guard let messageDict = json["message"] else { return nil }
            let messageData = try? JSONSerialization.data(withJSONObject: messageDict)
            guard let msgData = messageData,
                  let message = try? JSONDecoder().decode(Message.self, from: msgData)
            else { return nil }
            return .turnEnd(message: message)

        case "human:waiting":
            guard let participantId = json["participantId"] as? String,
                  let turnNumber = json["turnNumber"] as? Int
            else { return nil }
            return .humanWaiting(participantId: participantId, turnNumber: turnNumber)

        case "await:ready":
            return .awaitReady

        case "summary":
            guard let summary = json["summary"] as? String else { return nil }
            return .summary(text: summary)

        case "error":
            let errorMsg = json["error"] as? String ?? "Unknown error"
            return .error(message: errorMsg)

        case "complete":
            return .complete

        default:
            return nil
        }
    }
}
