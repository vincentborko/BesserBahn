import SwiftUI

struct StationSelectionField: View {
    let title: String
    let placeholder: String
    @Binding var selectedStation: Station?
    @State private var showingPicker = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
            
            Button(action: {
                showingPicker = true
            }) {
                HStack {
                    Text(selectedStation?.name ?? placeholder)
                        .foregroundColor(selectedStation == nil ? .secondary : .primary)
                    Spacer()
                    Image(systemName: "chevron.down")
                        .foregroundColor(.secondary)
                        .font(.caption)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(8)
            }
            .buttonStyle(PlainButtonStyle())
        }
        .sheet(isPresented: $showingPicker) {
            StationSearchModal(selectedStation: $selectedStation)
        }
    }
}

struct StationSearchModal: View {
    @Binding var selectedStation: Station?
    @Environment(\.dismiss) private var dismiss
    @StateObject private var journeyService = JourneyService()
    
    @State private var searchText = ""
    @State private var searchResults: [Station] = []
    @State private var isSearching = false
    @State private var searchTask: Task<Void, Never>?
    
    var body: some View {
        NavigationView {
            VStack {
                // Search Bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    
                    TextField("Search stations...", text: $searchText)
                        .textFieldStyle(PlainTextFieldStyle())
                        .onChange(of: searchText) { _, newValue in
                            searchForStations(query: newValue)
                        }
                    
                    if !searchText.isEmpty {
                        Button("Clear") {
                            searchText = ""
                            searchResults = []
                        }
                        .foregroundColor(.secondary)
                        .font(.caption)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(10)
                .padding(.horizontal)
                
                // Results
                if isSearching {
                    HStack {
                        ProgressView()
                            .scaleEffect(0.8)
                        Text("Searching...")
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    Spacer()
                } else if searchText.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "train.side.front.car")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                        Text("Search for a station")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        Text("Enter a city or station name to find connections")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                    Spacer()
                } else if searchResults.isEmpty && !isSearching {
                    VStack(spacing: 12) {
                        Image(systemName: "exclamationmark.magnifyingglass")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                        Text("No stations found")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        Text("Try a different search term")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    Spacer()
                } else {
                    List(searchResults) { station in
                        StationRow(station: station) {
                            selectedStation = station
                            dismiss()
                        }
                    }
                    .listStyle(PlainListStyle())
                }
            }
            .navigationTitle("Select Station")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
        .onDisappear {
            searchTask?.cancel()
        }
    }
    
    private func searchForStations(query: String) {
        searchTask?.cancel()
        
        guard !query.isEmpty else {
            searchResults = []
            isSearching = false
            return
        }
        
        isSearching = true
        
        searchTask = Task {
            // Debounce
            try? await Task.sleep(nanoseconds: 300_000_000) // 300ms
            
            if Task.isCancelled { return }
            
            do {
                let stations = try await journeyService.searchStations(query: query)
                if !Task.isCancelled {
                    await MainActor.run {
                        searchResults = stations
                        isSearching = false
                    }
                }
            } catch {
                if !Task.isCancelled {
                    await MainActor.run {
                        searchResults = []
                        isSearching = false
                    }
                }
            }
        }
    }
}

struct StationRow: View {
    let station: Station
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(station.name)
                        .font(.body)
                        .foregroundColor(.primary)
                    
                    if let type = station.type {
                        Text(type)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .foregroundColor(.secondary)
                    .font(.caption)
            }
            .padding(.vertical, 4)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    @Previewable @State var station: Station? = nil
    
    VStack {
        StationSelectionField(
            title: "From",
            placeholder: "Select departure station",
            selectedStation: $station
        )
        Spacer()
    }
    .padding()
}
