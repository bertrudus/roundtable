import AVFoundation
import Foundation

/// Manages TTS audio playback for discussion participants.
@MainActor
@Observable
final class AudioPlayer {
    var isPlaying = false
    var playbackRate: Float = 1.0

    private var player: AVPlayer?
    private var playerItem: AVPlayerItem?
    private var endObserver: Any?

    init() {
        configureAudioSession()
    }

    /// Play audio from raw MP3 data.
    func play(data: Data) {
        stop()

        // Write to a temporary file since AVPlayer requires a URL
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("mp3")
        do {
            try data.write(to: tempURL)
        } catch {
            return
        }

        let item = AVPlayerItem(url: tempURL)
        playerItem = item
        player = AVPlayer(playerItem: item)
        player?.rate = playbackRate
        isPlaying = true

        // Observe end of playback
        endObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: item,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.isPlaying = false
                // Clean up temp file
                try? FileManager.default.removeItem(at: tempURL)
            }
        }

        player?.play()
    }

    /// Stop current playback.
    func stop() {
        player?.pause()
        player = nil
        playerItem = nil
        isPlaying = false

        if let observer = endObserver {
            NotificationCenter.default.removeObserver(observer)
            endObserver = nil
        }
    }

    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            // Audio session setup failed; playback may not work
        }
    }
}
