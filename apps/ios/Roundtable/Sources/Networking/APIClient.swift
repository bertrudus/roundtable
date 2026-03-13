import Foundation

/// Handles all HTTP communication with the Roundtable Next.js backend.
final class APIClient: Sendable {
    let baseURL: URL

    init(baseURL: URL) {
        self.baseURL = baseURL
    }

    // MARK: - Session CRUD

    /// POST /api/sessions - Create a new discussion session.
    func createSession(config: SessionConfig) async throws -> CreateSessionResponse {
        let url = baseURL.appendingPathComponent("api/sessions")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = CreateSessionRequest(config: config)
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)
        try validateHTTPResponse(response)
        return try JSONDecoder().decode(CreateSessionResponse.self, from: data)
    }

    /// GET /api/sessions - List all sessions.
    func listSessions() async throws -> [Session] {
        let url = baseURL.appendingPathComponent("api/sessions")
        let (data, response) = try await URLSession.shared.data(from: url)
        try validateHTTPResponse(response)
        return try JSONDecoder().decode([Session].self, from: data)
    }

    // MARK: - Stream Actions

    /// POST /api/ai/stream - Start discussion and return an SSE byte stream.
    func startDiscussion(sessionId: String) async throws -> (URLSession.AsyncBytes, URLResponse) {
        let url = baseURL.appendingPathComponent("api/ai/stream")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        // Long timeout for SSE streams
        request.timeoutInterval = 3600

        let body: [String: Any] = ["sessionId": sessionId]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 3600
        config.timeoutIntervalForResource = 3600
        let session = URLSession(configuration: config)
        return try await session.bytes(for: request)
    }

    /// POST /api/ai/stream with action: "stop"
    func stopDiscussion(sessionId: String) async throws {
        try await sendStreamAction(sessionId: sessionId, action: "stop")
    }

    /// POST /api/ai/stream with action: "ready"
    func signalReady(sessionId: String) async throws {
        try await sendStreamAction(sessionId: sessionId, action: "ready")
    }

    /// POST /api/ai/stream with action: "human_message"
    func submitHumanMessage(sessionId: String, content: String) async throws {
        try await sendStreamAction(sessionId: sessionId, action: "human_message", extraFields: ["content": content])
    }

    // MARK: - TTS

    /// POST /api/tts - Fetch audio data for text-to-speech.
    func fetchTTSAudio(text: String, voiceId: String) async throws -> Data {
        let url = baseURL.appendingPathComponent("api/tts")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: String] = ["text": text, "voiceId": voiceId]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        try validateHTTPResponse(response)
        return data
    }

    // MARK: - Helpers

    private func sendStreamAction(sessionId: String, action: String, extraFields: [String: String] = [:]) async throws {
        let url = baseURL.appendingPathComponent("api/ai/stream")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var body: [String: String] = ["sessionId": sessionId, "action": action]
        for (key, value) in extraFields {
            body[key] = value
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await URLSession.shared.data(for: request)
        try validateHTTPResponse(response)
    }

    private func validateHTTPResponse(_ response: URLResponse) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }
    }
}

// MARK: - APIError

enum APIError: LocalizedError {
    case invalidResponse
    case httpError(statusCode: Int)
    case decodingError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let code):
            return "HTTP error \(code)"
        case .decodingError(let error):
            return "Decoding error: \(error.localizedDescription)"
        }
    }
}
