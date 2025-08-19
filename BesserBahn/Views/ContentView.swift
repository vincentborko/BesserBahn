import SwiftUI

struct ContentView: View {
    @State private var fromStation: Station?
    @State private var toStation: Station?
    @State private var selectedDate = Date()
    @State private var selectedTime = Date()
    @State private var isSearching = false
    @State private var searchResults: [Journey] = []
    @State private var errorMessage = ""
    @StateObject private var journeyService = JourneyService()
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Header
                VStack {
                    Text("🚆 BesserBahn")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    Text("Find cheaper train connections")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top)
                
                // Journey Input
                VStack(spacing: 16) {
                    SPMStationField(
                        title: "From",
                        placeholder: "Select departure station",
                        selectedStation: $fromStation
                    )
                    
                    SPMStationField(
                        title: "To",
                        placeholder: "Select destination station",
                        selectedStation: $toStation
                    )
                    
                    HStack {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Date")
                                .font(.headline)
                            DatePicker("", selection: $selectedDate, displayedComponents: .date)
                                .labelsHidden()
                        }
                        
                        Spacer()
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Time")
                                .font(.headline)
                            DatePicker("", selection: $selectedTime, displayedComponents: .hourAndMinute)
                                .labelsHidden()
                        }
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                
                // Search Button
                Button(action: searchJourneys) {
                    HStack {
                        if isSearching {
                            ProgressView()
                                .scaleEffect(0.8)
                        }
                        Text(isSearching ? "Searching..." : "Find Better Prices")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(canSearch ? Color.blue : Color.gray)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .disabled(!canSearch || isSearching)
                
                // Error Message
                if !errorMessage.isEmpty {
                    Text(errorMessage)
                        .foregroundColor(.red)
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)
                }
                
                // Results
                if !searchResults.isEmpty {
                    List(searchResults.indices, id: \.self) { index in
                        JourneyRowView(journey: searchResults[index], isRecommended: index == 0)
                    }
                    .listStyle(PlainListStyle())
                }
                
                Spacer()
            }
            .padding()
            .navigationBarHidden(true)
        }
    }
    
    private var canSearch: Bool {
        fromStation != nil && toStation != nil
    }
    
    private func searchJourneys() {
        guard let fromStation = fromStation,
              let toStation = toStation else { return }
        
        isSearching = true
        errorMessage = ""
        
        Task {
            do {
                let results = try await journeyService.searchJourneys(
                    fromCity: fromStation.name,
                    toCity: toStation.name,
                    date: selectedDate,
                    time: selectedTime
                )
                
                await MainActor.run {
                    print("🔍 Received \(results.count) journeys:")
                    for (index, journey) in results.enumerated() {
                        print("Journey \(index): price=\(journey.price), isNaN=\(journey.price.isNaN)")
                    }
                    
                    searchResults = results
                    isSearching = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isSearching = false
                }
            }
        }
    }
}

#Preview {
    ContentView()
}
