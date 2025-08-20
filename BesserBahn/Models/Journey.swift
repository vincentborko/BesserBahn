import Foundation

struct Journey {
    let route: String
    let price: Double
    let duration: String
    let details: String
    let connections: Int
}

struct Station: Identifiable, Hashable {
    let id: String
    let name: String
    let type: String?
    
    var displayName: String {
        return name
    }
}
