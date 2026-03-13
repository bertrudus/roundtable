import SwiftUI

/// The main discussion view showing participants arranged around a circular table.
struct RoundTableView: View {
    @Bindable var viewModel: DiscussionViewModel
    @State private var showTranscript = false
    @State private var showHumanInput = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                topBar
                circularTable
                    .frame(maxHeight: .infinity)
                bottomControls
            }
        }
        .sheet(isPresented: $showTranscript) {
            TranscriptView(viewModel: viewModel)
        }
        .sheet(isPresented: $showHumanInput) {
            HumanInputView(
                participantName: humanParticipantName,
                onSubmit: { content in
                    Task {
                        await viewModel.submitHumanMessage(content: content)
                    }
                    showHumanInput = false
                }
            )
            .presentationDetents([.medium])
        }
        .onChange(of: viewModel.waitingForHuman) { _, waiting in
            if waiting {
                showHumanInput = true
            }
        }
    }

    // MARK: - Top Bar

    private var topBar: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(viewModel.session?.config.topic ?? "Discussion")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    statusBadge
                    if viewModel.currentTurn > 0 {
                        Text("Turn \(viewModel.currentTurn)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()

            Button {
                showTranscript = true
            } label: {
                Image(systemName: "text.justify.left")
                    .font(.title3)
                    .foregroundStyle(.white.opacity(0.7))
            }

            Button {
                viewModel.ttsEnabled.toggle()
            } label: {
                Image(systemName: viewModel.ttsEnabled ? "speaker.wave.2.fill" : "speaker.slash")
                    .font(.title3)
                    .foregroundStyle(viewModel.ttsEnabled ? .blue : .white.opacity(0.7))
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
    }

    private var statusBadge: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(statusColor)
                .frame(width: 6, height: 6)
            Text(statusText)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private var statusColor: Color {
        if viewModel.isActive { return .green }
        if viewModel.isConnecting { return .yellow }
        return .gray
    }

    private var statusText: String {
        if viewModel.isConnecting { return "Connecting..." }
        if viewModel.isActive { return "Live" }
        if viewModel.session?.status == .completed { return "Completed" }
        return "Ready"
    }

    // MARK: - Circular Table

    private var circularTable: some View {
        GeometryReader { geometry in
            let participants = viewModel.session?.config.participants ?? []
            let center = CGPoint(x: geometry.size.width / 2, y: geometry.size.height / 2)
            let radius = min(geometry.size.width, geometry.size.height) * 0.34
            let avatarSize: CGFloat = 56

            ZStack {
                // Table circle
                Circle()
                    .stroke(.white.opacity(0.08), lineWidth: 1)
                    .frame(width: radius * 2, height: radius * 2)
                    .position(center)

                Circle()
                    .fill(.white.opacity(0.03))
                    .frame(width: radius * 2, height: radius * 2)
                    .position(center)

                // Center content
                centerContent
                    .position(center)

                // Participants around the circle
                ForEach(Array(participants.enumerated()), id: \.element.id) { index, participant in
                    let angle = angleForParticipant(index: index, total: participants.count)
                    let x = center.x + radius * cos(angle)
                    let y = center.y + radius * sin(angle)

                    participantNode(participant: participant, avatarSize: avatarSize)
                        .position(x: x, y: y)
                }

                // Streaming content bubble
                if let speakerId = viewModel.streamingParticipantId,
                   !viewModel.streamingContent.isEmpty {
                    streamingBubble(speakerId: speakerId)
                        .position(x: center.x, y: center.y + radius + 60)
                }
            }
        }
    }

    private func angleForParticipant(index: Int, total: Int) -> CGFloat {
        let angleStep = (2 * CGFloat.pi) / CGFloat(total)
        // Start from top (-pi/2) and go clockwise
        return -CGFloat.pi / 2 + angleStep * CGFloat(index)
    }

    private func participantNode(participant: ParticipantConfig, avatarSize: CGFloat) -> some View {
        let isSpeaking = viewModel.currentSpeakerId == participant.id

        return ParticipantAvatar(
            name: participant.name,
            color: participant.color,
            avatarSeed: participant.name,
            size: avatarSize,
            isSpeaking: isSpeaking,
            showName: true
        )
    }

    private var centerContent: some View {
        VStack(spacing: 6) {
            if viewModel.summary != nil {
                Image(systemName: "doc.text")
                    .font(.title2)
                    .foregroundStyle(.blue)
                Text("Summary Ready")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                Text(viewModel.session?.config.topic ?? "")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(3)
                    .frame(maxWidth: 120)

                if viewModel.currentTurn > 0 {
                    Text("Turn \(viewModel.currentTurn)")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                }
            }
        }
    }

    private func streamingBubble(speakerId: String) -> some View {
        let participant = viewModel.participant(for: speakerId)
        let color = Color(hex: participant?.color ?? "#FFFFFF")

        return VStack(alignment: .leading, spacing: 4) {
            Text(participant?.name ?? "")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(color)

            Text(viewModel.streamingContent)
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.9))
                .lineLimit(4)
                .frame(maxWidth: 280, alignment: .leading)
        }
        .padding(10)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(.ultraThinMaterial)
                .environment(\.colorScheme, .dark)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(color.opacity(0.3), lineWidth: 1)
        )
        .transition(.opacity.combined(with: .scale(scale: 0.95)))
        .animation(.spring(response: 0.3), value: viewModel.streamingContent.isEmpty)
    }

    // MARK: - Bottom Controls

    private var bottomControls: some View {
        VStack(spacing: 12) {
            // Awaiting Ready indicator
            if viewModel.awaitingReady {
                Button {
                    Task { await viewModel.signalReady() }
                } label: {
                    HStack {
                        Image(systemName: "hand.raised.fill")
                        Text("Tap to Continue")
                    }
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(.blue.opacity(0.2))
                    )
                    .foregroundStyle(.blue)
                }
                .padding(.horizontal, 20)
            }

            // Error message
            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding(.horizontal, 20)
            }

            // Summary preview
            if let summary = viewModel.summary {
                NavigationLink {
                    SummaryView(summary: summary)
                } label: {
                    HStack {
                        Image(systemName: "doc.text.fill")
                        Text("View Summary")
                        Spacer()
                        Image(systemName: "chevron.right")
                    }
                    .font(.subheadline)
                    .foregroundStyle(.blue)
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(.blue.opacity(0.1))
                    )
                }
                .padding(.horizontal, 20)
            }

            // Start / Stop button
            HStack(spacing: 16) {
                if viewModel.isActive || viewModel.isConnecting {
                    Button {
                        Task { await viewModel.stopDiscussion() }
                    } label: {
                        HStack {
                            Image(systemName: "stop.fill")
                            Text("Stop")
                        }
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(.red.opacity(0.8))
                        )
                        .foregroundStyle(.white)
                    }
                } else {
                    Button {
                        Task { await viewModel.startDiscussion() }
                    } label: {
                        HStack {
                            Image(systemName: "play.fill")
                            Text("Start Discussion")
                        }
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(.blue)
                        )
                        .foregroundStyle(.white)
                    }
                    .disabled(viewModel.session == nil)
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 8)
        }
        .padding(.vertical, 12)
        .background(
            Rectangle()
                .fill(.ultraThinMaterial)
                .environment(\.colorScheme, .dark)
                .ignoresSafeArea(edges: .bottom)
        )
    }

    private var humanParticipantName: String {
        if let id = viewModel.waitingHumanParticipantId {
            return viewModel.participant(for: id)?.name ?? "You"
        }
        return "You"
    }
}
