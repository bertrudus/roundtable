import SwiftUI

/// View for configuring and creating a new roundtable discussion session.
struct CreateSessionView: View {
    let apiClient: APIClient
    let onSessionCreated: (Session, DiscussionViewModel) -> Void

    @State private var topic: String = ""
    @State private var description: String = ""
    @State private var selectedPersonaIds: Set<String> = Set(personas.prefix(3).map(\.id))
    @State private var turnMode: TurnMode = .roundRobin
    @State private var responseLength: ResponseLength = .medium
    @State private var maxTurns: Int = 10
    @State private var enableChair: Bool = true
    @State private var isCreating: Bool = false
    @State private var errorMessage: String?

    private let columns = [
        GridItem(.flexible(), spacing: 10),
        GridItem(.flexible(), spacing: 10),
        GridItem(.flexible(), spacing: 10),
        GridItem(.flexible(), spacing: 10),
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                headerSection
                topicSection
                personaSection
                settingsSection
                createButton
            }
            .padding(20)
        }
        .background(Color.black)
        .scrollDismissesKeyboard(.interactively)
    }

    // MARK: - Sections

    private var headerSection: some View {
        VStack(spacing: 8) {
            Image(systemName: "person.3.fill")
                .font(.system(size: 40))
                .foregroundStyle(.blue)

            Text("New Roundtable")
                .font(.title)
                .fontWeight(.bold)
                .foregroundStyle(.white)

            Text("Configure your AI discussion")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.top, 8)
    }

    private var topicSection: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                Label("Topic", systemImage: "text.bubble")
                    .font(.headline)
                    .foregroundStyle(.white)

                TextField("What should they discuss?", text: $topic)
                    .textFieldStyle(.plain)
                    .font(.body)
                    .foregroundStyle(.white)
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(.white.opacity(0.08))
                    )

                TextField("Description (optional)", text: $description, axis: .vertical)
                    .textFieldStyle(.plain)
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.8))
                    .lineLimit(2...4)
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(.white.opacity(0.08))
                    )
            }
        }
    }

    private var personaSection: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Label("Participants", systemImage: "person.2")
                        .font(.headline)
                        .foregroundStyle(.white)

                    Spacer()

                    Text("\(selectedPersonaIds.count) selected")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                LazyVGrid(columns: columns, spacing: 10) {
                    ForEach(personas) { persona in
                        PersonaCard(
                            persona: persona,
                            isSelected: selectedPersonaIds.contains(persona.id),
                            onToggle: {
                                togglePersona(persona.id)
                            }
                        )
                    }
                }
            }
        }
    }

    private var settingsSection: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 16) {
                Label("Settings", systemImage: "gearshape")
                    .font(.headline)
                    .foregroundStyle(.white)

                // Turn Mode
                VStack(alignment: .leading, spacing: 6) {
                    Text("Turn Mode")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    Picker("Turn Mode", selection: $turnMode) {
                        Text("Round Robin").tag(TurnMode.roundRobin)
                        Text("Open Floor").tag(TurnMode.openFloor)
                        Text("Directed").tag(TurnMode.directed)
                    }
                    .pickerStyle(.segmented)
                }

                // Response Length
                VStack(alignment: .leading, spacing: 6) {
                    Text("Response Length")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    Picker("Response Length", selection: $responseLength) {
                        Text("Brief").tag(ResponseLength.brief)
                        Text("Short").tag(ResponseLength.short)
                        Text("Medium").tag(ResponseLength.medium)
                        Text("Long").tag(ResponseLength.long)
                    }
                    .pickerStyle(.segmented)
                }

                // Max Turns
                HStack {
                    Text("Max Turns")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Stepper("\(maxTurns)", value: $maxTurns, in: 2...50)
                        .foregroundStyle(.white)
                }

                // Chair toggle
                Toggle(isOn: $enableChair) {
                    HStack {
                        Image(systemName: "crown")
                            .foregroundStyle(Color(hex: "#d4a843"))
                        Text("Enable Moderator (Chair)")
                            .font(.subheadline)
                            .foregroundStyle(.white)
                    }
                }
                .tint(.blue)
            }
        }
    }

    private var createButton: some View {
        VStack(spacing: 8) {
            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            Button(action: createSession) {
                HStack {
                    if isCreating {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "play.fill")
                    }
                    Text(isCreating ? "Creating..." : "Start Discussion")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(canCreate ? Color.blue : Color.gray.opacity(0.3))
                )
                .foregroundStyle(.white)
            }
            .disabled(!canCreate || isCreating)
        }
        .padding(.bottom, 20)
    }

    // MARK: - Logic

    private var canCreate: Bool {
        !topic.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        && selectedPersonaIds.count >= 2
    }

    private func togglePersona(_ id: String) {
        if selectedPersonaIds.contains(id) {
            if selectedPersonaIds.count > 2 {
                selectedPersonaIds.remove(id)
            }
        } else if selectedPersonaIds.count < 8 {
            selectedPersonaIds.insert(id)
        }
    }

    private func createSession() {
        guard canCreate else { return }

        isCreating = true
        errorMessage = nil

        var participants = personas
            .filter { selectedPersonaIds.contains($0.id) }
            .map { $0.toParticipantConfig() }

        if enableChair {
            let chairConfig = chairPersona.toParticipantConfig()
            // Mark chair participant
            participants.insert(ParticipantConfig(
                id: chairConfig.id,
                name: chairConfig.name,
                provider: chairConfig.provider,
                model: chairConfig.model,
                systemPrompt: chairConfig.systemPrompt,
                personality: chairConfig.personality,
                voiceId: chairConfig.voiceId,
                color: chairConfig.color,
                isHuman: false,
                isChair: true
            ), at: 0)
        }

        let config = SessionConfig(
            topic: topic.trimmingCharacters(in: .whitespacesAndNewlines),
            description: description.isEmpty ? nil : description,
            turnMode: turnMode,
            maxTurns: maxTurns,
            responseLength: responseLength,
            enableChair: enableChair,
            participants: participants
        )

        Task {
            let viewModel = DiscussionViewModel(apiClient: apiClient)
            await viewModel.createSession(config: config)

            if let session = viewModel.session {
                onSessionCreated(session, viewModel)
            } else {
                errorMessage = viewModel.errorMessage ?? "Failed to create session"
            }
            isCreating = false
        }
    }
}
