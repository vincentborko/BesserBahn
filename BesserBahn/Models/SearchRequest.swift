//
//  SearchRequest.swift
//  BesserBahn
//
//  Created by Vincent Borko on 19.08.25.
//


import Foundation

struct SearchRequest: Codable {
    let fromCity: String
    let toCity: String
    let date: String
    let time: String
}

struct SearchResponse: Codable {
    let results: [APIJourney]
    let searchedAt: String
    let query: APIQuery
    let fromCache: Bool
}

struct APIJourney: Codable {
    let route: String
    let price: Double
    let duration: String
    let details: String
    let connections: Int
}

struct APIQuery: Codable {
    let fromCity: String
    let toCity: String
    let date: String
    let time: String
}

struct StationRequest: Codable {
    let query: String
    let results: Int
}

struct APIStation: Codable {
    let id: String
    let name: String
    let type: String?
    let location: APILocation?
}

struct APILocation: Codable {
    let latitude: Double?
    let longitude: Double?
}

extension APIJourney {
    func toJourney() -> Journey {
        return Journey(
            route: route,
            price: price,
            duration: duration,
            details: details,
            connections: connections
        )
    }
}

extension APIStation {
    func toStation() -> Station {
        return Station(
            id: id,
            name: name,
            type: type
        )
    }
}
