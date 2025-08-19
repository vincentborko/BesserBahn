//
//  JourneyService.swift
//  BesserBahn
//
//  Created by Vincent Borko on 19.08.25.
//


import Foundation

@MainActor
class JourneyService: ObservableObject {
    private let baseURL = "http://192.168.178.120:3000/api"
    
    enum ServiceError: LocalizedError {
        case invalidURL
        case networkError(Error)
        case decodingError(Error)
        case serverError(Int)
        
        var errorDescription: String? {
            switch self {
            case .invalidURL:
                return "Invalid URL"
            case .networkError(let error):
                return "Network error: \(error.localizedDescription)"
            case .decodingError(let error):
                return "Data parsing error: \(error.localizedDescription)"
            case .serverError(let code):
                return "Server error (Code: \(code))"
            }
        }
    }
    
    // MARK: - Station Search
    func searchStations(query: String) async throws -> [Station] {
        guard !query.isEmpty else { return [] }
        
        let url = URL(string: "\(baseURL)/stations")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let requestBody = StationRequest(query: query, results: 5)
        request.httpBody = try JSONEncoder().encode(requestBody)
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
                throw ServiceError.serverError(httpResponse.statusCode)
            }
            
            let stations = try JSONDecoder().decode([APIStation].self, from: data)
            return stations.map { $0.toStation() }
            
        } catch let error as DecodingError {
            throw ServiceError.decodingError(error)
        } catch {
            throw ServiceError.networkError(error)
        }
    }
    
    // MARK: - Journey Search
    func searchJourneys(fromCity: String, toCity: String, date: Date, time: Date) async throws -> [Journey] {
        let url = URL(string: "\(baseURL)/search")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        
        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HH:mm"
        
        let requestBody = SearchRequest(
            fromCity: fromCity,
            toCity: toCity,
            date: dateFormatter.string(from: date),
            time: timeFormatter.string(from: time)
        )
        
        request.httpBody = try JSONEncoder().encode(requestBody)
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
                throw ServiceError.serverError(httpResponse.statusCode)
            }
            
            let searchResponse = try JSONDecoder().decode(SearchResponse.self, from: data)
            return searchResponse.results.map { $0.toJourney() }
            
        } catch let error as DecodingError {
            throw ServiceError.decodingError(error)
        } catch {
            throw ServiceError.networkError(error)
        }
    }
}
