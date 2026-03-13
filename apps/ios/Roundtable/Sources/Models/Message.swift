import Foundation

enum MessageRole: String, Codable, Sendable {
    case system
    case assistant
    case user
    case moderator
}

struct Message: Codable, Identifiable, Sendable {
    let id: String
    let sessionId: String
    let participantId: String
    let participantName: String
    let role: MessageRole
    let content: String
    let turnNumber: Int
    var timestamp: String?
}
