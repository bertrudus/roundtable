import SwiftUI

/// Displays a participant's avatar with optional speaking animation.
struct ParticipantAvatar: View {
    let name: String
    let color: String
    let avatarSeed: String
    let size: CGFloat
    var isSpeaking: Bool = false
    var showName: Bool = true

    private var avatarURL: URL? {
        URL(string: "https://api.dicebear.com/9.x/notionists-neutral/png?seed=\(avatarSeed)&size=\(Int(size * 2))")
    }

    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                // Glow ring when speaking
                if isSpeaking {
                    Circle()
                        .fill(Color(hex: color).opacity(0.3))
                        .frame(width: size + 12, height: size + 12)
                        .blur(radius: 8)

                    Circle()
                        .stroke(Color(hex: color), lineWidth: 3)
                        .frame(width: size + 6, height: size + 6)
                }

                AsyncImage(url: avatarURL) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure:
                        initialsView
                    case .empty:
                        ProgressView()
                            .tint(.white)
                    @unknown default:
                        initialsView
                    }
                }
                .frame(width: size, height: size)
                .clipShape(Circle())
                .overlay(
                    Circle()
                        .stroke(Color(hex: color), lineWidth: 2)
                )
            }
            .scaleEffect(isSpeaking ? 1.1 : 1.0)
            .animation(.spring(response: 0.4, dampingFraction: 0.6), value: isSpeaking)

            if showName {
                Text(name)
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundStyle(Color(hex: color))
                    .lineLimit(1)
            }
        }
    }

    private var initialsView: some View {
        ZStack {
            Circle()
                .fill(Color(hex: color).opacity(0.3))
            Text(String(name.prefix(1)).uppercased())
                .font(.system(size: size * 0.4, weight: .bold))
                .foregroundStyle(Color(hex: color))
        }
    }
}

#Preview {
    HStack(spacing: 20) {
        ParticipantAvatar(name: "Max", color: "#EF4444", avatarSeed: "Max", size: 56)
        ParticipantAvatar(name: "Sage", color: "#3B82F6", avatarSeed: "Sage", size: 56, isSpeaking: true)
    }
    .padding()
    .background(.black)
}
