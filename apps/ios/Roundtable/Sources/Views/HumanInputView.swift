import SwiftUI

/// Bottom sheet for human participants to submit their message during their turn.
struct HumanInputView: View {
    let participantName: String
    let onSubmit: (String) -> Void

    @State private var text: String = ""
    @FocusState private var isFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                // Prompt
                VStack(spacing: 8) {
                    Image(systemName: "person.fill")
                        .font(.title2)
                        .foregroundStyle(.blue)

                    Text("Your Turn, \(participantName)")
                        .font(.headline)
                        .foregroundStyle(.white)

                    Text("Share your thoughts with the roundtable")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 8)

                // Text input
                TextEditor(text: $text)
                    .scrollContentBackground(.hidden)
                    .foregroundStyle(.white)
                    .font(.body)
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(.white.opacity(0.08))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(.white.opacity(0.15), lineWidth: 1)
                    )
                    .frame(minHeight: 120)
                    .focused($isFocused)

                // Submit button
                Button {
                    let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !trimmed.isEmpty else { return }
                    onSubmit(trimmed)
                } label: {
                    HStack {
                        Image(systemName: "paperplane.fill")
                        Text("Submit")
                    }
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? Color.gray.opacity(0.3) : Color.blue)
                    )
                    .foregroundStyle(.white)
                }
                .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .padding(20)
            .background(Color.black)
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                isFocused = true
            }
        }
    }
}

#Preview {
    HumanInputView(participantName: "You") { text in
        print(text)
    }
}
