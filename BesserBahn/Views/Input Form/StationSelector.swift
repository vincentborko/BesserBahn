import SwiftUI

struct StationSelector: View {
    let title: String
    let placeholder: String
    @Binding var selectedStation: Station?
    @StateObject private var journeyService = JourneyService()
    
    @State private var text: String = ""
    @State private var searchResults: [Station] = []
    @State private var isShowingResults = false
    @State private var searchTask: Task<Void, Never>?
    @FocusState private var isTextFieldFocused: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
            
            VStack(spacing: 0) {
                TextField(placeholder, text: $text)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .focused($isTextFieldFocused)
                    .onChange(of: text) { _, newValue in
                        searchForStations(query: newValue)
                    }
                    .onChange(of: isTextFieldFocused) { _, focused in
                        if !focused {
                            // Hide suggestions when field loses focus
                            isShowingResults = false
                        }
                    }
                    .onTapGesture {
                        // Show suggestions when tapping field (if we have results)
                        if !searchResults.isEmpty && !text.isEmpty {
                            isShowingResults = true
                        }
                    }
                
                if isShowingResults && !searchResults.isEmpty {
                    VStack(spacing: 0) {
                        ForEach(searchResults) { station in
                            Button(action: {
                                selectStation(station)
                            }) {
                                HStack {
                                    Text(station.name)
                                        .foregroundColor(.primary)
                                    Spacer()
                                    if let type = station.type {
                                        Text(type)
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                            }
                            .background(Color(.systemBackground))
                            
                            if station.id != searchResults.last?.id {
                                Divider()
                            }
                        }
                    }
                    .background(Color(.systemBackground))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color(.systemGray4), lineWidth: 1)
                    )
                    .shadow(radius: 4)
                    .zIndex(1) // Ensure dropdown appears above other elements
                }
            }
        }
    }
    
    private func searchForStations(query: String) {
        // Cancel previous search
        searchTask?.cancel()
        
        guard !query.isEmpty else {
            searchResults = []
            isShowingResults = false
            return
        }
        
        searchTask = Task {
            // Debounce: wait a bit before searching
            try? await Task.sleep(nanoseconds: 300_000_000) // 300ms
            
            if Task.isCancelled { return }
            
            do {
                let stations = try await journeyService.searchStations(query: query)
                if !Task.isCancelled {
                    await MainActor.run {
                        searchResults = stations
                        // Only show results if the text field is still focused
                        isShowingResults = !stations.isEmpty && isTextFieldFocused
                    }
                }
            } catch {
                if !Task.isCancelled {
                    await MainActor.run {
                        searchResults = []
                        isShowingResults = false
                    }
                }
            }
        }
    }
    
    private func selectStation(_ station: Station) {
        text = station.name
        selectedStation = station
        isShowingResults = false
        searchResults = []
        isTextFieldFocused = false // Hide keyboard
    }
    
    // Public method to hide suggestions (called from parent)
    func hideSuggestions() {
        isShowingResults = false
        isTextFieldFocused = false
    }
}

#Preview {
    @Previewable @State var station: Station? = nil
    
    VStack {
        StationSelector(
            title: "From",
            placeholder: "Berlin Hbf",
            selectedStation: $station
        )
        Spacer()
    }
    .padding()
}
