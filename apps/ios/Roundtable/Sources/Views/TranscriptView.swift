import SwiftUI

/// Scrollable transcript of all discussion messages.
struct TranscriptView: View {
    let viewModel: DiscussionViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 16) {
                        ForEach(viewModel.messages) { message in
                            messageRow(message)
                                .id(message.id)
                        }

                        // Streaming content
                        if let speakerId = viewModel.streamingParticipantId,
                           !viewModel.streamingContent.isEmpty {
                            streamingRow(speakerId: speakerId)
                                .id("streaming")
                        }
                    }
                    .padding(20)
                }
                .onChange(of: viewModel.messages.count) { _, _ in
                    if let lastId = viewModel.messages.last?.id {
                        withAnimation {
                            proxy.scrollTo(lastId, anchor: .bottom)
                        }
                    }
                }
                .onChange(of: viewModel.streamingContent) { _, _ in
                    withAnimation {
                        proxy.scrollTo("streaming", anchor: .bottom)
                    }
                }
            }
            .background(Color.black)
            .navigationTitle("Transcript")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }

    private func messageRow(_ message: Message) -> some View {
        let participant = viewModel.participant(for: message.participantId)
        let color = Color(hex: participant?.color ?? "#FFFFFF")

        return HStack(alignment: .top, spacing: 12) {
            ParticipantAvatar(
                name: message.participantName,
                color: participant?.color ?? "#FFFFFF",
                avatarSeed: message.participantName,
                size: 36,
                showName: false
            )

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(message.participantName)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(color)

                    Text("Turn \(message.turnNumber)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                Text(message.content)
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.9))
                    .textSelection(.enabled)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(color.opacity(0.05))
        )
    }

    private func streamingRow(speakerId: String) -> some View {
        let participant = viewModel.participant(for: speakerId)
        let color = Color(hex: participant?.color ?? "#FFFFFF")

        return HStack(alignment: .top, spacing: 12) {
            ParticipantAvatar(
                name: participant?.name ?? "",
                color: participant?.color ?? "#FFFFFF",
                avatarSeed: participant?.name ?? "",
                size: 36,
                isSpeaking: true,
                showName: false
            )

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(participant?.name ?? "")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(color)

                    ProgressView()
                        .scaleEffect(0.6)
                        .tint(color)
                }

                Text(viewModel.streamingContent)
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.7))
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(color.opacity(0.05))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(color.opacity(0.2), lineWidth: 1)
                )
        )
    }
}
