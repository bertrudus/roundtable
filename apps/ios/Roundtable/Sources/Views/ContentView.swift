import SwiftUI

/// Root view managing navigation between session creation and active discussions.
struct ContentView: View {
    @State private var apiClient: APIClient
    @State private var activeViewModel: DiscussionViewModel?
    @State private var showingDiscussion = false

    init(baseURL: URL = URL(string: "http://localhost:3000")!) {
        _apiClient = State(initialValue: APIClient(baseURL: baseURL))
    }

    var body: some View {
        NavigationStack {
            if let viewModel = activeViewModel, showingDiscussion {
                RoundTableView(viewModel: viewModel)
                    .navigationBarBackButtonHidden(true)
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            Button {
                                Task {
                                    if viewModel.isActive {
                                        await viewModel.stopDiscussion()
                                    }
                                    viewModel.reset()
                                    activeViewModel = nil
                                    showingDiscussion = false
                                }
                            } label: {
                                HStack(spacing: 4) {
                                    Image(systemName: "chevron.left")
                                    Text("Back")
                                }
                                .foregroundStyle(.blue)
                            }
                        }
                    }
            } else {
                CreateSessionView(
                    apiClient: apiClient,
                    onSessionCreated: { session, viewModel in
                        activeViewModel = viewModel
                        showingDiscussion = true
                    }
                )
            }
        }
        .preferredColorScheme(.dark)
    }
}

#Preview {
    ContentView()
}
