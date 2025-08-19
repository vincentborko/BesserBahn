import SwiftUI
import iOSDropDown

struct SPMStationField: View {
    let title: String
    let placeholder: String
    @Binding var selectedStation: Station?
    @StateObject private var journeyService = JourneyService()
    
    @State private var searchResults: [Station] = []
    @State private var searchTask: Task<Void, Never>?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
            
            DropDownRepresentable(
                placeholder: placeholder,
                options: searchResults.map { $0.name },
                onSearchTextChanged: { searchText in
                    searchForStations(query: searchText)
                },
                onSelectionChanged: { selectedIndex in
                    if selectedIndex < searchResults.count {
                        selectedStation = searchResults[selectedIndex]
                    }
                }
            )
            .frame(height: 44)
        }
    }
    
    private func searchForStations(query: String) {
        searchTask?.cancel()
        
        guard !query.isEmpty else {
            searchResults = []
            return
        }
        
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000) // 300ms debounce
            
            if Task.isCancelled { return }
            
            do {
                let stations = try await journeyService.searchStations(query: query)
                if !Task.isCancelled {
                    await MainActor.run {
                        searchResults = stations
                    }
                }
            } catch {
                if !Task.isCancelled {
                    await MainActor.run {
                        searchResults = []
                    }
                }
            }
        }
    }
}

struct DropDownRepresentable: UIViewRepresentable {
    let placeholder: String
    let options: [String]
    let onSearchTextChanged: (String) -> Void
    let onSelectionChanged: (Int) -> Void
    
    func makeUIView(context: Context) -> DropDown {
        let dropDown = DropDown()
        dropDown.placeholder = placeholder
        dropDown.isSearchEnable = true
        dropDown.selectedRowColor = UIColor.systemGray6
        dropDown.rowBackgroundColor = UIColor.systemBackground
        dropDown.listHeight = 200
        
        // Handle text changes for search
        dropDown.addTarget(context.coordinator, action: #selector(Coordinator.textChanged), for: .editingChanged)
        
        // Handle selection
        dropDown.didSelect { selectedText, index, id in
            onSelectionChanged(index)
        }
        
        return dropDown
    }
    
    func updateUIView(_ uiView: DropDown, context: Context) {
        uiView.optionArray = options
        context.coordinator.onSearchTextChanged = onSearchTextChanged
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(onSearchTextChanged: onSearchTextChanged)
    }
    
    class Coordinator: NSObject {
        var onSearchTextChanged: (String) -> Void
        
        init(onSearchTextChanged: @escaping (String) -> Void) {
            self.onSearchTextChanged = onSearchTextChanged
        }
        
        @objc func textChanged(_ textField: UITextField) {
            onSearchTextChanged(textField.text ?? "")
        }
    }
}
