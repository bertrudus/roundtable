import SwiftUI

/// A selectable card representing a persona in the persona picker grid.
struct PersonaCard: View {
    let persona: Persona
    let isSelected: Bool
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            VStack(spacing: 8) {
                ParticipantAvatar(
                    name: persona.name,
                    color: persona.color,
                    avatarSeed: persona.avatarSeed,
                    size: 48,
                    showName: false
                )

                VStack(spacing: 2) {
                    Text(persona.name)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)

                    Text(persona.role)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                // Provider badge
                Text(persona.provider.rawValue.capitalized)
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(.white.opacity(0.7))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(
                        Capsule()
                            .fill(.white.opacity(0.1))
                    )
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .padding(.horizontal, 8)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? Color(hex: persona.color).opacity(0.15) : Color.white.opacity(0.05))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color(hex: persona.color) : Color.white.opacity(0.1), lineWidth: isSelected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    HStack {
        PersonaCard(persona: personas[0], isSelected: true, onToggle: {})
        PersonaCard(persona: personas[1], isSelected: false, onToggle: {})
    }
    .padding()
    .background(.black)
}
