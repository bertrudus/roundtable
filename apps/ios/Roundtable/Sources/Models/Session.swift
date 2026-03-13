import Foundation

// MARK: - Enums

enum SessionStatus: String, Codable, Sendable {
    case configuring
    case active
    case paused
    case completed
}

enum TurnMode: String, Codable, CaseIterable, Sendable {
    case roundRobin = "round-robin"
    case openFloor = "open-floor"
    case directed
}

enum ResponseLength: String, Codable, CaseIterable, Sendable {
    case brief
    case short
    case medium
    case long
}

enum AIProvider: String, Codable, CaseIterable, Sendable {
    case openai
    case anthropic
    case gemini
}

// MARK: - ParticipantConfig

struct ParticipantConfig: Codable, Identifiable, Sendable {
    let id: String
    let name: String
    let provider: AIProvider
    let model: String
    let systemPrompt: String
    var personality: String?
    var voiceId: String?
    var avatarUrl: String?
    let color: String
    var isHuman: Bool?
    var isChair: Bool?

    var avatarURL: URL? {
        let seed = name
        return URL(string: "https://api.dicebear.com/9.x/notionists-neutral/png?seed=\(seed)&size=128")
    }
}

// MARK: - SessionConfig

struct SessionConfig: Codable, Sendable {
    let topic: String
    var description: String?
    let turnMode: TurnMode
    var maxTurns: Int?
    var turnTimeLimit: Int?
    var responseLength: ResponseLength?
    var enableChair: Bool?
    let participants: [ParticipantConfig]
}

// MARK: - Session

struct Session: Codable, Identifiable, Sendable {
    let id: String
    let config: SessionConfig
    var status: SessionStatus
    var currentTurn: Int
    var currentSpeakerId: String?
    var createdAt: String?
    var updatedAt: String?
}

// MARK: - Create Session Request / Response

struct CreateSessionRequest: Codable, Sendable {
    let config: SessionConfig
}

struct CreateSessionResponse: Codable, Sendable {
    let id: String
    let status: String
}
