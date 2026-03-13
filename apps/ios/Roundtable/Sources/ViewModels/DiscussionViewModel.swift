import Foundation
import SwiftUI

/// Main view model managing the discussion lifecycle, SSE stream, and TTS playback.
@MainActor
@Observable
final class DiscussionViewModel {
    // MARK: - Published State

    var session: Session?
    var messages: [Message] = []
    var currentSpeakerId: String?
    var streamingContent: String = ""
    var streamingParticipantId: String?
    var isActive: Bool = false
    var isConnecting: Bool = false
    var waitingForHuman: Bool = false
    var waitingHumanParticipantId: String?
    var awaitingReady: Bool = false
    var summary: String?
    var errorMessage: String?
    var currentTurn: Int = 0

    // TTS
    var ttsEnabled: Bool = false
    let audioPlayer = AudioPlayer()

    // MARK: - Private

    private let apiClient: APIClient
    private var streamTask: Task<Void, Never>?

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Session Creation

    func createSession(config: SessionConfig) async {
        do {
            let response = try await apiClient.createSession(config: config)
            session = Session(
                id: response.id,
                config: config,
                status: .configuring,
                currentTurn: 0,
                currentSpeakerId: nil
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Discussion Lifecycle

    func startDiscussion() async {
        guard let sessionId = session?.id else { return }

        isConnecting = true
        isActive = true
        errorMessage = nil
        messages = []
        summary = nil
        currentTurn = 0
        streamingContent = ""

        streamTask = Task {
            do {
                let (bytes, _) = try await apiClient.startDiscussion(sessionId: sessionId)
                isConnecting = false

                for await event in SSEParser.events(from: bytes) {
                    if Task.isCancelled { break }
                    handleEvent(event)
                }
            } catch {
                if !Task.isCancelled {
                    errorMessage = error.localizedDescription
                }
            }
            isActive = false
            isConnecting = false
        }
    }

    func stopDiscussion() async {
        guard let sessionId = session?.id else { return }
        streamTask?.cancel()
        streamTask = nil
        isActive = false

        do {
            try await apiClient.stopDiscussion(sessionId: sessionId)
            session?.status = .completed
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func signalReady() async {
        guard let sessionId = session?.id else { return }
        awaitingReady = false
        do {
            try await apiClient.signalReady(sessionId: sessionId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func submitHumanMessage(content: String) async {
        guard let sessionId = session?.id else { return }
        waitingForHuman = false
        do {
            try await apiClient.submitHumanMessage(sessionId: sessionId, content: content)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - TTS

    func speakMessage(_ message: Message) async {
        guard ttsEnabled else { return }

        // Find the participant to get their voiceId
        guard let participant = session?.config.participants.first(where: { $0.id == message.participantId }),
              let voiceId = participant.voiceId
        else { return }

        do {
            let audioData = try await apiClient.fetchTTSAudio(text: message.content, voiceId: voiceId)
            audioPlayer.play(data: audioData)
        } catch {
            // TTS failure is non-fatal
        }
    }

    // MARK: - Event Handling

    private func handleEvent(_ event: SSEEvent) {
        switch event {
        case .turnStart(let participantId, let turnNumber):
            currentSpeakerId = participantId
            currentTurn = turnNumber
            streamingContent = ""
            streamingParticipantId = participantId

        case .chunk(_, let content):
            streamingContent += content

        case .turnEnd(let message):
            messages.append(message)
            streamingContent = ""
            streamingParticipantId = nil
            currentSpeakerId = nil

            // Auto-play TTS for completed messages
            if ttsEnabled {
                Task {
                    await speakMessage(message)
                }
            }

        case .humanWaiting(let participantId, _):
            waitingForHuman = true
            waitingHumanParticipantId = participantId
            currentSpeakerId = participantId

        case .awaitReady:
            awaitingReady = true

        case .summary(let text):
            summary = text

        case .error(let message):
            errorMessage = message

        case .complete:
            isActive = false
            currentSpeakerId = nil
            session?.status = .completed
        }
    }

    // MARK: - Helpers

    func participant(for id: String) -> ParticipantConfig? {
        session?.config.participants.first(where: { $0.id == id })
    }

    func reset() {
        streamTask?.cancel()
        streamTask = nil
        session = nil
        messages = []
        currentSpeakerId = nil
        streamingContent = ""
        streamingParticipantId = nil
        isActive = false
        isConnecting = false
        waitingForHuman = false
        awaitingReady = false
        summary = nil
        errorMessage = nil
        currentTurn = 0
        audioPlayer.stop()
    }
}
